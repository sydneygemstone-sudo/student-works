/**
 * tools/simulate.mjs — 关卡预算校准：让一个贪心 AI 把整局打完，看 MAX_ROUNDS 够不够。
 *
 * 这不是「强制胜利钩子」：它走的是和孩子一样的公开动作（转向、前进、递交、
 * 吓退狼、勇气加步），经过同一个权威引擎，狼和狮子照常捣乱。
 * 它回答的只有一个问题 —— 一队配合得不错的玩家，大概几个回合能通关。
 *
 * 用法：
 *   node tools/simulate.mjs            # 跑默认种子
 *   node tools/simulate.mjs --seeds 12 # 跑 12 个种子，给出分布
 *   node tools/simulate.mjs --verbose  # 打印每回合发生了什么
 *   node tools/simulate.mjs --sloppy   # 模拟「会走错路的孩子」：每步有几率白走一格
 *
 * Author: Claude Code (Claude Opus)
 */

import { GameEngine } from '../core/game.js';
import {
  ACTION, DIRECTIONS, DIR_VECTOR, HOME, MAX_ROUNDS, ROLES, ROLE_LIST,
  STATUS, TERRAIN, TERRAIN_COST, STORM_EVERY, MAX_SHELTER, BOOST_COURAGE_COST,
} from '../core/constants.js';
import { probeStep } from '../core/world.js';
import { manhattan } from '../core/beasts.js';
import { createRng } from '../core/rng.js';

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const TRACE = args.includes('--trace');
const SLOPPY = args.includes('--sloppy');
// --sloppy [比例]：默认 0.28（相当挑剔的压力测试），可传 0.15 模拟「一般发挥的孩子」
const SLOPPY_RATE = SLOPPY ? (Number(args[args.indexOf('--sloppy') + 1]) || 0.28) : 0;
let sloppyRng = () => 0; // 每局重新按种子初始化，保证可复现
const SEED_COUNT = Number(args[args.indexOf('--seeds') + 1]) || (args.includes('--seeds') ? 8 : 1);

/**
 * 按真实行动点成本做 Dijkstra，返回 from → to 的路径（含起点）。
 * blocked 里的格子绕开（狼、还没打算进的假房子）。
 */
function planRoute(engine, from, to, { avoid = new Set(), shelter = 0 } = {}) {
  const key = (x, y) => `${x},${y}`;
  const cost = new Map([[key(from.x, from.y), 0]]);
  const prev = new Map([[key(from.x, from.y), null]]);
  const queue = [{ x: from.x, y: from.y, c: 0 }];

  while (queue.length) {
    queue.sort((a, b) => a.c - b.c);
    const cur = queue.shift();
    if (cur.c > (cost.get(key(cur.x, cur.y)) ?? Infinity)) continue;
    if (cur.x === to.x && cur.y === to.y) break;

    for (const dir of DIRECTIONS) {
      const probe = probeStep(engine.world, cur.x, cur.y, dir);
      if (probe.blocked) continue;
      const { x: nx, y: ny } = probe.target;
      const isGoal = nx === to.x && ny === to.y;
      if (!isGoal && avoid.has(key(nx, ny))) continue;

      const terrain = engine.world.grid[ny][nx];
      let stepCost = TERRAIN_COST[terrain];
      if (terrain === TERRAIN.NET && shelter > 0) stepCost = 1;
      if (!Number.isFinite(stepCost)) continue;

      const next = cur.c + stepCost;
      if (next >= (cost.get(key(nx, ny)) ?? Infinity)) continue;
      cost.set(key(nx, ny), next);
      prev.set(key(nx, ny), key(cur.x, cur.y));
      queue.push({ x: nx, y: ny, c: next });
    }
  }

  const goal = key(to.x, to.y);
  if (!cost.has(goal)) return null;
  const path = [];
  let cur = goal;
  while (cur) {
    const [xs, ys] = cur.split(',');
    path.unshift({ x: Number(xs), y: Number(ys) });
    cur = prev.get(cur) ?? null;
  }
  return { path, cost: cost.get(goal) };
}

