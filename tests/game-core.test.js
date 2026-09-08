const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../game-core.js');

function pet(id, x, y, carriedBy = null) {
  return { id, emoji: '🐱', name: '测试小猫', x, y, carriedBy, home: false };
}

// 内存规则场景；不代表浏览器真实操作或儿童体验验收。
function fixture() {
  const g = game.newGame({ seed: 12, config: { STORM_STEPS: 1000, SCARE_EVERY: 1000 } });
  g.terrain = [];
  g.gifts = [];
  g.pets = [pet(90, 0, 0)];
  g.energy = 0;
  g.shield = 0;
  return g;
}

const key = p => `${p.x},${p.y}`;
const hasMove = (g, x, y) => game.legalMoves(g).some(p => p.x === x && p.y === y);

test('200个seed：家、动物和礼物可达，地形不占家或重复格子', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const g = game.newGame({ seed });
    assert.equal(g.pets.length, g.cfg.PETS, `seed ${seed} 宠物数量`);
    assert.ok(g.terrain.length > 0, `seed ${seed} 有地形`);
    assert.equal(new Set(g.terrain.map(key)).size, g.terrain.length, `seed ${seed} 地形重叠`);
    assert.ok(!g.terrain.some(t => key(t) === key(g.home)), `seed ${seed} 家无地形`);
    const rocks = new Set(g.terrain.filter(t => t.type === 'rock').map(key));
    const reached = new Set([key(g.home)]);
    const pending = [g.home];
    while (pending.length) {
      const p = pending.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = { x: p.x + dx, y: p.y + dy };
        if (next.x < 0 || next.y < 0 || next.x >= g.n || next.y >= g.n || rocks.has(key(next)) || reached.has(key(next))) continue;
        reached.add(key(next));
        pending.push(next);
      }
    }
    for (const target of [...g.pets, ...g.gifts]) {
      assert.ok(reached.has(key(target)), `seed ${seed} 目标 ${key(target)} 可达`);
    }
  }
});

test('相同seed复现地形、礼物和动物，礼物包含能量与炸弹', () => {
  const a = game.newGame({ seed: 713 });
  const b = game.newGame({ seed: 713 });
  for (const field of ['terrain', 'gifts', 'pets']) assert.deepEqual(a[field], b[field]);
  assert.deepEqual([...new Set(a.gifts.map(g => g.kind))].sort(), ['bomb', 'energy']);
  assert.ok(a.gifts.every(g => !g.opened));
});

test('石头/越界不可走；拒绝移动不扣步数、不改变位置', () => {
  const g = fixture();
  const p = game.cur(g);
  g.terrain = [{ x: 4, y: 3, type: 'rock' }];
  assert.equal(game.moveCost(g, 4, 3), Infinity);
  assert.equal(game.moveCost(g, -1, 3), Infinity);
  assert.equal(hasMove(g, 4, 3), false);
  const before = { x: p.x, y: p.y, ap: p.ap, turn: g.turn };
  assert.equal(game.move(g, 4, 3), false);
  assert.equal(game.move(g, -1, 3), false);
  assert.deepEqual({ x: p.x, y: p.y, ap: p.ap, turn: g.turn }, before);
});

test('森林消耗2步；仅剩1步时不能进入森林', () => {
  const g = fixture();
  const p = game.cur(g);
  g.terrain = [{ x: 4, y: 3, type: 'forest' }];
  assert.equal(game.moveCost(g, 4, 3), 2);
  assert.equal(game.moveCost(g, 2, 3), 1);
  p.ap = 1;
  assert.equal(hasMove(g, 4, 3), false);
  assert.equal(game.move(g, 4, 3), false);
  p.ap = 3;
  assert.equal(game.move(g, 4, 3), true);
  assert.equal(p.ap, 1);
  assert.equal(g.current, 0);
});

test('抱起动物不直接奖励，真正送回才奖励2能量且只算一次', () => {
  const g = fixture();
  g.pets.push(pet(1, 4, 3));
  const p = game.cur(g);
  assert.equal(game.move(g, 4, 3), true);
  assert.equal(game.carried(g, p.id).length, 1);
  assert.equal(g.energy, 0);
  assert.equal(game.move(g, 3, 3), true);
  assert.equal(g.pets[1].home, true);
  assert.equal(g.pets[1].carriedBy, null);
  assert.equal(g.energy, 2);
  assert.equal(game.move(g, 4, 3), true);
  assert.equal(game.move(g, 3, 3), true);
  assert.equal(g.energy, 2);
});

test('同次送回两只均记救援，能量最多6', () => {
  const g = fixture();
  const p = game.cur(g);
  p.x = 4;
  g.energy = 5;
  g.pets.push(pet(1, 4, 3, p.id), pet(2, 4, 3, p.id));
  assert.equal(game.move(g, 3, 3), true);
  assert.equal(g.pets.filter(p => p.home).length, 2);
  assert.equal(g.energy, 6);
});

