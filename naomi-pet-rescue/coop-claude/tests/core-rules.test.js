/**
 * tests/core-rules.test.js — 核心回合规则引擎测试。
 * Author: Claude Code (Claude Opus)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { GameEngine } from '../core/game.js';
import {
  ACTION, HOME, MAX_ROUNDS, MAX_SHELTER, REJECT, ROLES, START_COURAGE, STATUS,
  TERRAIN, TOTAL_ANIMALS, TOTAL_GIFTS, BLOCKER,
} from '../core/constants.js';
import { buildWorld, reachableCells, terrainAt, ANIMAL_SPAWNS, GIFT_SPAWNS } from '../core/world.js';

/** 把角色直接放到指定格（单元测试用的传送，绕过移动消耗）。 */
function place(engine, role, x, y, facing = 'N') {
  const p = engine.players[role];
  p.x = x; p.y = y; p.facing = facing;
  return p;
}

test('世界是 9×9 网格，中心家园在 (4,4)', () => {
  const world = buildWorld();
  assert.equal(world.size, 9);
  assert.equal(world.grid.length, 9);
  for (const row of world.grid) assert.equal(row.length, 9);
  assert.equal(terrainAt(world, HOME.x, HOME.y), TERRAIN.HOME);
  assert.deepEqual(world.home, { x: 4, y: 4 });
});

test('共 8 只小动物、3 个礼盒，且全部可以从家园走到', () => {
  const world = buildWorld();
  assert.equal(world.animals.length, TOTAL_ANIMALS);
  assert.equal(world.gifts.length, TOTAL_GIFTS);
  const reachable = reachableCells(world);
  for (const a of ANIMAL_SPAWNS) {
    assert.ok(reachable.has(`${a.x},${a.y}`), `${a.name} 应当可达`);
  }
  for (const g of GIFT_SPAWNS) {
    assert.ok(reachable.has(`${g.x},${g.y}`), `${g.id} 应当可达`);
  }
  // 只有 6 块石头是不可进入的
  assert.equal(reachable.size, 81 - 6);
});

test('礼盒内容由种子决定，且恒为 2 礼物 + 1 恶作剧', () => {
  for (const seed of [1, 7, 42, 20260916]) {
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
  place(engine, ROLES.BUNNY, 2, 2, 'W'); // (1,2) 是草地
  const bunny = engine.players[ROLES.BUNNY];
  const grass = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(grass.ok, true);
  assert.equal(grass.apCost, 1);
  assert.equal(bunny.ap, 2);

  place(engine, ROLES.BEAR, 1, 1, 'W'); // (0,1)=草地 → 再往北 (0,0)... 用森林 (0,2)
  place(engine, ROLES.BEAR, 0, 1, 'S'); // (0,2) 是森林
  const forest = engine.act(ROLES.BEAR, { type: ACTION.FORWARD });
  assert.equal(forest.ok, true);
  assert.equal(forest.apCost, 2);
  assert.equal(engine.players[ROLES.BEAR].ap, 0);
});

test('创意 1：撞上石头不扣行动点、不穿墙，并给出退路箭头提示', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 1, 4, 'N'); // (1,3) 是石头
  const apBefore = bear.ap;
  const result = engine.act(ROLES.BEAR, { type: ACTION.FORWARD });

  assert.equal(result.ok, false);
  assert.equal(result.reason, REJECT.BLOCKED);
  assert.equal(result.blocker, BLOCKER.ROCK);
  assert.equal(bear.ap, apBefore, '撞墙绝对不扣行动点');
  assert.deepEqual({ x: bear.x, y: bear.y }, { x: 1, y: 4 }, '不穿墙，位置不变');
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
  const bunny = place(engine, ROLES.BUNNY, 5, 3, 'W'); // 迷宫西侧周界树篱
  const hedge = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(hedge.reason, REJECT.BLOCKED);
  assert.equal(hedge.blocker, BLOCKER.HEDGE);
  assert.match(hedge.hint.banner, /树篱/);
  assert.equal(bunny.ap, 3);

  place(engine, ROLES.BUNNY, 5, 0, 'N'); // 世界北侧外墙
  const wall = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(wall.blocker, BLOCKER.BOUNDARY);
  assert.match(wall.hint.banner, /围墙/);
  assert.equal(bunny.ap, 3, '撞外墙也不扣点');
});

test('后退按地形扣点，方向为朝向的反面', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 3, 4, 'E');
  const result = engine.act(ROLES.BEAR, { type: ACTION.BACKWARD });
  assert.equal(result.ok, true);
  assert.deepEqual({ x: bear.x, y: bear.y }, { x: 2, y: 4 });
  assert.equal(bear.facing, 'E', '后退不改变朝向');
});

