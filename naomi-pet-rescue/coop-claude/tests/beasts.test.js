/**
 * tests/beasts.test.js — R2 新机制：🐺 狼、🦁 狮子、🏚️ 假房子、🌟 能量星、🗺️ 迷雾小地图。
 *
 * 全部围绕一条原则：世界只在**共同回合结算**时动一次，玩家盯着屏幕想多久都不会被偷袭。
 *
 * Author: Claude Code (Claude Opus)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { GameEngine } from '../core/game.js';
import {
  ACTION, ENERGY_AP_GAIN, GRID_SIZE, HOME, REJECT, ROLES, STORM_EVERY,
  TERRAIN, WOLF_SCARE_AP_COST, BLOCKER,
} from '../core/constants.js';
import { isSafeZone, manhattan } from '../core/beasts.js';

/** 传送到指定格（绕过移动消耗）。 */
function place(engine, role, x, y, facing = 'N') {
  const p = engine.players[role];
  p.x = x; p.y = y; p.facing = facing;
  return p;
}

/** 推进一个共同回合。 */
function advance(engine) {
  engine.setReady(ROLES.BEAR);
  return engine.setReady(ROLES.BUNNY);
}

/**
 * 把引擎调到一个「野兽已醒、这回合不打雷」的回合，方便单独观察野兽。
 * 回合号是算出来的，免得以后调 STORM_EVERY 时这一堆测试集体撞上雷雨。
 */
function quietRound(after = 3) {
  let round = after + 1;
  while (round % STORM_EVERY === 0) round += 1;
  return round;
}

function toBeastRound(engine, round = quietRound()) {
  assert.notEqual(round % STORM_EVERY, 0, '测试回合不该撞上雷雨');
  engine.round = round;
  for (const beast of engine.world.beasts) beast.awake = true;
  return engine;
}

const wolfOf = (engine) => engine.world.beasts.find((b) => b.kind === 'wolf');
const lionOf = (engine) => engine.world.beasts.find((b) => b.kind === 'lion');

// ———————————————————— 🐺 狼 ————————————————————

test('🐺 狼在苏醒回合之前一直打盹，不会一开局就扑上来', () => {
  const engine = new GameEngine();
  const wolf = wolfOf(engine);
  const start = { x: wolf.x, y: wolf.y };
  assert.equal(wolf.awake, false);
  assert.ok(wolf.wakeRound >= 2, '至少留一个回合给孩子熟悉花园');

  advance(engine); // 结束第 1 回合
  assert.deepEqual({ x: wolf.x, y: wolf.y }, start, '还没醒就不该动');
});

test('🐺 狼醒来后每个共同回合朝最近的玩家走 1 步', () => {
  const engine = new GameEngine();
  toBeastRound(engine);
  const wolf = wolfOf(engine);
  place(engine, ROLES.BEAR, 7, 1, 'S'); // 熊挪远，让狼盯上小兔
  place(engine, ROLES.BUNNY, 5, 7, 'W');
  wolf.x = 0; wolf.y = 7;
  const before = manhattan(wolf, engine.players[ROLES.BUNNY]);

  advance(engine);
  const after = manhattan(wolf, engine.players[ROLES.BUNNY]);
  assert.equal(after, before - 1, '每回合只逼近 1 步');
});

test('🐺 狼不会踩进玩家所在的格子，只会贴到旁边', () => {
  const engine = new GameEngine();
  toBeastRound(engine);
  const wolf = wolfOf(engine);
  const bunny = place(engine, ROLES.BUNNY, 5, 5, 'N');
  place(engine, ROLES.BEAR, 12, 12, 'N');
  wolf.x = 3; wolf.y = 5;

  advance(engine);
  assert.ok(manhattan(wolf, bunny) >= 1, '狼永远不会和玩家同格');
  assert.notDeepEqual({ x: wolf.x, y: wolf.y }, { x: bunny.x, y: bunny.y });
});

