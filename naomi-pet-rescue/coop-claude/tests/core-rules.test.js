/**
 * tests/core-rules.test.js — 核心回合规则引擎测试。
 * Author: Claude Code (Claude Opus)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { GameEngine } from '../core/game.js';
import {
  ACTION, GRID_SIZE, HOME, MAX_ROUNDS, MAX_SHELTER, REJECT, ROLE_CONFIG, ROLES,
  START_COURAGE, STATUS, STORM_EVERY, TERRAIN, TOTAL_ANIMALS, TOTAL_GIFTS, BLOCKER,
} from '../core/constants.js';
import { buildWorld, reachableCells, terrainAt } from '../core/world.js';

/** 把角色直接放到指定格（单元测试用的传送，绕过移动消耗）。 */
function place(engine, role, x, y, facing = 'N') {
  const p = engine.players[role];
  p.x = x; p.y = y; p.facing = facing;
  return p;
}

/** 找一块指定地形的格子，并给出一个能一步走进它的相邻格。 */
function findApproach(world, terrain) {
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (world.grid[y][x] !== terrain) continue;
      for (const [dx, dy, from] of [[0, 1, 'N'], [0, -1, 'S'], [1, 0, 'W'], [-1, 0, 'E']]) {
        const fx = x + dx;
        const fy = y + dy;
        if (fx < 0 || fy < 0 || fx >= GRID_SIZE || fy >= GRID_SIZE) continue;
        if (world.grid[fy][fx] === TERRAIN.ROCK || world.grid[fy][fx] === TERRAIN.DECOY) continue;
        // 迷宫里的格子另有树篱，避开
        if (world.walls.has(`${fx},${fy},${from === 'N' ? 'N' : from === 'S' ? 'S' : from === 'W' ? 'E' : 'W'}`)) continue;
        const facing = from === 'N' ? 'N' : from === 'S' ? 'S' : from === 'W' ? 'E' : 'W';
        return { target: { x, y }, from: { x: fx, y: fy }, facing };
      }
    }
  }
  throw new Error(`地图里找不到可一步走进的 ${terrain}`);
}

/** 推进一个共同回合。 */
function advance(engine) {
  engine.setReady(ROLES.BEAR);
  return engine.setReady(ROLES.BUNNY);
}

test('世界是 15×15 网格，中心家园在 (7,7)', () => {
  const world = buildWorld();
  assert.equal(world.size, GRID_SIZE);
  assert.equal(world.grid.length, GRID_SIZE);
  for (const row of world.grid) assert.equal(row.length, GRID_SIZE);
  assert.equal(terrainAt(world, HOME.x, HOME.y), TERRAIN.HOME);
  assert.deepEqual(world.home, { x: 7, y: 7 });
});

test('共 8 只小动物、3 个礼盒、6 颗能量星、3 座假房子，且全部可以从家园走到', () => {
  const world = buildWorld();
  assert.equal(world.animals.length, TOTAL_ANIMALS);
  assert.equal(world.gifts.length, TOTAL_GIFTS);
  assert.equal(world.energies.length, 6);
  assert.equal(world.decoys.length, 3);

  const reachable = reachableCells(world);
  for (const a of world.animals) assert.ok(reachable.has(`${a.x},${a.y}`), `${a.name} 应当可达`);
  for (const g of world.gifts) assert.ok(reachable.has(`${g.x},${g.y}`), `${g.id} 应当可达`);
  for (const e of world.energies) assert.ok(reachable.has(`${e.x},${e.y}`), `${e.id} 应当可达`);
  for (const d of world.decoys) assert.ok(reachable.has(`${d.x},${d.y}`), `${d.id} 应当可达`);

  // 除了石头，每一格都走得到（两座迷宫也通过花廊 / 拱门连着主花园）
  const rocks = world.grid.flat().filter((t) => t === TERRAIN.ROCK).length;
  assert.equal(reachable.size, GRID_SIZE * GRID_SIZE - rocks, '除石头外不应有走不到的死区');
});

test('礼盒内容由种子决定，且恒为 2 礼物 + 1 恶作剧', () => {
  for (const seed of [1, 7, 42, 20260919]) {
    const world = buildWorld({ seed });
    const kinds = world.gifts.map((g) => g.kind).sort();
    assert.deepEqual(kinds, ['gift', 'gift', 'prank']);
  }
  const a = buildWorld({ seed: 99 }).gifts.map((g) => g.kind);
  const b = buildWorld({ seed: 99 }).gifts.map((g) => g.kind);
  assert.deepEqual(a, b, '同一种子必须复现');
});