test('行动点不足时拒绝移动且不扣点（reason=no_ap，区别于 blocked）', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 0, 1, 'S'); // (0,2) 森林需要 2 步
  bear.ap = 1;
  const result = engine.act(ROLES.BEAR, { type: ACTION.FORWARD });
  assert.equal(result.ok, false);
  assert.equal(result.reason, REJECT.NO_AP);
  assert.equal(bear.ap, 1);
  assert.deepEqual({ x: bear.x, y: bear.y }, { x: 0, y: 1 });
});

test('森林绳网要 3 步；有庇护罩时化解为 1 步并消耗一层', () => {
  const engine = new GameEngine();
  const bunny = place(engine, ROLES.BUNNY, 4, 2, 'S'); // (4,3) 是森林绳网
  bunny.ap = 3;
  assert.equal(engine.act(ROLES.BUNNY, { type: ACTION.FORWARD }).apCost, 3);
  assert.equal(bunny.ap, 0);

  const engine2 = new GameEngine();
  engine2.team.shelter = 1;
  const bunny2 = place(engine2, ROLES.BUNNY, 4, 2, 'S');
  const result = engine2.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(result.apCost, 1);
  assert.equal(bunny2.ap, 2);
  assert.equal(engine2.team.shelter, 0, '庇护罩化解绳网后消耗一层');
});

test('踩到小动物自动抱起，超出负重上限则抱不动', () => {
  const engine = new GameEngine();
  // 小兔（上限 1）走到小刺猬 (1,1)
  const bunny = place(engine, ROLES.BUNNY, 1, 2, 'N');
  engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.deepEqual(bunny.carrying, ['hedgehog']);
  assert.equal(engine.animalById('hedgehog').state, 'carried');

  // 再去踩小松鼠 (3,2) —— 已满，抱不下
  place(engine, ROLES.BUNNY, 3, 1, 'S');
  bunny.ap = 3;
  const result = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
  assert.equal(result.ok, true);
  assert.equal(bunny.carrying.length, 1, '小兔最多只能抱 1 只');
  assert.ok(result.events.some((e) => e.type === 'carry_full'));
  assert.equal(engine.animalById('squirrel').state, 'wild');
});

test('小熊可以同时抱 2 只小动物', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 1, 2, 'N');
  bear.ap = 9;
  engine.act(ROLES.BEAR, { type: ACTION.FORWARD }); // (1,1) 小刺猬
  assert.deepEqual(bear.carrying, ['hedgehog']);
  place(engine, ROLES.BEAR, 3, 1, 'S');
  engine.act(ROLES.BEAR, { type: ACTION.FORWARD }); // (3,2) 小松鼠
  assert.deepEqual(bear.carrying, ['hedgehog', 'squirrel']);
  assert.equal(bear.carrying.length, bear.carryLimit);
});

test('把小动物带回 (4,4) 自动救回并奖励勇气', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 3, 4, 'E');
  bear.carrying = ['hedgehog', 'squirrel'];
  for (const id of bear.carrying) { engine.animalById(id).state = 'carried'; engine.animalById(id).carriedBy = ROLES.BEAR; }
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

  // 三个礼盒都在花园中部，从西边一步走进去（避开迷宫周界树篱）
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
  engine.setReady(ROLES.BEAR); engine.setReady(ROLES.BUNNY);
  assert.equal(engine.players[ROLES.BUNNY].paused, true);
  assert.equal(engine.players[ROLES.BUNNY].ap, 0, '被恶作剧的角色下回合 0 步');
  assert.equal(engine.players[ROLES.BEAR].ap, 2);
});

test('🤝 Give：相邻可递交，0 步；距离过远或对方满载则拒绝', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 3, 4, 'E');
  const bunny = place(engine, ROLES.BUNNY, 3, 5, 'N'); // 曼哈顿距离 1
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
  place(engine, ROLES.BUNNY, 3, 5, 'N');
  assert.equal(engine.act(ROLES.BEAR, { type: ACTION.GIVE }).reason, REJECT.NOTHING_TO_GIVE);
});

test('🤝 Give：队友站在家里时直接救回并加勇气', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 4, 5, 'N');
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

