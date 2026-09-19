// Naomi《小动物回家》9×9 网格世界 — 作者: Codex (GLM 5.3 Max)
'use strict';

const SIZE = 9;
const HOME = { x: 4, y: 4 };

const TERRAIN_COST = {
  grass: 1,
  forest: 2,
  net: 3,
  stone: Infinity,
  hedge: Infinity,
};

// 东北角 4×4 树篱迷宫 (x:5..8, y:0..3)
// H=树篱, .=花廊草地。入口(5,3) → 内部 → 花亭(7,1) → 出口(8,3)，含 2 个浅死胡同。
const HEDGE_PATTERN = [
  '.H.H',
  '...H',
  '.H.H',
  '.H..',
];

function buildGrid() {
  const grid = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [];
    for (let x = 0; x < SIZE; x++) row.push('grass');
    grid.push(row);
  }
  const forestSpots = [[1,1],[2,1],[6,6],[7,6],[1,6],[3,3],[5,5],[2,7]];
  const stoneSpots = [[0,3],[3,0],[8,5],[5,8],[0,8],[8,8],[3,6],[6,3]];
  const netSpots = [[2,4],[6,4],[4,1],[4,7]];
  for (const [x, y] of forestSpots) grid[y][x] = 'forest';
  for (const [x, y] of stoneSpots) grid[y][x] = 'stone';
  for (const [x, y] of netSpots) grid[y][x] = 'net';

  for (let dy = 0; dy < 4; dy++) {
    for (let dx = 0; dx < 4; dx++) {
      const ch = HEDGE_PATTERN[dy][dx];
      grid[dy][5 + dx] = ch === 'H' ? 'hedge' : 'grass';
    }
  }
  grid[HOME.y][HOME.x] = 'grass';
  return grid;
}

const GRID = buildGrid();

function inBounds(x, y) {
  return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

function terrainAt(x, y) {
  if (!inBounds(x, y)) return 'wall';
  return GRID[y][x];
}

function costAt(x, y) {
  return TERRAIN_COST[terrainAt(x, y)] ?? Infinity;
}

function reachable(sx, sy) {
  const seen = new Set([`${sx},${sy}`]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [nx, ny] of neighbors(x, y)) {
      const k = `${nx},${ny}`;
      if (!seen.has(k)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen;
}

function neighbors(x, y) {
  const out = [];
  for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
    const nx = x + dx, ny = y + dy;
    if (inBounds(nx, ny) && costAt(nx, ny) !== Infinity) out.push([nx, ny]);
  }
  return out;
}

module.exports = {
  SIZE, HOME, TERRAIN_COST, GRID,
  terrainAt, costAt, inBounds, neighbors, reachable,
};