test('角色属性：小熊 2 步 / 抱 2 只，小兔 3 步 / 抱 1 只', () => {
  const engine = new GameEngine();
  assert.equal(engine.players[ROLES.BEAR].baseAp, 2);
  assert.equal(engine.players[ROLES.BEAR].carryLimit, 2);
  assert.equal(engine.players[ROLES.BUNNY].baseAp, 3);
  assert.equal(engine.players[ROLES.BUNNY].carryLimit, 1);
  assert.equal(engine.round, 1);
  assert.equal(engine.status, STATUS.PLAYING);
  assert.equal(engine.team.courage, START_COURAGE);
});

test('原地左转 / 右转消耗 0 步', () => {
  const engine = new GameEngine();
  const bear = engine.players[ROLES.BEAR];
  const apBefore = bear.ap;
  assert.equal(bear.facing, 'W');
  assert.equal(engine.act(ROLES.BEAR, { type: ACTION.TURN_RIGHT }).apCost, 0);
  assert.equal(bear.facing, 'N');
  assert.equal(engine.act(ROLES.BEAR, { type: ACTION.TURN_LEFT }).apCost, 0);
  assert.equal(bear.facing, 'W');
  engine.act(ROLES.BEAR, { type: ACTION.TURN_LEFT });
  assert.equal(bear.facing, 'S');
  assert.equal(bear.ap, apBefore, '转向绝不消耗行动点');
});

test('地形消耗：草地 1 步、森林 2 步', () => {
  const engine = new GameEngine();
  const bunny = place(engine, ROLES.BUNNY, 9, 7, 'W'); // (8,7) 是草地
  const grass = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(grass.ok, true);
  assert.equal(grass.apCost, 1);
  assert.equal(bunny.ap, 2);

  const forest = findApproach(engine.world, TERRAIN.FOREST);
  const bear = place(engine, ROLES.BEAR, forest.from.x, forest.from.y, forest.facing);
  bear.ap = 2;
  const walked = engine.act(ROLES.BEAR, { type: ACTION.FORWARD });
  assert.equal(walked.ok, true, walked.message);
  assert.equal(walked.apCost, 2);
  assert.equal(bear.ap, 0);
});

test('创意 1：撞上石头不扣行动点、不穿墙，并给出退路箭头提示', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 1, 3, 'N'); // (1,2) 是石头
  assert.equal(engine.world.grid[2][1], TERRAIN.ROCK);
  const apBefore = bear.ap;
  const result = engine.act(ROLES.BEAR, { type: ACTION.FORWARD });

  assert.equal(result.ok, false);
  assert.equal(result.reason, REJECT.BLOCKED);
  assert.equal(result.blocker, BLOCKER.ROCK);
  assert.equal(bear.ap, apBefore, '撞墙绝对不扣行动点');
  assert.deepEqual({ x: bear.x, y: bear.y }, { x: 1, y: 3 }, '不穿墙，位置不变');
  assert.match(result.hint.banner, /前方挡路/);
  assert.equal(result.hint.attemptedDir, 'N');
  assert.equal(result.hint.retreatDir, 'S');
  assert.ok(result.hint.alternatives.includes('S'));
  assert.ok(!result.hint.alternatives.includes('N'));
  assert.equal(result.hint.arrow.pointing, 'S');
  assert.equal(result.events.at(-1).type, 'blocked');
});

test('撞树篱与撞外墙同样零消耗，并区分提示文案', () => {
  const engine = new GameEngine();
  const bunny = place(engine, ROLES.BUNNY, 8, 3, 'E'); // 玫瑰迷宫西侧周界树篱
  const hedge = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(hedge.reason, REJECT.BLOCKED);
  assert.equal(hedge.blocker, BLOCKER.HEDGE);
  assert.match(hedge.hint.banner, /树篱/);
  assert.equal(bunny.ap, 3);

  place(engine, ROLES.BUNNY, 7, 0, 'N'); // 世界北侧外墙
  const wall = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(wall.blocker, BLOCKER.BOUNDARY);
  assert.match(wall.hint.banner, /围墙/);
  assert.equal(bunny.ap, 3, '撞外墙也不扣点');
});

test('后退按地形扣点，方向为朝向的反面', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 6, 7, 'E');
  const result = engine.act(ROLES.BEAR, { type: ACTION.BACKWARD });
  assert.equal(result.ok, true);
  assert.deepEqual({ x: bear.x, y: bear.y }, { x: 5, y: 7 });
  assert.equal(bear.facing, 'E', '后退不改变朝向');
});