test('能量加步花2能量，每回合仅一次，不改变角色基础步数', () => {
  const g = fixture();
  const p = game.cur(g);
  g.energy = 1;
  assert.equal(game.canBoost(g), false);
  assert.equal(game.boost(g), false);
  g.energy = 6;
  assert.equal(game.boost(g), true);
  assert.equal(g.energy, 4);
  assert.equal(p.ap, 4);
  assert.equal(p.moves, 2);
  assert.equal(p.boosted, true);
  assert.equal(game.canBoost(g), false);
  assert.equal(game.boost(g), false);
  assert.equal(g.energy, 4);
  game.endTurn(g);
  assert.equal(game.boost(g), true);
  assert.equal(game.cur(g).ap, 5);
  assert.equal(game.cur(g).moves, 3);
  game.endTurn(g);
  assert.equal(game.cur(g).id, p.id);
  assert.equal(p.boosted, false);
  assert.equal(p.ap, 2);
  assert.equal(game.canBoost(g), true);
});

test('能量礼物仅触发一次，能量仍受6点上限限制', () => {
  const g = fixture();
  const p = game.cur(g);
  g.gifts = [{ id: 1, x: 4, y: 3, opened: false, kind: 'energy' }];
  g.energy = 5;
  p.ap = 4;
  assert.equal(game.move(g, 4, 3), true);
  assert.equal(g.energy, 6);
  assert.equal(g.gifts[0].opened, true);
  g.energy = 0;
  game.move(g, 3, 3);
  game.move(g, 4, 3);
  assert.equal(g.energy, 0);
});

test('炸弹在下次轮到时暂停一次，暂停也计风暴，再次轮到恢复行动', () => {
  const g = fixture();
  const bear = game.cur(g);
  g.gifts = [{ id: 1, x: 4, y: 3, opened: false, kind: 'bomb' }];
  const petsBefore = structuredClone(g.pets);
  assert.equal(game.move(g, 4, 3), true);
  assert.equal(bear.skipTurns, 1);
  assert.equal(g.gifts[0].opened, true);
  assert.equal(g.current, 0, '打开礼物不立即剥夺本次剩余动作');
  assert.deepEqual(g.pets, petsBefore, '炸弹不伤害动物');
  game.endTurn(g);
  assert.equal(g.current, 1);
  game.endTurn(g);
  assert.equal(g.current, 1, '小熊的暂停被自动消费，轮到小兔');
  assert.equal(bear.skipTurns, 0);
  assert.equal(g.turn, 3);
  assert.equal(g.storm, 3);
  game.endTurn(g);
  assert.equal(g.current, 0);
  assert.equal(bear.ap, bear.moves);
  game.move(g, 3, 3);
  game.move(g, 4, 3);
  assert.equal(bear.skipTurns, 0, '已开过的炸弹不会再次触发');
});

test('双方均待暂停时仍能自动消费，不无限交接或死锁', () => {
  const g = fixture();
  for (const p of g.players) p.skipTurns = 1;
  assert.equal(game.endTurn(g), true);
  assert.equal(g.turn, 3);
  assert.equal(g.storm, 3);
  assert.equal(g.current, 1);
  assert.ok(g.players.every(p => p.skipTurns === 0));
  assert.ok(game.legalMoves(g).length > 0);
});

test('第6回合绳网只减下个行动者本次1步，下次恢复正常', () => {
  const g = fixture();
  g.turn = g.storm = 5;
  game.endTurn(g);
  const bunny = game.cur(g);
  assert.equal(g.current, 1);
  assert.equal(bunny.snared, true);
  assert.equal(bunny.ap, Math.max(1, bunny.moves - 1));
  game.endTurn(g);
  game.endTurn(g);
  assert.equal(game.cur(g), bunny);
  assert.equal(bunny.snared, false);
  assert.equal(bunny.ap, bunny.moves);
});

test('绳网至少留1步；遇暂停角色会落在真正行动者身上', () => {
  const g = fixture();
  g.turn = g.storm = 5;
  g.players[1].skipTurns = 1;
  g.players[0].moves = 1;
  game.endTurn(g);
  assert.equal(g.current, 0);
  assert.equal(game.cur(g).snared, true);
  assert.equal(game.cur(g).ap, 1);
  assert.equal(g.turn, 7);
});

test('在家守护花1步获1层庇护，每回合一次；离家、无步或满层不可守护', () => {
  const g = fixture();
  const p = game.cur(g);
  assert.equal(game.canSupport(g), true);
  assert.equal(game.support(g), true);
  assert.equal(g.shield, 1);
  assert.equal(p.ap, 1);
  assert.equal(p.supported, true);
  assert.equal(game.canSupport(g), false);
  assert.equal(game.support(g), false);
  assert.equal(p.ap, 1);
  game.endTurn(g);
  assert.equal(game.support(g), true);
  assert.equal(g.shield, 2);
  game.endTurn(g);
  assert.equal(p.supported, false);
  assert.equal(game.canSupport(g), false, '庇护最高2层');
  g.shield = 0;
  p.x = 4;
  assert.equal(game.canSupport(g), false);
  p.x = 3;
  p.ap = 0;
  assert.equal(game.canSupport(g), false);
});