test('🐺 狼挡在前面时撞上去不扣步，提示里说得清楚是狼', () => {
  const engine = new GameEngine();
  const bunny = place(engine, ROLES.BUNNY, 5, 5, 'N');
  const wolf = wolfOf(engine);
  wolf.x = 5; wolf.y = 4; // 正前方
  const apBefore = bunny.ap;

  const result = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(result.ok, false);
  assert.equal(result.reason, REJECT.BLOCKED);
  assert.equal(result.blocker, BLOCKER.WOLF);
  assert.match(result.hint.banner, /狼/);
  assert.equal(bunny.ap, apBefore, '被狼挡住不扣行动点');
  assert.deepEqual({ x: bunny.x, y: bunny.y }, { x: 5, y: 5 }, '不会穿过狼');
  assert.ok(!result.hint.alternatives.includes('N'), '退路建议里不会指向狼');
});

test('🐺 狼贴身结算：掉一只怀里的小动物、扣勇气，然后它退开一格', () => {
  const engine = new GameEngine();
  toBeastRound(engine);
  const bunny = place(engine, ROLES.BUNNY, 5, 5, 'N');
  place(engine, ROLES.BEAR, 12, 12, 'N');
  const wolf = wolfOf(engine);
  wolf.x = 5; wolf.y = 4;

  bunny.carrying = ['fox'];
  engine.animalById('fox').state = 'carried';
  engine.animalById('fox').carriedBy = ROLES.BUNNY;
  const courageBefore = engine.team.courage;

  const result = advance(engine);
  const bite = result.events.find((e) => e.type === 'wolf_bite');
  assert.ok(bite, '狼贴着就该咬一口');
  assert.equal(bunny.carrying.length, 0);
  assert.equal(engine.animalById('fox').state, 'wild');
  assert.deepEqual(
    { x: engine.animalById('fox').x, y: engine.animalById('fox').y },
    { x: bunny.x, y: bunny.y },
    '小动物掉在原地，可以捡回来',
  );
  assert.equal(engine.team.courage, courageBefore - 1);
  assert.ok(manhattan(wolf, bunny) > 1, '咬完退开，不会贴着连咬');
});

test('🐺 家门口是安全区：狼进不来，也不会在门口咬人', () => {
  const engine = new GameEngine();
  toBeastRound(engine);
  const bunny = place(engine, ROLES.BUNNY, HOME.x, HOME.y, 'N');
  place(engine, ROLES.BEAR, 12, 12, 'N');
  const wolf = wolfOf(engine);
  wolf.x = HOME.x + 2; wolf.y = HOME.y;

  // 连推几个回合，狼一路想扑过来，但安全区把它挡在外面
  const bites = [];
  for (let i = 0; i < 4; i += 1) {
    const result = advance(engine);
    bites.push(...result.events.filter((e) => e.type === 'wolf_bite'));
    assert.equal(isSafeZone(wolf.x, wolf.y), false, `第 ${i + 1} 次结算后狼闯进了安全区 (${wolf.x},${wolf.y})`);
  }
  assert.deepEqual(bites, [], '小兔一直站在家里，狼不该咬到她');
  assert.deepEqual({ x: bunny.x, y: bunny.y }, { x: HOME.x, y: HOME.y });
});

test('🐻💢 只有小熊能吓退狼：花 1 步、狼退开、发愣一回合', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 5, 5, 'N');
  const wolf = wolfOf(engine);
  wolf.x = 5; wolf.y = 4;
  const apBefore = bear.ap;

  const result = engine.act(ROLES.BEAR, { type: ACTION.SCARE });
  assert.equal(result.ok, true, result.message);
  assert.equal(result.apCost, WOLF_SCARE_AP_COST);
  assert.equal(bear.ap, apBefore - WOLF_SCARE_AP_COST);
  assert.ok(manhattan(wolf, bear) > 1, `狼应当被推开，现在距离 ${manhattan(wolf, bear)}`);
  assert.ok(wolf.stunned >= 1, '被吓退后要发愣一个回合');

  // 发愣的那个回合狼不动
  toBeastRound(engine);
  const stunnedAt = { x: wolf.x, y: wolf.y };
  const advanced = advance(engine);
  assert.ok(advanced.events.some((e) => e.type === 'beast_stunned'));
  assert.deepEqual({ x: wolf.x, y: wolf.y }, stunnedAt);
});