test('行动点不足时拒绝移动且不扣点（reason=no_ap，区别于 blocked）', () => {
  const engine = new GameEngine();
  const forest = findApproach(engine.world, TERRAIN.FOREST);
  const bear = place(engine, ROLES.BEAR, forest.from.x, forest.from.y, forest.facing);
  bear.ap = 1;
  const result = engine.act(ROLES.BEAR, { type: ACTION.FORWARD });
  assert.equal(result.ok, false);
  assert.equal(result.reason, REJECT.NO_AP);
  assert.equal(bear.ap, 1);
  assert.deepEqual({ x: bear.x, y: bear.y }, forest.from);
});

test('森林绳网要 3 步；有庇护罩时化解为 1 步并消耗一层', () => {
  const engine = new GameEngine();
  const net = findApproach(engine.world, TERRAIN.NET);
  const bunny = place(engine, ROLES.BUNNY, net.from.x, net.from.y, net.facing);
  bunny.ap = 3;
  assert.equal(engine.act(ROLES.BUNNY, { type: ACTION.FORWARD }).apCost, 3);
  assert.equal(bunny.ap, 0);

  const engine2 = new GameEngine();
  engine2.team.shelter = 1;
  const bunny2 = place(engine2, ROLES.BUNNY, net.from.x, net.from.y, net.facing);
  const result = engine2.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(result.apCost, 1);
  assert.equal(bunny2.ap, 2);
  assert.equal(engine2.team.shelter, 0, '庇护罩化解绳网后消耗一层');
});

test('踩到小动物自动抱起，超出负重上限则抱不动', () => {
  const engine = new GameEngine();
  // 小兔（上限 1）走到小刺猬 (2,1)
  const bunny = place(engine, ROLES.BUNNY, 2, 2, 'N');
  engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.deepEqual(bunny.carrying, ['hedgehog']);
  assert.equal(engine.animalById('hedgehog').state, 'carried');

  // 再去踩小松鼠 (12,8) —— 已满，抱不下
  place(engine, ROLES.BUNNY, 12, 9, 'N');
  bunny.ap = 3;
  const result = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(result.ok, true);
  assert.equal(bunny.carrying.length, 1, '小兔最多只能抱 1 只');
  assert.ok(result.events.some((e) => e.type === 'carry_full'));
  assert.equal(engine.animalById('squirrel').state, 'wild');
});

test('小熊可以同时抱 2 只小动物', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 2, 2, 'N');
  bear.ap = 9;
  engine.act(ROLES.BEAR, { type: ACTION.FORWARD }); // (2,1) 小刺猬
  assert.deepEqual(bear.carrying, ['hedgehog']);
  place(engine, ROLES.BEAR, 12, 9, 'N');
  bear.ap = 9;
  engine.act(ROLES.BEAR, { type: ACTION.FORWARD }); // (12,8) 小松鼠
  assert.deepEqual(bear.carrying, ['hedgehog', 'squirrel']);
  assert.equal(bear.carrying.length, bear.carryLimit);
});

test('把小动物带回家自动救回并奖励勇气', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 6, 7, 'E');
  bear.carrying = ['hedgehog', 'squirrel'];
  for (const id of bear.carrying) {
    engine.animalById(id).state = 'carried';
    engine.animalById(id).carriedBy = ROLES.BEAR;
  }
  const courageBefore = engine.team.courage;

  const result = engine.act(ROLES.BEAR, { type: ACTION.FORWARD });
  assert.equal(result.ok, true);
  assert.equal(bear.carrying.length, 0);
  assert.equal(engine.rescuedCount(), 2);
  assert.equal(engine.team.courage, courageBefore + 4);
  assert.equal(result.events.filter((e) => e.type === 'rescue').length, 2);
});

