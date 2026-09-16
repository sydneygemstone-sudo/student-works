/**
 * tests/maze.test.js — 创意 2：东北角 4×4 树篱迷宫的结构与玩法测试。
 * Author: Claude Code (Claude Opus)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHedgeWalls, hasHedge, solveMaze, findDeadEnds, mazeCells, hedgeSegments, inMaze,
  MAZE_ENTRANCE, MAZE_EXIT, MAZE_GAZEBO, MAZE_DEAD_ENDS, MAZE_PASSAGES,
} from '../core/maze.js';
import { MAZE_REGION, DIRECTIONS, DIR_VECTOR, DIR_OPPOSITE, ROLES, ACTION, REJECT, BLOCKER } from '../core/constants.js';
import { GameEngine } from '../core/game.js';
import { buildWorld, probeStep } from '../core/world.js';

const walls = buildHedgeWalls();

/** 转向到指定方向后前进一步。 */
function step(engine, role, dir, ap = 9) {
  const player = engine.players[role];
  player.facing = dir;
  player.ap = Math.max(player.ap, ap);
  return engine.act(role, { type: ACTION.FORWARD });
}

test('迷宫正好占据东北角 x:5~8 / y:0~3 的 16 格', () => {
  assert.deepEqual(MAZE_REGION, { x0: 5, x1: 8, y0: 0, y1: 3 });
  const cells = mazeCells();
  assert.equal(cells.length, 16);
  for (const c of cells) {
    assert.ok(inMaze(c.x, c.y));
    assert.ok(c.x >= 5 && c.x <= 8 && c.y >= 0 && c.y <= 3);
  }
  assert.equal(inMaze(4, 0), false);
  assert.equal(inMaze(5, 4), false);
});

test('每一道树篱都在两侧对称登记，双向都挡得住', () => {
  for (const key of walls) {
    const [xs, ys, dir] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const v = DIR_VECTOR[dir];
    const nx = x + v.dx;
    const ny = y + v.dy;
    if (nx < 0 || ny < 0 || nx > 8 || ny > 8) continue;
    assert.ok(hasHedge(walls, nx, ny, DIR_OPPOSITE[dir]), `(${x},${y},${dir}) 的反面缺少登记`);
  }
});

test('迷宫外墙只留入口花廊与出口拱门两个开口', () => {
  const openings = [];
  for (const cell of mazeCells()) {
    for (const dir of DIRECTIONS) {
      const v = DIR_VECTOR[dir];
      const nx = cell.x + v.dx;
      const ny = cell.y + v.dy;
      if (nx < 0 || ny < 0 || nx > 8 || ny > 8) continue; // 世界外墙
      if (inMaze(nx, ny)) continue; // 内部边
      if (!hasHedge(walls, cell.x, cell.y, dir)) openings.push({ ...cell, dir });
    }
  }
  assert.equal(openings.length, 2, '周界必须只有 2 个开口');
  assert.ok(openings.some((o) => o.x === MAZE_ENTRANCE.x && o.y === MAZE_ENTRANCE.y && o.dir === MAZE_ENTRANCE.dir), '缺少入口花廊');
  assert.ok(openings.some((o) => o.x === MAZE_EXIT.x && o.y === MAZE_EXIT.y && o.dir === MAZE_EXIT.dir), '缺少出口拱门');
});

test('存在一条从入口花廊经核心花亭到出口拱门的无阻挡正确通路', () => {
  const toGazebo = solveMaze(walls, MAZE_ENTRANCE.outside, MAZE_GAZEBO);
  assert.ok(toGazebo, '入口必须能走到花亭');
  assert.deepEqual(toGazebo[0], { x: 5, y: 4 });
  assert.deepEqual(toGazebo.at(-1), { x: MAZE_GAZEBO.x, y: MAZE_GAZEBO.y });
  assert.deepEqual(toGazebo, [
    { x: 5, y: 4 }, { x: 5, y: 3 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 7, y: 2 }, { x: 7, y: 1 },
  ]);

  const toExit = solveMaze(walls, MAZE_GAZEBO, MAZE_EXIT.outside);
  assert.ok(toExit, '花亭必须能走到出口拱门');
  assert.deepEqual(toExit.at(-1), { x: 4, y: 0 });
});

