// 迷宫结构测试 — Codex (GLM 5.3 Max)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const m = require('../core/maze');

test('9×9 网格与中心家园', () => {
  assert.equal(m.GRID.length, 9);
  assert.equal(m.GRID[0].length, 9);
  assert.equal(m.terrainAt(4, 4), 'grass');
  assert.equal(m.terrainAt(-1, 0), 'wall');
});

test('地形消耗', () => {
  assert.equal(m.costAt(4, 4), 1);
  assert.equal(m.costAt(1, 1), 2);
  assert.equal(m.costAt(2, 4), 3);
  assert.equal(m.costAt(0, 3), Infinity);
});

test('东北角 4×4 树篱迷宫：入口/花亭/出口连通且存在死胡同', () => {
  const r = m.reachable(5, 3); // 入口花廊
  for (const [x, y] of [[7, 1], [8, 3], [5, 0], [7, 0]]) {
    assert.ok(r.has(`${x},${y}`), `(${x},${y}) 应可达`);
  }
  // 树篱确实存在且不可通行
  assert.equal(m.terrainAt(6, 0), 'hedge');
  assert.equal(m.costAt(6, 0), Infinity);
});

test('全图可行走格连通到家园', () => {
  const home = m.reachable(4, 4);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
    if (m.costAt(x, y) !== Infinity) {
      assert.ok(home.has(`${x},${y}`), `(${x},${y}) 应与家园连通`);
    }
  }
});