test('礼物盒加勇气，恶作剧盒让该角色下一回合暂停', () => {
  const engine = new GameEngine();
  const giftCell = engine.world.gifts.find((g) => g.kind === 'gift');
  const prankCell = engine.world.gifts.find((g) => g.kind === 'prank');

  const bear = place(engine, ROLES.BEAR, giftCell.x - 1, giftCell.y, 'E');
  bear.ap = 5;
  const courageBefore = engine.team.courage;
  assert.equal(engine.act(ROLES.BEAR, { type: ACTION.FORWARD }).ok, true);
  assert.equal(engine.team.courage, courageBefore + 2);
  assert.equal(engine.world.gifts.find((g) => g.id === giftCell.id).opened, true);

  const bunny = place(engine, ROLES.BUNNY, prankCell.x - 1, prankCell.y, 'E');
  bunny.ap = 5;
  assert.equal(engine.act(ROLES.BUNNY, { type: ACTION.FORWARD }).ok, true);
  assert.equal(bunny.pausedNextRound, true);
  advance(engine);
  assert.equal(engine.players[ROLES.BUNNY].paused, true);
  assert.equal(engine.players[ROLES.BUNNY].ap, 0, '被恶作剧的角色下回合 0 步');
  assert.equal(engine.players[ROLES.BEAR].ap, 2);
});

test('🤝 Give：相邻可递交，0 步；距离过远或对方满载则拒绝', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 6, 7, 'E');
  const bunny = place(engine, ROLES.BUNNY, 6, 8, 'N'); // 曼哈顿距离 1
  bear.carrying = ['fox'];
  engine.animalById('fox').state = 'carried';
  engine.animalById('fox').carriedBy = ROLES.BEAR;

  const apBefore = bear.ap;
  const ok = engine.act(ROLES.BEAR, { type: ACTION.GIVE });
  assert.equal(ok.ok, true);
  assert.equal(ok.apCost, 0, '递交不消耗步数');
  assert.equal(bear.ap, apBefore);
  assert.deepEqual(bunny.carrying, ['fox']);
  assert.equal(engine.animalById('fox').carriedBy, ROLES.BUNNY);

  // 小兔已满 → 再递被拒
  bear.carrying = ['owl'];
  engine.animalById('owl').state = 'carried';
  const full = engine.act(ROLES.BEAR, { type: ACTION.GIVE });
  assert.equal(full.reason, REJECT.RECEIVER_FULL);

  // 距离过远 → 拒绝
  place(engine, ROLES.BUNNY, 0, 0, 'N');
  const far = engine.act(ROLES.BEAR, { type: ACTION.GIVE });
  assert.equal(far.reason, REJECT.TOO_FAR);

  // 空手 → 拒绝
  bear.carrying = [];
  place(engine, ROLES.BUNNY, 6, 8, 'N');
  assert.equal(engine.act(ROLES.BEAR, { type: ACTION.GIVE }).reason, REJECT.NOTHING_TO_GIVE);
});

test('🤝 Give：队友站在家里时直接救回并加勇气', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 7, 8, 'N');
  place(engine, ROLES.BUNNY, HOME.x, HOME.y, 'N');
  bear.carrying = ['deer'];
  engine.animalById('deer').state = 'carried';
  engine.animalById('deer').carriedBy = ROLES.BEAR;
  const courageBefore = engine.team.courage;

  const result = engine.act(ROLES.BEAR, { type: ACTION.GIVE });
  assert.equal(result.ok, true);
  assert.equal(engine.animalById('deer').state, 'home');
  assert.equal(engine.rescuedCount(), 1);
  assert.equal(engine.team.courage, courageBefore + 2);
  assert.equal(engine.players[ROLES.BUNNY].carrying.length, 0, '在家的队友不占负重');
});

test('🤝 最后一步交接：用完步数后走到队友旁边，仍然能把小动物递出去', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 5, 7, 'E');
  place(engine, ROLES.BUNNY, 7, 7, 'N'); // 小兔守在家里
  bear.carrying = ['fox'];
  engine.animalById('fox').state = 'carried';
  engine.animalById('fox').carriedBy = ROLES.BEAR;
  bear.ap = 1;

  assert.equal(engine.act(ROLES.BEAR, { type: ACTION.FORWARD }).ok, true); // 走到 (6,7)
  assert.equal(bear.ap, 0, '最后一步用光了');
  const give = engine.act(ROLES.BEAR, { type: ACTION.GIVE });
  assert.equal(give.ok, true, '0 步也能交接');
  assert.equal(engine.animalById('fox').state, 'home');
});