test('迷宫 16 格全部连通（没有永远进不去的死区）', () => {
  for (const cell of mazeCells()) {
    const path = solveMaze(walls, MAZE_ENTRANCE.outside, cell);
    assert.ok(path, `(${cell.x},${cell.y}) 应当可以从入口走到`);
  }
});

test('迷宫里正好有 2 个浅死胡同，位置与设计一致', () => {
  const deadEnds = findDeadEnds(walls);
  assert.equal(deadEnds.length, 2);
  const keys = deadEnds.map((c) => `${c.x},${c.y}`).sort();
  assert.deepEqual(keys, MAZE_DEAD_ENDS.map((c) => `${c.x},${c.y}`).sort());
  // 「浅」= 从死胡同往回走，最多 2 步就能回到岔路口
  const degree = (x, y) => DIRECTIONS.filter((dir) => {
    const v = DIR_VECTOR[dir];
    const nx = x + v.dx;
    const ny = y + v.dy;
    return nx >= 0 && ny >= 0 && nx <= 8 && ny <= 8 && !hasHedge(walls, x, y, dir);
  }).length;

  for (const dead of MAZE_DEAD_ENDS) {
    let cur = { x: dead.x, y: dead.y };
    let prev = null;
    let depth = 0;
    while (degree(cur.x, cur.y) < 3 && depth < 10) {
      const next = DIRECTIONS
        .map((dir) => ({ dir, v: DIR_VECTOR[dir] }))
        .filter(({ dir, v }) => {
          const nx = cur.x + v.dx;
          const ny = cur.y + v.dy;
          return nx >= 0 && ny >= 0 && nx <= 8 && ny <= 8 && !hasHedge(walls, cur.x, cur.y, dir);
        })
        .map(({ v }) => ({ x: cur.x + v.dx, y: cur.y + v.dy }))
        .find((c) => !prev || c.x !== prev.x || c.y !== prev.y);
      if (!next) break;
      prev = cur;
      cur = next;
      depth += 1;
    }
    assert.ok(depth <= 2, `${dead.label} 距离岔路口 ${depth} 步，应当是浅死胡同`);
    assert.equal(depth, dead.depth, `${dead.label} 的深度应为 ${dead.depth}`);
  }
});

test('通道白名单本身合法：全部相邻、无重复', () => {
  const seen = new Set();
  for (const [[ax, ay], [bx, by]] of MAZE_PASSAGES) {
    const manhattan = Math.abs(ax - bx) + Math.abs(ay - by);
    assert.equal(manhattan, 1, `(${ax},${ay})-(${bx},${by}) 必须相邻`);
    assert.ok(inMaze(ax, ay) && inMaze(bx, by), '通道两端都必须在迷宫内');
    const key = [`${ax},${ay}`, `${bx},${by}`].sort().join('|');
    assert.ok(!seen.has(key), `通道 ${key} 重复定义`);
    seen.add(key);
  }
});

test('核心花亭守护着第 1 只小动物「小兔宝宝」', () => {
  const world = buildWorld();
  const baby = world.animals.find((a) => a.id === 'bunny_baby');
  assert.equal(baby.name, '小兔宝宝');
  assert.deepEqual({ x: baby.x, y: baby.y }, { x: MAZE_GAZEBO.x, y: MAZE_GAZEBO.y });
  assert.equal(world.animals.filter((a) => inMaze(a.x, a.y)).length, 1, '迷宫里只藏着小兔宝宝一只');
});

