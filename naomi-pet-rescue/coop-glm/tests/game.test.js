// 核心规则测试 — Codex (GLM 5.3 Max)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const g = require('../core/game');

test('角色属性与初始行动点', () => {
  const s = g.createGame();
  assert.equal(s.players.bear.ap, 2);
  assert.equal(s.players.bunny.ap, 3);
  assert.equal(g.ROLES.bear.carry, 2);
  assert.equal(g.ROLES.bunny.carry, 1);
});

test('转向 0 消耗，前进按地形扣点', () => {
  const s = g.createGame();
  const r0 = g.turn(s, 'bear', 'right');
  assert.ok(r0.ok);
  assert.equal(s.players.bear.ap, 2); // 转向不扣
  s.players.bear.x = 4; s.players.bear.y = 4; s.players.bear.dir = 'N';
  const r1 = g.move(s, 'bear', true); // (4,3) 草地
  assert.ok(r1.ok);
  assert.equal(s.players.bear.ap, 1);
});

test('创意1：撞石头/树篱不扣点不穿墙，返回后退提示', () => {
  const s = g.createGame();
  const b = s.players.bear;
  b.x = 0; b.y = 2; b.dir = 'N'; // (0,1) 森林, (0,3) 石头在南
  const before = { x: b.x, y: b.y, ap: b.ap };
  const r = g.move(s, 'bear', false); // 后退进 (0,3) 石头
  assert.ok(!r.ok);
  assert.ok(r.blocked);
  assert.equal(r.arrow, 'back-or-turn');
  assert.match(r.message, /前方挡路/);
  assert.equal(b.x, before.x); assert.equal(b.y, before.y); assert.equal(b.ap, before.ap);
});

test('行动点不足拒绝移动且不扣点', () => {
  const s = g.createGame();
  const b = s.players.bear;
  b.x = 1; b.y = 1; b.dir = 'N'; b.ap = 1;
  const r = g.move(s, 'bear', true); // (1,0) 草地 cost1 OK
  assert.ok(r.ok);
  const r2 = g.move(s, 'bear', false); // 回森林 cost2, ap0
  assert.ok(!r2.ok);
  assert.equal(b.ap, 0);
});

test('进入动物格自动抱起，回家自动救回并奖励勇气', () => {
  const s = g.createGame();
  const p = s.players.bear;
  p.x = 1; p.y = 2; p.dir = 'S'; p.ap = 5;
  g.move(s, 'bear', true); // (1,3) 刺猬
  assert.deepEqual(p.carrying, ['a2']);
  p.x = 4; p.y = 5; p.dir = 'N'; p.ap = 5;
  g.move(s, 'bear', true); // 到家
  assert.equal(p.carrying.length, 0);
  assert.equal(s.animals.find(a => a.id === 'a2').carried, 'home');
  assert.equal(s.courage, 1);
});

test('递给队友：距离限制与在家直接救回', () => {
  const s = g.createGame();
  s.players.bear.x = 2; s.players.bear.y = 2; s.players.bear.carrying = ['a2'];
  s.players.bunny.x = 6; s.players.bunny.y = 6;
  assert.ok(!g.give(s, 'bear', 'bunny').ok);
  s.players.bunny.x = 2; s.players.bunny.y = 3;
  assert.ok(g.give(s, 'bear', 'bunny', 'a2').ok);
  assert.deepEqual(s.players.bunny.carrying, ['a2']);
  s.players.bear.carrying = ['a3'];
  s.players.bear.x = 4; s.players.bear.y = 5;
  s.players.bunny.x = 4; s.players.bunny.y = 4;
  assert.ok(g.give(s, 'bear', 'bunny', 'a3').ok);
  assert.equal(s.animals.find(a => a.id === 'a3').carried, 'home');
});

test('守护家园与勇气加步', () => {
  const s = g.createGame();
  assert.ok(!g.support(s, 'bear').ok);
  s.players.bear.x = 4; s.players.bear.y = 4;
  const r = g.support(s, 'bear');
  assert.ok(r.ok); assert.equal(s.shield, 1);
  s.courage = 3;
  assert.ok(g.boost(s).ok);
  assert.equal(s.courage, 1);
  assert.equal(s.players.bear.ap, 2 - 1 + 2);
  assert.equal(s.players.bunny.ap, 3 + 2);
});

test('共同回合：单方就绪不推进，双方就绪原子推进', () => {
  const s = g.createGame();
  g.setReady(s, 'bear', true);
  assert.equal(s.round, 1);
  g.setReady(s, 'bunny', true);
  assert.equal(s.round, 2);
  assert.equal(s.players.bear.ready, false);
  assert.equal(s.players.bear.ap, 2);
});

test('每 2 回合雷雨，无庇护掉落小动物', () => {
  const s = g.createGame();
  s.players.bunny.carrying = ['a3'];
  s.players.bunny.x = 6; s.players.bunny.y = 7;
  g.setReady(s, 'bear', true);
  g.setReady(s, 'bunny', true); // 回合2
  g.setReady(s, 'bear', true);
  g.setReady(s, 'bunny', true); // 回合3 → 雷雨
  assert.equal(s.weather, 'storm');
  assert.equal(s.players.bunny.carrying.length, 0);
  assert.equal(s.animals.find(a => a.id === 'a3').carried, null);
});

test('全救回胜利 / 回合用尽失败', () => {
  const s = g.createGame();
  for (const a of s.animals) { a.carried = 'home'; }
  s.players.bear.ready = true;
  g.setReady(s, 'bunny', true);
  assert.equal(s.phase, 'won');

  const s2 = g.createGame();
  s2.round = 14;
  g.setReady(s2, 'bear', true);
  g.setReady(s2, 'bunny', true);
  assert.equal(s2.phase, 'lost');
});

test('视线遮挡：森林/树篱阻隔看不见队友', () => {
  const s = g.createGame();
  s.players.bear.x = 1; s.players.bear.y = 2;
  s.players.bunny.x = 1; s.players.bunny.y = 0;
  assert.ok(!g.lineOfSight(s, 'bear', 'bunny')); // (1,1) 森林遮挡
  s.players.bunny.x = 1; s.players.bunny.y = 1;
  assert.ok(g.lineOfSight(s, 'bear', 'bunny')); // 直视无遮挡
  s.players.bunny.x = 8; s.players.bunny.y = 0;
  assert.ok(!g.lineOfSight(s, 'bear', 'bunny')); // 距离过远
});

test('礼盒：勇气与暂停', () => {
  const s = g.createGame();
  const p = s.players.bunny;
  p.x = 2; p.y = 3; p.dir = 'N'; p.ap = 5;
  g.move(s, 'bunny', true); // (2,2) 勇气礼盒
  assert.equal(s.courage, 2);
});