test('🐰 小兔吓不退狼；旁边没狼时也吓不了', () => {
  const engine = new GameEngine();
  const bunny = place(engine, ROLES.BUNNY, 5, 5, 'N');
  const wolf = wolfOf(engine);
  wolf.x = 5; wolf.y = 4;
  const notBear = engine.act(ROLES.BUNNY, { type: ACTION.SCARE });
  assert.equal(notBear.reason, REJECT.NOT_BEAR);
  assert.equal(bunny.ap, 3, '被拒绝不扣步');

  const bear = place(engine, ROLES.BEAR, 12, 12, 'N');
  const noWolf = engine.act(ROLES.BEAR, { type: ACTION.SCARE });
  assert.equal(noWolf.reason, REJECT.NO_WOLF);
  assert.equal(bear.ap, 2, '被拒绝不扣步');
});

// ———————————————————— 🦁 狮子 ————————————————————

test('🦁 狮子不追玩家，它朝最近的野生小动物走', () => {
  const engine = new GameEngine();
  toBeastRound(engine);
  const lion = lionOf(engine);
  // 把玩家挪远，避免牵制
  place(engine, ROLES.BEAR, 7, 7, 'N');
  place(engine, ROLES.BUNNY, 7, 8, 'N');
  lion.x = 13; lion.y = 13;

  const nearestBefore = Math.min(
    ...engine.world.animals.filter((a) => a.state === 'wild').map((a) => manhattan(a, lion)),
  );
  advance(engine);
  const nearestAfter = Math.min(
    ...engine.world.animals.filter((a) => a.state === 'wild').map((a) => manhattan(a, lion)),
  );
  assert.ok(nearestAfter < nearestBefore, '狮子应当朝小动物逼近，而不是朝玩家');
});

test('🦁 有玩家站在旁边时，狮子被牵制住，这回合不动 —— 合作的关键', () => {
  const engine = new GameEngine();
  toBeastRound(engine);
  const lion = lionOf(engine);
  lion.x = 9; lion.y = 12;
  place(engine, ROLES.BEAR, 9, 13, 'N'); // 熊贴着狮子牵制
  place(engine, ROLES.BUNNY, 7, 8, 'N');
  const before = { x: lion.x, y: lion.y };

  const result = advance(engine);
  assert.ok(result.events.some((e) => e.type === 'beast_distracted'), '应当产生牵制事件');
  assert.deepEqual({ x: lion.x, y: lion.y }, before, '被牵制就原地不动');
  assert.equal(lion.distracted, true);
});

test('🦁 狮子追上小动物会把它叼到远处，扣勇气，但不会永远弄丢', () => {
  const engine = new GameEngine();
  toBeastRound(engine);
  const lion = lionOf(engine);
  place(engine, ROLES.BEAR, 7, 7, 'N');
  place(engine, ROLES.BUNNY, 7, 8, 'N');

  const fox = engine.animalById('fox');
  lion.x = fox.x; lion.y = fox.y + 1; // 就差一步
  lion.facing = 'N';
  const courageBefore = engine.team.courage;
  const origin = { x: fox.x, y: fox.y };

  const result = advance(engine);
  const snatch = result.events.find((e) => e.type === 'lion_snatch');
  assert.ok(snatch, '狮子应当扑到小狐狸');
  assert.equal(engine.team.courage, courageBefore - 1);
  assert.equal(fox.state, 'wild', '小动物仍然在场上，只是换了地方');
  assert.notDeepEqual({ x: fox.x, y: fox.y }, origin, '它跑走了');
  assert.ok(manhattan(fox, lion) >= 4, '跑到离狮子够远的地方');
  assert.equal(engine.world.grid[fox.y][fox.x] !== TERRAIN.ROCK, true, '不会被扔到石头里');
});

test('🦁 小动物全部到家后，狮子没有目标就不再乱跑', () => {
  const engine = new GameEngine();
  toBeastRound(engine);
  const lion = lionOf(engine);
  place(engine, ROLES.BEAR, 7, 6, 'N');
  place(engine, ROLES.BUNNY, 7, 8, 'N');
  for (const animal of engine.world.animals) {
    animal.state = 'home';
    animal.x = HOME.x;
    animal.y = HOME.y;
  }
  const before = { x: lion.x, y: lion.y };
  advance(engine);
  assert.deepEqual({ x: lion.x, y: lion.y }, before);
});