/** 这个角色这回合该去哪儿。 */
function pickGoal(engine, role) {
  const me = engine.players[role];
  // 站在自己脚下的那只不算「要走过去的目标」，否则会原地打转
  const wild = engine.world.animals.filter((a) => a.state === 'wild' && !(a.x === me.x && a.y === me.y));
  const full = me.carrying.length >= me.carryLimit;

  // 手上满了，或者外面已经没有野生小动物了 → 回家
  if (me.carrying.length > 0 && (full || wild.length === 0)) return { kind: 'home', at: HOME };

  // 顺路的能量星（离我 ≤ 3 步）优先捡，等于白赚步数
  const stars = engine.world.energies.filter((e) => !e.taken);
  const nearStar = stars
    .map((e) => ({ e, route: planRoute(engine, me, e, { shelter: engine.team.shelter }) }))
    .filter((s) => s.route && s.route.cost <= 3)
    .sort((a, b) => a.route.cost - b.route.cost)[0];
  if (nearStar) return { kind: 'star', at: nearStar.e };

  if (wild.length === 0) return { kind: 'home', at: HOME };

  // 否则去最划算的野生小动物：路程近、且别和队友抢同一只
  const partner = engine.players[role === ROLES.BEAR ? ROLES.BUNNY : ROLES.BEAR];
  const scored = wild
    .map((a) => {
      const route = planRoute(engine, me, a, { shelter: engine.team.shelter });
      if (!route) return null;
      const partnerCloser = manhattan(partner, a) < manhattan(me, a) ? 3 : 0;
      return { a, route, score: route.cost + partnerCloser };
    })
    .filter(Boolean)
    .sort((x, y) => x.score - y.score);
  if (!scored.length) return { kind: 'home', at: HOME };
  return { kind: 'animal', at: scored[0].a };
}

/** 让一个角色把本回合的行动点用完。 */
function playTurn(engine, role, log) {
  const me = engine.players[role];
  let guard = 0;
  while (me.ap > 0 && engine.status === STATUS.PLAYING && guard++ < 40) {
    // 脚下有雷雨 / 狼抖落的小动物，先 0 步抱起来
    const underfoot = engine.world.animals.some((a) => a.state === 'wild' && a.x === me.x && a.y === me.y);
    if (underfoot && me.carrying.length < me.carryLimit) {
      if (engine.act(role, { type: ACTION.PICKUP }).ok) { log?.push(`${role} 捡回了脚下的小动物`); continue; }
    }

    // 挨着队友、手上有货、队友在家 → 直接递过去，0 步
    const other = engine.players[role === ROLES.BEAR ? ROLES.BUNNY : ROLES.BEAR];
    if (me.carrying.length > 0 && manhattan(me, other) <= 1 && other.x === HOME.x && other.y === HOME.y) {
      if (engine.act(role, { type: ACTION.GIVE }).ok) continue;
    }

    // 熊：狼贴上来就吼一声，比被咬掉一只划算
    if (me.canScareWolf) {
      const wolf = engine.world.beasts.find((b) => b.kind === 'wolf' && b.awake && manhattan(b, me) <= 1);
      if (wolf && me.ap >= 1) {
        if (engine.act(role, { type: ACTION.SCARE }).ok) { log?.push(`${role} 吓退了狼`); continue; }
      }
    }

    // 在家顺手加一层庇护罩，挡下一次雷雨
    if (me.x === HOME.x && me.y === HOME.y && engine.team.shelter < MAX_SHELTER
      && me.ap >= 2 && (engine.round + 1) % STORM_EVERY === 0) {
      if (engine.act(role, { type: ACTION.SUPPORT }).ok) continue;
    }

    const goal = pickGoal(engine, role);
    const avoidsDecoy = new Set(engine.world.decoys.map((d) => `${d.x},${d.y}`));
    const avoid = new Set([
      // 绕开假房子和狼
      ...avoidsDecoy,
      ...engine.world.beasts.filter((b) => b.kind === 'wolf').map((b) => `${b.x},${b.y}`),
    ]);
    const route = planRoute(engine, me, goal.at, { avoid, shelter: engine.team.shelter });
    if (!route || route.path.length < 2) break;

    let next = route.path[1];
    // --sloppy：模拟真孩子会看错方向、白走一格，用来检验回合预算的余量够不够
    if (SLOPPY && sloppyRng() < SLOPPY_RATE) {
      const detours = DIRECTIONS
        .map((d) => ({ d, probe: probeStep(engine.world, me.x, me.y, d) }))
        .filter(({ probe }) => !probe.blocked)
        .filter(({ probe }) => !avoidsDecoy.has(`${probe.target.x},${probe.target.y}`));
      if (detours.length) {
        const pick = detours[Math.floor(sloppyRng() * detours.length)];
        next = pick.probe.target;
      }
    }
    const dir = DIRECTIONS.find((d) => DIR_VECTOR[d].dx === next.x - me.x && DIR_VECTOR[d].dy === next.y - me.y);
    if (!dir) break;
    if (me.facing !== dir) engine.act(role, { type: ACTION.TURN_LEFT }); // 转向 0 步，直接扳到位
    me.facing = dir;
    const moved = engine.act(role, { type: ACTION.FORWARD });
    if (TRACE) {
      console.log(`    [${role}] ap=${me.ap} → ${goal.kind}(${goal.at.x},${goal.at.y}) 走 ${dir} `
        + `${moved.ok ? `到 (${me.x},${me.y})` : `失败:${moved.reason}`} 抱着 ${me.carrying.length}`);
    }
    if (!moved.ok) break; // 步数不够或者被挡，本回合就到这里
  }
}