test('庇护抵消一次绳网并消费1层，未被网住的角色步数正常', () => {
  const g = fixture();
  g.shield = 2;
  g.turn = g.storm = 5;
  game.endTurn(g);
  assert.equal(g.shield, 1);
  assert.equal(game.cur(g).snared, false);
  assert.equal(game.cur(g).ap, game.cur(g).moves);
});

test('庇护抵消雷雨并消费1层，耗尽后下次雷雨会惊动动物', () => {
  const g = fixture();
  g.cfg.SCARE_EVERY = 4;
  g.shield = 1;
  g.turn = g.storm = 3;
  const before = { x: g.pets[0].x, y: g.pets[0].y };
  game.endTurn(g);
  assert.equal(g.shield, 0);
  assert.deepEqual({ x: g.pets[0].x, y: g.pets[0].y }, before);
  g.turn = g.storm = 7;
  game.endTurn(g);
  assert.notDeepEqual({ x: g.pets[0].x, y: g.pets[0].y }, before);
});

test('交接需要相邻和空位；交给家中队友立即救回并奖励', () => {
  const g = fixture();
  const bear = game.cur(g);
  bear.x = 5;
  g.pets.push(pet(1, 5, 3, bear.id));
  assert.equal(game.canGive(g), false);
  assert.equal(game.give(g), false);
  bear.x = 4;
  const bunny = game.mate(g);
  bunny.x = 4;
  bunny.y = 4;
  g.pets.push(pet(2, 4, 4, bunny.id));
  assert.equal(game.canGive(g), false, '小兔最多抱1只');
  g.pets.pop();
  bunny.x = 3;
  bunny.y = 3;
  assert.equal(game.canGive(g), true);
  assert.equal(game.give(g), true);
  assert.equal(g.pets[1].home, true);
  assert.equal(g.pets[1].carriedBy, null);
  assert.equal(g.energy, 2);
  assert.equal(game.give(g), false);
  assert.equal(g.energy, 2);
});

test('最终动物到家立即胜利，终局不再推进回合或消费资源', () => {
  const g = fixture();
  const p = game.cur(g);
  p.x = 4;
  p.ap = 1;
  g.pets = [pet(1, 4, 3, p.id)];
  g.energy = 4;
  assert.equal(game.move(g, 3, 3), true);
  assert.equal(g.status, 'win');
  assert.equal(g.turn, 0, '最后一步救回优先于自动结束回合');
  const before = { energy: g.energy, shield: g.shield, turn: g.turn, storm: g.storm, log: [...g.log] };
  assert.equal(game.endTurn(g), false);
  assert.equal(game.boost(g), false);
  assert.equal(game.support(g), false);
  assert.equal(game.give(g), false);
  assert.equal(game.move(g, 4, 3), false);
  assert.deepEqual(game.legalMoves(g), []);
  assert.deepEqual({ energy: g.energy, shield: g.shield, turn: g.turn, storm: g.storm, log: [...g.log] }, before);
});

test('风暴到达阈值时判负，暂停自动推进同样会触发终局', () => {
  const g = fixture();
  g.cfg.STORM_STEPS = 2;
  g.players[1].skipTurns = 1;
  assert.equal(game.endTurn(g), true);
  assert.equal(g.storm, 2);
  assert.equal(g.status, 'lose');
  const logLength = g.log.length;
  assert.equal(game.endTurn(g), false);
  assert.equal(g.log.length, logLength);
  assert.deepEqual(game.legalMoves(g), []);
});

test('重新开始重置资源、暂停、绳网和结果；旧局修改不污染新局', () => {
  const old = game.newGame({ seed: 55 });
  old.energy = 6;
  old.shield = 2;
  old.status = 'lose';
  old.turn = old.storm = 32;
  old.pets[0].home = true;
  old.gifts[0].opened = true;
  Object.assign(old.players[0], { boosted: true, supported: true, skipTurns: 1, snared: true, ap: 0 });
  const fresh = game.newGame({ seed: 55, names: ['Naomi', 'Dean'] });
  assert.equal(fresh.status, 'playing');
  for (const field of ['energy', 'shield', 'turn', 'storm', 'current']) assert.equal(fresh[field], 0, field);
  assert.deepEqual(fresh.players.map(p => p.name), ['Naomi', 'Dean']);
  for (const p of fresh.players) {
    assert.equal(p.ap, p.moves);
    assert.equal(p.boosted, false);
    assert.equal(p.supported, false);
    assert.equal(p.skipTurns, 0);
    assert.equal(p.snared, false);
  }
  assert.ok(fresh.pets.every(p => !p.home && p.carriedBy === null));
  assert.ok(fresh.gifts.every(g => !g.opened));
  old.terrain[0].type = 'obsolete';
  assert.ok(fresh.terrain.every(t => t.type === 'rock' || t.type === 'forest'));
});