test('🏡 Support：只能在家中做，消耗 1 步，庇护上限 2 层', () => {
  const engine = new GameEngine();
  const bunny = place(engine, ROLES.BUNNY, 6, 7, 'E');
  assert.equal(engine.act(ROLES.BUNNY, { type: ACTION.SUPPORT }).reason, REJECT.NOT_AT_HOME);

  place(engine, ROLES.BUNNY, HOME.x, HOME.y, 'N');
  bunny.ap = 3;
  assert.equal(engine.act(ROLES.BUNNY, { type: ACTION.SUPPORT }).apCost, 1);
  assert.equal(engine.team.shelter, 1);
  assert.equal(bunny.ap, 2);
  engine.act(ROLES.BUNNY, { type: ACTION.SUPPORT });
  assert.equal(engine.team.shelter, MAX_SHELTER);
  assert.equal(engine.act(ROLES.BUNNY, { type: ACTION.SUPPORT }).reason, REJECT.SHELTER_FULL);

  bunny.ap = 0;
  engine.team.shelter = 0;
  assert.equal(engine.act(ROLES.BUNNY, { type: ACTION.SUPPORT }).reason, REJECT.NO_AP);
});

test('✨ Boost：消耗 2 勇气让双方本回合各 +2 步，每回合限一次', () => {
  const engine = new GameEngine();
  engine.team.courage = 2;
  const result = engine.act(ROLES.BEAR, { type: ACTION.BOOST });
  assert.equal(result.ok, true);
  assert.equal(engine.team.courage, 0);
  assert.equal(engine.players[ROLES.BEAR].ap, 4);
  assert.equal(engine.players[ROLES.BUNNY].ap, 5);
  // 同一回合内再次加步 → 被每回合一次的限制挡下
  engine.team.courage = 5;
  assert.equal(engine.act(ROLES.BUNNY, { type: ACTION.BOOST }).reason, REJECT.BOOST_USED);

  // 勇气不足 → no_courage
  const poor = new GameEngine();
  poor.team.courage = 1;
  assert.equal(poor.act(ROLES.BEAR, { type: ACTION.BOOST }).reason, REJECT.NO_COURAGE);
  assert.equal(poor.players[ROLES.BEAR].ap, 2, '加步失败不改变行动点');

  // 下一回合重置
  advance(engine);
  assert.equal(engine.team.boostUsedThisRound, false);
  assert.equal(engine.players[ROLES.BEAR].ap, 2);
  assert.equal(engine.act(ROLES.BEAR, { type: ACTION.BOOST }).ok, true);
});

test('原子确认：单方就绪不推进，行动点归零也不自动推进', () => {
  const engine = new GameEngine();
  engine.players[ROLES.BEAR].ap = 0;
  engine.players[ROLES.BUNNY].ap = 0;
  assert.equal(engine.round, 1, '行动点耗尽不会自动推进回合');

  const first = engine.setReady(ROLES.BEAR);
  assert.equal(first.advanced, false);
  assert.equal(engine.round, 1);

  const again = engine.setReady(ROLES.BEAR); // 幂等
  assert.equal(again.advanced, false);
  assert.equal(engine.round, 1);
  assert.equal(again.events.length, 0, '重复就绪不产生新事件');

  const second = engine.setReady(ROLES.BUNNY);
  assert.equal(second.advanced, true);
  assert.equal(engine.round, 2);
  assert.equal(engine.players[ROLES.BEAR].ready, false);
  assert.equal(engine.players[ROLES.BUNNY].ready, false);
  assert.equal(engine.players[ROLES.BEAR].ap, 2, '行动点已刷新');
  assert.equal(engine.players[ROLES.BUNNY].ap, 3);
});

test('可以取消就绪，取消后不会推进', () => {
  const engine = new GameEngine();
  engine.setReady(ROLES.BEAR, true);
  engine.setReady(ROLES.BEAR, false);
  const result = engine.setReady(ROLES.BUNNY, true);
  assert.equal(result.advanced, false);
  assert.equal(engine.round, 1);
});

test(`天气：每 ${STORM_EVERY} 个共同回合结算一次雷雨`, () => {
  const engine = new GameEngine();
  for (let round = 1; round <= STORM_EVERY * 2; round += 1) {
    const result = advance(engine);
    const stormed = result.events.some((e) => e.type === 'storm');
    assert.equal(stormed, round % STORM_EVERY === 0, `结束第 ${round} 回合时风暴应为 ${round % STORM_EVERY === 0}`);
  }
});