// ———————————————————— 🏚️ 假房子 ————————————————————

test('🏚️ 地图上正好 3 座假房子，地形与清单一一对应', () => {
  const engine = new GameEngine();
  const decoyCells = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (engine.world.grid[y][x] === TERRAIN.DECOY) decoyCells.push(`${x},${y}`);
    }
  }
  assert.equal(decoyCells.length, 3);
  assert.deepEqual(
    decoyCells.sort(),
    engine.world.decoys.map((d) => `${d.x},${d.y}`).sort(),
  );
  for (const decoy of engine.world.decoys) {
    assert.equal(decoy.discovered, false, '一开始孩子还不知道哪座是假的');
    assert.ok(manhattan(decoy, HOME) >= 4, '假房子离真家要有距离，不然太容易混淆位置');
  }
});

test('🏚️ 走错门：怀里的小动物掉在门口、本回合剩下的步数用光、勇气 -1', () => {
  const engine = new GameEngine();
  const decoy = engine.world.decoys[0];
  const bear = place(engine, ROLES.BEAR, decoy.x - 1, decoy.y, 'E');
  bear.ap = 5;
  bear.carrying = ['fox', 'owl'];
  for (const id of bear.carrying) {
    engine.animalById(id).state = 'carried';
    engine.animalById(id).carriedBy = ROLES.BEAR;
  }
  const courageBefore = engine.team.courage;

  const result = engine.act(ROLES.BEAR, { type: ACTION.FORWARD });
  assert.equal(result.ok, true, '门是能进的，只是进去要吃苦头');
  assert.deepEqual({ x: bear.x, y: bear.y }, { x: decoy.x, y: decoy.y });
  assert.ok(result.events.some((e) => e.type === 'decoy'));
  assert.equal(bear.ap, 0, '本回合剩下的步数用光了');
  assert.equal(bear.carrying.length, 0);
  assert.equal(engine.animalById('fox').state, 'wild');
  assert.deepEqual(
    { x: engine.animalById('fox').x, y: engine.animalById('fox').y },
    { x: decoy.x, y: decoy.y },
    '小动物就掉在假房子门口，可以捡回来',
  );
  assert.equal(engine.team.courage, courageBefore - 1);
  assert.equal(engine.world.decoys[0].discovered, true, '识破之后小地图上会标出来');
  assert.equal(engine.rescuedCount(), 0, '假房子绝不算救回');
});

test('🏚️ 再走错同一座门只罚步数，不重复扣勇气', () => {
  const engine = new GameEngine();
  const decoy = engine.world.decoys[1];
  const bear = place(engine, ROLES.BEAR, decoy.x - 1, decoy.y, 'E');
  bear.ap = 4;
  engine.act(ROLES.BEAR, { type: ACTION.FORWARD });
  const courageAfterFirst = engine.team.courage;

  place(engine, ROLES.BEAR, decoy.x - 1, decoy.y, 'E');
  bear.ap = 4;
  const second = engine.act(ROLES.BEAR, { type: ACTION.FORWARD });
  assert.equal(bear.ap, 0, '还是要罚掉这回合剩下的步数');
  assert.equal(engine.team.courage, courageAfterFirst, '不重复扣勇气');
  assert.equal(second.events.find((e) => e.type === 'decoy').firstTime, false);
  assert.equal(engine.world.decoys[1].trips, 2);
});

test('🏡 真正的家绝不会被当成假房子', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, HOME.x - 1, HOME.y, 'E');
  bear.carrying = ['fox'];
  engine.animalById('fox').state = 'carried';
  engine.animalById('fox').carriedBy = ROLES.BEAR;
  const result = engine.act(ROLES.BEAR, { type: ACTION.FORWARD });
  assert.ok(result.events.some((e) => e.type === 'rescue'));
  assert.ok(!result.events.some((e) => e.type === 'decoy'));
  assert.equal(engine.rescuedCount(), 1);
});