function runOnce(seed) {
  const engine = new GameEngine({ seed });
  sloppyRng = createRng(seed ^ 0x5eed);
  const log = [];
  let usedBoosts = 0;
  // 累计统计：engine.log 只保留最近 40 条，长局会滚掉，不能拿它算总数
  const tally = { lion_snatch: 0, wolf_bite: 0, storm: 0, decoy: 0 };

  while (engine.status === STATUS.PLAYING) {
    // 勇气攒够了就加步，让两个人这回合都能多走两格
    if (engine.team.courage >= BOOST_COURAGE_COST + 2 && !engine.team.boostUsedThisRound) {
      if (engine.act(ROLES.BEAR, { type: ACTION.BOOST }).ok) usedBoosts += 1;
    }
    for (const role of ROLE_LIST) playTurn(engine, role, log);

    const before = engine.round;
    engine.setReady(ROLES.BEAR);
    const result = engine.setReady(ROLES.BUNNY);
    for (const ev of result.events) if (ev.type in tally) tally[ev.type] += 1;
    if (VERBOSE) {
      const notable = result.events
        .filter((e) => ['storm', 'wolf_bite', 'lion_snatch', 'beast_wake', 'decoy', 'rescue'].includes(e.type))
        .map((e) => e.message);
      console.log(`  回合 ${before} 结束：救回 ${engine.rescuedCount()}/8，勇气 ${engine.team.courage}`
        + (notable.length ? `\n     ${notable.join('\n     ')}` : ''));
    }
    if (engine.round === before && engine.status === STATUS.PLAYING) break; // 卡住了，防死循环
  }

  return {
    seed,
    status: engine.status,
    rounds: engine.round,
    rescued: engine.rescuedCount(),
    courage: engine.team.courage,
    boosts: usedBoosts,
    starsTaken: engine.world.energies.filter((e) => e.taken).length,
    decoyTrips: engine.world.decoys.reduce((sum, d) => sum + d.trips, 0),
    stranded: engine.world.animals.filter((a) => a.state !== 'home').map((a) => a.id),
    snatches: tally.lion_snatch,
    bites: tally.wolf_bite,
    storms: tally.storm,
  };
}

const seeds = Array.from({ length: SEED_COUNT }, (_, i) => 20260919 + i * 7919);
const results = seeds.map(runOnce);

console.log(`\n关卡预算校准 · MAX_ROUNDS = ${MAX_ROUNDS}${SLOPPY ? ` · 笨拙玩家模式（${Math.round(SLOPPY_RATE * 100)}% 的步子白走）` : ''} · 熊 2 步 / 兔 3 步 · 每 ${STORM_EVERY} 回合一次雷雨\n`);
console.log('  种子        结果   用了几回合  救回  剩余勇气  吃到星星  走错门');
for (const r of results) {
  const verdict = r.status === STATUS.WON ? '🎉 通关' : '⏳ 超时';
  console.log(`  ${String(r.seed).padEnd(12)}${verdict}   ${String(r.rounds).padStart(6)}      ${r.rescued}/8`
    + `      ${String(r.courage).padStart(4)}      ${String(r.starsTaken).padStart(4)}/6   ${String(r.decoyTrips).padStart(4)}`);
}

const won = results.filter((r) => r.status === STATUS.WON);
const avgRounds = won.length ? (won.reduce((s, r) => s + r.rounds, 0) / won.length).toFixed(1) : '—';
const strandedTally = {};
for (const r of results) for (const id of r.stranded) strandedTally[id] = (strandedTally[id] ?? 0) + 1;
const ranked = Object.entries(strandedTally).sort((a, b) => b[1] - a[1]);
if (ranked.length) {
  console.log('\n  最常救不回来的小动物：' + ranked.map(([id, n]) => `${id} ×${n}`).join('，'));
}
{
  const avg = (key) => (results.reduce((sum, r) => sum + r[key], 0) / results.length).toFixed(1);
  console.log(`  平均每局：狮子叼走 ${avg('snatches')} 次、狼咬 ${avg('bites')} 次、雷雨 ${avg('storms')} 次`);
}
console.log(`\n  通关率 ${won.length}/${results.length}，平均 ${avgRounds} 回合`);
if (won.length) {
  const worst = Math.max(...won.map((r) => r.rounds));
  console.log(`  最慢一局用了 ${worst} 回合，余量 ${MAX_ROUNDS - worst} 回合`);
}
console.log('\n  注：这是「配合不错的玩家」的参考线。真孩子会走错路、会停下来看风景，');
console.log('      所以回合上限要留出余量，不能卡着这个数字设。\n');