test('雷雨：有庇护罩则抵消一层；无庇护则怀里的小动物受惊落地且扣勇气', () => {
  const sheltered = new GameEngine();
  sheltered.team.shelter = 2;
  sheltered.players[ROLES.BEAR].carrying = ['fox'];
  sheltered.animalById('fox').state = 'carried';
  sheltered.animalById('fox').carriedBy = ROLES.BEAR;
  for (let i = 0; i < STORM_EVERY; i += 1) advance(sheltered);
  assert.equal(sheltered.team.shelter, 1);
  assert.deepEqual(sheltered.players[ROLES.BEAR].carrying, ['fox'], '庇护罩护住了怀里的小动物');

  const exposed = new GameEngine();
  const bear = exposed.players[ROLES.BEAR];
  bear.carrying = ['fox'];
  exposed.animalById('fox').state = 'carried';
  exposed.animalById('fox').carriedBy = ROLES.BEAR;
  const courageBefore = exposed.team.courage;
  for (let i = 0; i < STORM_EVERY; i += 1) advance(exposed);
  assert.equal(exposed.players[ROLES.BEAR].carrying.length, 0);
  assert.equal(exposed.animalById('fox').state, 'wild');
  assert.deepEqual(
    { x: exposed.animalById('fox').x, y: exposed.animalById('fox').y },
    { x: bear.x, y: bear.y },
    '受惊的小动物就落在原地，可以重新抱起',
  );
  assert.ok(exposed.team.courage < courageBefore, '雷雨会扣勇气');
});

test(`${MAX_ROUNDS} 个共同回合用尽判负，且不会推进到第 ${MAX_ROUNDS + 1} 回合`, () => {
  const engine = new GameEngine();
  for (let i = 0; i < MAX_ROUNDS; i += 1) advance(engine);
  assert.equal(engine.round, MAX_ROUNDS);
  assert.equal(engine.status, STATUS.LOST);
  assert.equal(engine.act(ROLES.BEAR, { type: ACTION.TURN_LEFT }).reason, REJECT.GAME_OVER);
  assert.equal(engine.setReady(ROLES.BEAR).ok, false);
});

test('8 只全部救回立即判胜', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 6, 7, 'E');
  for (const animal of engine.world.animals) {
    animal.state = 'carried';
    animal.carriedBy = ROLES.BEAR;
  }
  bear.carrying = engine.world.animals.map((a) => a.id);
  const result = engine.act(ROLES.BEAR, { type: ACTION.FORWARD });
  assert.equal(engine.rescuedCount(), TOTAL_ANIMALS);
  assert.equal(engine.status, STATUS.WON);
  assert.ok(result.events.some((e) => e.type === 'win'));
});

test('快照可 JSON 序列化并包含前端渲染所需的全部信息', () => {
  const engine = new GameEngine();
  const snapshot = JSON.parse(JSON.stringify(engine.snapshot()));
  assert.equal(snapshot.round, 1);
  assert.equal(snapshot.maxRounds, MAX_ROUNDS);
  assert.equal(snapshot.size, GRID_SIZE);
  assert.equal(snapshot.grid.length, GRID_SIZE);
  assert.ok(Array.isArray(snapshot.walls) && snapshot.walls.length > 0);
  assert.equal(snapshot.animals.length, TOTAL_ANIMALS);
  assert.equal(snapshot.gifts.length, TOTAL_GIFTS);
  assert.equal(snapshot.energies.length, 6);
  assert.equal(snapshot.decoys.length, 3);
  assert.equal(snapshot.beasts.length, 2);
  assert.equal(snapshot.gifts.every((g) => g.kind === null), true, '未打开的礼盒不泄露内容');
  assert.deepEqual(Object.keys(snapshot.players).sort(), ['bear', 'bunny']);
  assert.ok(Array.isArray(snapshot.players.bear.openDirs));
  assert.equal(typeof snapshot.visibility.visible, 'boolean');
  assert.equal(snapshot.team.totalAnimals, TOTAL_ANIMALS);
  assert.equal(snapshot.explored.length, GRID_SIZE * GRID_SIZE, '小地图迷雾是一串 15×15 的 0/1');
});

test('reset 重开一局会恢复初始状态', () => {
  const engine = new GameEngine();
  engine.team.courage = 99;
  advance(engine);
  engine.reset();
  assert.equal(engine.round, 1);
  assert.equal(engine.team.courage, START_COURAGE);
  assert.equal(engine.rescuedCount(), 0);
  assert.equal(engine.players[ROLES.BUNNY].x, ROLE_CONFIG[ROLES.BUNNY].start.x);
  assert.equal(engine.players[ROLES.BEAR].x, ROLE_CONFIG[ROLES.BEAR].start.x);
  assert.equal(engine.world.beasts.every((b) => !b.awake), true, '野兽也回到打盹状态');
});