test('沿正确通路可以救出小兔宝宝，并从出口拱门离开', () => {
  const engine = new GameEngine();
  const bunny = engine.players[ROLES.BUNNY];
  assert.deepEqual({ x: bunny.x, y: bunny.y }, { x: 5, y: 4 }, '小兔就站在入口花廊外');

  for (const dir of ['N', 'E', 'N', 'E', 'N']) {
    const result = step(engine, ROLES.BUNNY, dir);
    assert.equal(result.ok, true, `沿正确通路走 ${dir} 不应被挡`);
  }
  assert.deepEqual({ x: bunny.x, y: bunny.y }, { x: 7, y: 1 });
  assert.deepEqual(bunny.carrying, ['bunny_baby'], '走到花亭自动抱起小兔宝宝');

  for (const dir of ['N', 'W', 'W', 'W']) {
    assert.equal(step(engine, ROLES.BUNNY, dir).ok, true, `出口方向 ${dir} 应当畅通`);
  }
  assert.deepEqual({ x: bunny.x, y: bunny.y }, { x: 4, y: 0 }, '从出口拱门走出迷宫');
  assert.equal(inMaze(bunny.x, bunny.y), false);
});

test('走错路会撞树篱：不扣行动点、不穿墙、给出退路箭头', () => {
  const engine = new GameEngine();
  const bunny = engine.players[ROLES.BUNNY];
  step(engine, ROLES.BUNNY, 'N'); // 进入迷宫 (5,3)
  step(engine, ROLES.BUNNY, 'N'); // 一直往北 → 走进入口旁的浅死胡同 (5,2)
  assert.deepEqual({ x: bunny.x, y: bunny.y }, { x: 5, y: 2 });
  bunny.ap = 3;

  const wrong = step(engine, ROLES.BUNNY, 'N', 3); // 死胡同尽头是树篱
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, REJECT.BLOCKED);
  assert.equal(wrong.blocker, BLOCKER.HEDGE);
  assert.equal(bunny.ap, 3, '撞树篱不扣行动点');
  assert.deepEqual({ x: bunny.x, y: bunny.y }, { x: 5, y: 2 }, '不穿墙');
  assert.equal(wrong.hint.retreatDir, 'S');
  assert.deepEqual(wrong.hint.alternatives, ['S'], '死胡同里唯一的出路就是原路返回');

  // 死胡同的东西两侧同样是树篱
  for (const dir of ['E', 'W']) {
    const blocked = step(engine, ROLES.BUNNY, dir, 3);
    assert.equal(blocked.reason, REJECT.BLOCKED);
    assert.equal(bunny.ap, 3);
  }
});

test('浅死胡同真的是死路：只有来路一个方向可走', () => {
  const world = buildWorld();
  for (const dead of MAZE_DEAD_ENDS) {
    const open = DIRECTIONS.filter((dir) => !probeStep(world, dead.x, dead.y, dir).blocked);
    assert.equal(open.length, 1, `${dead.label} 只能原路返回`);
  }
});

test('迷宫外的格子无法直接横穿树篱进入迷宫', () => {
  const world = buildWorld();
  const illegal = [];
  for (let y = 0; y <= 4; y += 1) {
    for (let x = 4; x <= 8; x += 1) {
      if (inMaze(x, y)) continue;
      for (const dir of DIRECTIONS) {
        const v = DIR_VECTOR[dir];
        if (!inMaze(x + v.dx, y + v.dy)) continue;
        if (!probeStep(world, x, y, dir).blocked) illegal.push(`(${x},${y})→${dir}`);
      }
    }
  }
  assert.deepEqual(illegal.sort(), ['(4,0)→E', '(5,4)→N'], '只能从出口拱门与入口花廊进出');
});

test('hedgeSegments 为 3D 渲染输出去重后的墙体', () => {
  const segments = hedgeSegments(walls);
  const keys = new Set(segments.map((s) => `${s.cx},${s.cy}`));
  assert.equal(keys.size, segments.length, '同一道墙不能输出两次');
  assert.ok(segments.length >= 12, '迷宫应当有足够多的墙体');
  for (const s of segments) {
    assert.equal(typeof s.horizontal, 'boolean');
    assert.ok(Number.isFinite(s.cx) && Number.isFinite(s.cy));
  }
});