// ———————————————————— 🌟 能量星 ————————————————————

test('🌟 能量星立刻补步，本回合就能用掉，而且只能拿一次', () => {
  const engine = new GameEngine();
  const star = engine.world.energies[0];
  const bunny = place(engine, ROLES.BUNNY, star.x - 1, star.y, 'E');
  bunny.ap = 2;

  const result = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(result.ok, true);
  const gained = result.events.find((e) => e.type === 'energy');
  assert.ok(gained, '应当捡到能量星');
  assert.equal(gained.gain, ENERGY_AP_GAIN);
  assert.equal(bunny.ap, 2 - 1 + ENERGY_AP_GAIN, '走进来扣 1 步，再补 2 步');
  assert.equal(engine.world.energies[0].taken, true);

  // 再走回来踩一次 → 星星已经没了
  bunny.facing = 'W';
  engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  bunny.facing = 'E';
  const again = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(again.events.some((e) => e.type === 'energy'), false, '同一颗星不能拿两次');
});

test('🌟 能量星补的步数只属于本回合，下回合回到基础值', () => {
  const engine = new GameEngine();
  const star = engine.world.energies[0];
  const bunny = place(engine, ROLES.BUNNY, star.x - 1, star.y, 'E');
  bunny.ap = 3;
  engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.ok(bunny.ap > 3 - 1, '本回合确实多了步数');

  advance(engine);
  assert.equal(engine.players[ROLES.BUNNY].ap, 3, '下回合回到 3 步');
  assert.equal(engine.players[ROLES.BUNNY].apMax, 3);
});

// ———————————————————— 🫳 重新抱起 ————————————————————

test('🫳 被雷雨吓掉在脚下的小动物，0 步就能重新抱起来', () => {
  const engine = new GameEngine();
  const bunny = place(engine, ROLES.BUNNY, 5, 5, 'N');
  bunny.carrying = ['fox'];
  const fox = engine.animalById('fox');
  fox.state = 'carried';
  fox.carriedBy = ROLES.BUNNY;

  for (let i = 0; i < STORM_EVERY; i += 1) advance(engine);
  assert.equal(fox.state, 'wild', '雷雨把它吓下来了');
  assert.deepEqual({ x: fox.x, y: fox.y }, { x: bunny.x, y: bunny.y }, '就掉在脚下');

  const apBefore = bunny.ap;
  const result = engine.act(ROLES.BUNNY, { type: ACTION.PICKUP });
  assert.equal(result.ok, true, '脚下的小动物必须捡得起来，不能逼孩子走开再走回来');
  assert.equal(result.apCost, 0, '捡起脚下的小动物不花步数');
  assert.equal(bunny.ap, apBefore);
  assert.deepEqual(bunny.carrying, ['fox']);
  assert.equal(fox.state, 'carried');
});

test('🫳 脚下没东西 / 怀里满了，都会被清楚地拒绝且不扣步', () => {
  const engine = new GameEngine();
  const bunny = place(engine, ROLES.BUNNY, 5, 5, 'N');
  const empty = engine.act(ROLES.BUNNY, { type: ACTION.PICKUP });
  assert.equal(empty.reason, REJECT.NOTHING_HERE);
  assert.equal(bunny.ap, 3);

  // 小兔只能抱 1 只：怀里有货时，脚下再掉一只也抱不动
  bunny.carrying = ['owl'];
  engine.animalById('owl').state = 'carried';
  engine.animalById('owl').carriedBy = ROLES.BUNNY;
  const fox = engine.animalById('fox');
  fox.state = 'wild';
  fox.x = bunny.x; fox.y = bunny.y;
  const full = engine.act(ROLES.BUNNY, { type: ACTION.PICKUP });
  assert.equal(full.reason, REJECT.CARRY_FULL);
  assert.equal(bunny.ap, 3, '被拒绝不扣步');
});