test('🏡 Support：只能在家中做，消耗 1 步，庇护上限 2 层', () => {
  const engine = new GameEngine();
  const bunny = place(engine, ROLES.BUNNY, 3, 4, 'E');
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
  engine.setReady(ROLES.BEAR); engine.setReady(ROLES.BUNNY);
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

test('天气：每 2 个共同回合结算一次雷雨', () => {
  const engine = new GameEngine();
  const advance = () => { engine.setReady(ROLES.BEAR); return engine.setReady(ROLES.BUNNY); };

  const r1 = advance(); // 结束第 1 回合 → 无风暴
  assert.equal(r1.events.some((e) => e.type === 'storm'), false);
  assert.equal(engine.round, 2);

  const r2 = advance(); // 结束第 2 回合 → 风暴
  assert.equal(r2.events.some((e) => e.type === 'storm'), true);
  assert.equal(engine.round, 3);

  const r3 = advance();
  assert.equal(r3.events.some((e) => e.type === 'storm'), false);
  const r4 = advance();
  assert.equal(r4.events.some((e) => e.type === 'storm'), true);
});

test('雷雨：有庇护罩则抵消一层；无庇护则怀里的小动物受惊落地且扣勇气', () => {
  const sheltered = new GameEngine();
  sheltered.team.shelter = 2;
  sheltered.players[ROLES.BEAR].carrying = ['fox'];
  sheltered.animalById('fox').state = 'carried';
  sheltered.setReady(ROLES.BEAR); sheltered.setReady(ROLES.BUNNY); // 第 1 回合结束
  sheltered.setReady(ROLES.BEAR); sheltered.setReady(ROLES.BUNNY); // 第 2 回合结束 → 风暴
  assert.equal(sheltered.team.shelter, 1);
  assert.deepEqual(sheltered.players[ROLES.BEAR].carrying, ['fox'], '庇护罩护住了怀里的小动物');

  const exposed = new GameEngine();
  const bear = exposed.players[ROLES.BEAR];
  bear.carrying = ['fox'];
  exposed.animalById('fox').state = 'carried';
  exposed.animalById('fox').carriedBy = ROLES.BEAR;
  const courageBefore = exposed.team.courage;
  exposed.setReady(ROLES.BEAR); exposed.setReady(ROLES.BUNNY);
  exposed.setReady(ROLES.BEAR); exposed.setReady(ROLES.BUNNY);
  assert.equal(exposed.players[ROLES.BEAR].carrying.length, 0);
  assert.equal(exposed.animalById('fox').state, 'wild');
  assert.deepEqual(
    { x: exposed.animalById('fox').x, y: exposed.animalById('fox').y },
    { x: bear.x, y: bear.y },
    '受惊的小动物就落在原地，可以重新抱起',
  );
  assert.equal(exposed.team.courage, courageBefore - 1);
});

test('14 个共同回合用尽判负，且不会推进到第 15 回合', () => {
  const engine = new GameEngine();
  for (let i = 0; i < MAX_ROUNDS; i += 1) {
    engine.setReady(ROLES.BEAR);
    engine.setReady(ROLES.BUNNY);
  }
  assert.equal(engine.round, MAX_ROUNDS);
  assert.equal(engine.status, STATUS.LOST);
  assert.equal(engine.act(ROLES.BEAR, { type: ACTION.TURN_LEFT }).reason, REJECT.GAME_OVER);
  assert.equal(engine.setReady(ROLES.BEAR).ok, false);
});

test('8 只全部救回立即判胜', () => {
  const engine = new GameEngine();
  const bear = place(engine, ROLES.BEAR, 4, 5, 'N');
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
  assert.equal(snapshot.grid.length, 9);
  assert.ok(Array.isArray(snapshot.walls) && snapshot.walls.length > 0);
  assert.equal(snapshot.animals.length, TOTAL_ANIMALS);
  assert.equal(snapshot.gifts.length, TOTAL_GIFTS);
  assert.equal(snapshot.gifts.every((g) => g.kind === null), true, '未打开的礼盒不泄露内容');
  assert.deepEqual(Object.keys(snapshot.players).sort(), ['bear', 'bunny']);
  assert.ok(Array.isArray(snapshot.players.bear.openDirs));
  assert.equal(typeof snapshot.visibility.visible, 'boolean');
  assert.equal(snapshot.team.totalAnimals, TOTAL_ANIMALS);
});

test('reset 重开一局会恢复初始状态', () => {
  const engine = new GameEngine();
  engine.team.courage = 99;
  engine.setReady(ROLES.BEAR); engine.setReady(ROLES.BUNNY);
  engine.reset();
  assert.equal(engine.round, 1);
  assert.equal(engine.team.courage, START_COURAGE);
  assert.equal(engine.rescuedCount(), 0);
  assert.equal(engine.players[ROLES.BUNNY].x, 5);
});