test('🫳 快照会告诉客户端「脚下有没有东西可捡」「旁边有没有狼」', () => {
  const engine = new GameEngine();
  const bunny = place(engine, ROLES.BUNNY, 5, 5, 'N');
  let snap = engine.snapshot();
  assert.deepEqual(snap.players.bunny.animalsHere, []);
  assert.equal(snap.players.bunny.wolfAdjacent, false);

  const fox = engine.animalById('fox');
  fox.state = 'wild';
  fox.x = bunny.x; fox.y = bunny.y;
  const wolf = wolfOf(engine);
  wolf.awake = true;
  wolf.x = 5; wolf.y = 4;

  snap = engine.snapshot();
  assert.deepEqual(snap.players.bunny.animalsHere, ['fox']);
  assert.equal(snap.players.bunny.wolfAdjacent, true);
  assert.equal(snap.players.bear.wolfAdjacent, false, '小熊离得远，按钮不该亮');
});

// ———————————————————— 🗺️ 迷雾小地图 ————————————————————

test('🗺️ 开局只点亮两位角色身边的一小片，不是整张地图', () => {
  const engine = new GameEngine();
  const mask = engine.snapshot().explored;
  assert.equal(mask.length, GRID_SIZE * GRID_SIZE);
  const lit = [...mask].filter((c) => c === '1').length;
  assert.ok(lit > 0, '起点附近应当是亮的');
  assert.ok(lit < GRID_SIZE * GRID_SIZE * 0.25, `一开局就点亮了 ${lit} 格，小地图不该剧透`);
  assert.equal(mask[HOME.y * GRID_SIZE + HOME.x], '1', '家就在脚边，一开始就看得见');
});

test('🗺️ 走过的地方会被点亮，树篱另一侧不会被偷看到', () => {
  const engine = new GameEngine();
  const before = [...engine.snapshot().explored].filter((c) => c === '1').length;

  const bunny = engine.players[ROLES.BUNNY];
  for (let i = 0; i < 3; i += 1) {
    bunny.ap = 5;
    engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  }
  const after = [...engine.snapshot().explored].filter((c) => c === '1').length;
  assert.ok(after > before, '走动之后应当点亮更多格子');

  // 玫瑰迷宫深处（花亭）没去过，就不该亮
  const gazebo = engine.world.gazebos.north;
  assert.equal(
    engine.snapshot().explored[gazebo.y * GRID_SIZE + gazebo.x], '0',
    '没进过迷宫，花亭不该被点亮',
  );
});

test('🗺️ 小地图是队伍共享的：两个人各自探索，拼出同一张地图', () => {
  const engine = new GameEngine();
  const bear = engine.players[ROLES.BEAR];
  bear.x = 2; bear.y = 2;
  engine.revealAround(bear);
  const mask = engine.snapshot().explored;
  assert.equal(mask[2 * GRID_SIZE + 2], '1', '小熊走过的地方，小兔的小地图上也亮着');
});

// ———————————————————— 确定性 ————————————————————

test('同样的开局与同样的操作，野兽走出完全一样的轨迹', () => {
  const trace = () => {
    const engine = new GameEngine({ seed: 4242 });
    const path = [];
    for (let i = 0; i < 8; i += 1) {
      advance(engine);
      path.push(engine.world.beasts.map((b) => `${b.kind}:${b.x},${b.y}`).join('|'));
    }
    return path;
  };
  assert.deepEqual(trace(), trace(), '野兽行为必须可复现，才能复盘和写测试');
});

test('野兽只在回合结算时动：玩家盯着屏幕想多久都不会被偷袭', () => {
  const engine = new GameEngine();
  toBeastRound(engine);
  const snapshotBeasts = () => engine.world.beasts.map((b) => `${b.x},${b.y}`).join('|');
  const before = snapshotBeasts();

  // 一整串动作 —— 转身、走路、撞墙、看地图，世界都不该动
  for (let i = 0; i < 6; i += 1) {
    engine.act(ROLES.BUNNY, { type: ACTION.TURN_RIGHT });
    engine.act(ROLES.BEAR, { type: ACTION.TURN_LEFT });
    engine.snapshot();
  }
  assert.equal(snapshotBeasts(), before, '只转身不结算，野兽一步都不许动');

  advance(engine);
  assert.notEqual(snapshotBeasts(), before, '双方都确认后，野兽才走');
});
