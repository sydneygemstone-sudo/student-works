/**
 * tests/maze.test.js — 创意 2：两处树篱迷宫（北 6×6 玫瑰 / 南 5×5 薄荷）的结构与玩法测试。
 *
 * 这里刻意**不**锁死每一道通道的坐标：布局是种子生成的，锁死坐标会让
 * 以后微调旋钮时测试整片碎掉。锁死的是玩法契约 —— 开口数、连通性、
 * 死胡同数量、主解长度预算、进出规则。
 *
 * Author: Claude Code (Claude Opus)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHedgeWalls, hasHedge, solveMaze, findDeadEnds, mazeCells, hedgeSegments, inMaze,
  findGazebos, mazeOpenings, regionCells, MAZE_OPENINGS,
} from '../core/maze.js';
import {
  MAZE_REGIONS, GRID_SIZE, DIRECTIONS, DIR_VECTOR, DIR_OPPOSITE, ROLES, ACTION, REJECT, BLOCKER,
} from '../core/constants.js';
import { GameEngine } from '../core/game.js';
import { buildWorld, probeStep } from '../core/world.js';

const walls = buildHedgeWalls();
const gazebos = findGazebos(walls);

/** 把一条格子路径变成「转向 + 前进」的实际操作，沿途断言不被挡。 */
function walkPath(engine, role, path) {
  const player = engine.players[role];
  for (let i = 1; i < path.length; i += 1) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    const dir = DIRECTIONS.find((d) => DIR_VECTOR[d].dx === dx && DIR_VECTOR[d].dy === dy);
    player.facing = dir;
    player.ap = 9; // 测试夹具：只验证路通不通，不验证步数预算
    const result = engine.act(role, { type: ACTION.FORWARD });
    assert.equal(result.ok, true, `第 ${i} 步朝 ${dir} 走到 (${path[i].x},${path[i].y}) 不应被挡：${result.message ?? ''}`);
  }
}

test('两处迷宫区域大小正确，且互不重叠', () => {
  assert.equal(MAZE_REGIONS.length, 2);
  const north = MAZE_REGIONS.find((r) => r.id === 'north');
  const south = MAZE_REGIONS.find((r) => r.id === 'south');
  assert.equal(regionCells(north).length, 36, '玫瑰迷宫是 6×6');
  assert.equal(regionCells(south).length, 25, '薄荷迷宫是 5×5');
  assert.equal(mazeCells().length, 61);

  for (const cell of mazeCells()) assert.ok(inMaze(cell.x, cell.y));
  assert.equal(inMaze(7, 7), false, '家不在迷宫里');
  assert.equal(inMaze(8, 6), false);
});

test('每一道树篱都在两侧对称登记，双向都挡得住', () => {
  for (const key of walls) {
    const [xs, ys, dir] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const v = DIR_VECTOR[dir];
    const nx = x + v.dx;
    const ny = y + v.dy;
    if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
    assert.ok(hasHedge(walls, nx, ny, DIR_OPPOSITE[dir]), `(${x},${y},${dir}) 的反面缺少登记`);
  }
});

test('每处迷宫的外墙只留入口花廊与出口拱门两个开口', () => {
  for (const region of MAZE_REGIONS) {
    const spec = MAZE_OPENINGS[region.id];
    const openings = [];
    for (const cell of regionCells(region)) {
      for (const dir of DIRECTIONS) {
        const v = DIR_VECTOR[dir];
        const nx = cell.x + v.dx;
        const ny = cell.y + v.dy;
        if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue; // 世界外墙
        if (inMaze(nx, ny)) continue; // 内部边
        if (!hasHedge(walls, cell.x, cell.y, dir)) openings.push({ ...cell, dir });
      }
    }
    assert.equal(openings.length, 2, `${region.label}的周界必须只有 2 个开口`);
    assert.ok(
      openings.some((o) => o.x === spec.entrance.x && o.y === spec.entrance.y && o.dir === spec.entrance.dir),
      `${region.label}缺少入口花廊`,
    );
    assert.ok(
      openings.some((o) => o.x === spec.exit.x && o.y === spec.exit.y && o.dir === spec.exit.dir),
      `${region.label}缺少出口拱门`,
    );
  }
});

test('每处迷宫都有入口 → 花亭 → 出口的完整通路，长度在儿童可玩的预算内', () => {
  for (const region of MAZE_REGIONS) {
    const spec = MAZE_OPENINGS[region.id];
    const gazebo = gazebos[region.id];

    const toGazebo = solveMaze(walls, spec.entrance.outside, gazebo);
    assert.ok(toGazebo, `${region.label}：从入口必须能走到花亭`);
    assert.deepEqual(toGazebo[0], { x: spec.entrance.outside.x, y: spec.entrance.outside.y });
    assert.deepEqual(toGazebo.at(-1), { x: gazebo.x, y: gazebo.y });
    const inSteps = toGazebo.length - 1;
    assert.ok(inSteps >= 4, `${region.label}：入口到花亭只有 ${inSteps} 步，太短了不算迷宫`);
    assert.ok(inSteps <= 14, `${region.label}：入口到花亭要 ${inSteps} 步，26 回合的预算吃不消`);

    const toExit = solveMaze(walls, gazebo, spec.exit.outside);
    assert.ok(toExit, `${region.label}：抱着小动物必须能从花亭走到出口`);
    assert.ok(toExit.length - 1 <= 14, `${region.label}：花亭到出口 ${toExit.length - 1} 步，回程太长`);

    // 回程合法：不存在单向门，原路返回也永远走得通
    const backToEntrance = solveMaze(walls, gazebo, spec.entrance.outside);
    assert.ok(backToEntrance, `${region.label}：必须能原路退回入口`);
  }
});

test('迷宫每一格都能从入口走到（没有永远进不去的死区）', () => {
  for (const region of MAZE_REGIONS) {
    const spec = MAZE_OPENINGS[region.id];
    for (const cell of regionCells(region)) {
      const path = solveMaze(walls, spec.entrance.outside, cell);
      assert.ok(path, `${region.label} 的 (${cell.x},${cell.y}) 应当可以从入口走到`);
    }
  }
});

test('死胡同数量落在设计区间：够玩，又不至于把孩子绕晕', () => {
  const deadEnds = findDeadEnds(walls);
  assert.ok(deadEnds.length >= 2, `只有 ${deadEnds.length} 个死胡同，迷宫太平淡`);
  assert.ok(deadEnds.length <= 8, `有 ${deadEnds.length} 个死胡同，对 6–9 岁太劝退`);
  for (const cell of deadEnds) {
    assert.ok(inMaze(cell.x, cell.y), '死胡同必须在迷宫里，开阔花园不该有死路');
    // 死胡同确实只有一条出路
    const open = DIRECTIONS.filter((dir) => {
      const v = DIR_VECTOR[dir];
      const nx = cell.x + v.dx;
      const ny = cell.y + v.dy;
      return nx >= 0 && ny >= 0 && nx < GRID_SIZE && ny < GRID_SIZE && !hasHedge(walls, cell.x, cell.y, dir);
    });
    assert.equal(open.length, 1, `(${cell.x},${cell.y}) 应当只能原路返回`);
  }
});

test('迷宫布局是可复现的：同样的种子，每次生成同一座迷宫', () => {
  const again = buildHedgeWalls();
  assert.equal(again.size, walls.size);
  for (const key of walls) assert.ok(again.has(key), `第二次生成缺少墙 ${key}`);
  assert.deepEqual(findGazebos(again), gazebos);
});

test('两处花亭各守着一只小动物，其余小动物都在开阔花园里', () => {
  const world = buildWorld();
  const inMazeAnimals = world.animals.filter((a) => inMaze(a.x, a.y));
  assert.equal(inMazeAnimals.length, 2, '两座迷宫各藏一只');

  const baby = world.animals.find((a) => a.id === 'bunny_baby');
  assert.deepEqual({ x: baby.x, y: baby.y }, { x: gazebos.north.x, y: gazebos.north.y });
  const deer = world.animals.find((a) => a.id === 'deer');
  assert.deepEqual({ x: deer.x, y: deer.y }, { x: gazebos.south.x, y: gazebos.south.y });
});

test('沿正确通路可以救出花亭里的小兔宝宝，并从出口拱门离开', () => {
  const engine = new GameEngine();
  const spec = MAZE_OPENINGS.north;
  const bunny = engine.players[ROLES.BUNNY];

  // 先把小兔挪到入口花廊外（真实对局里她要自己走过去，这里只测迷宫本身）
  bunny.x = spec.entrance.outside.x;
  bunny.y = spec.entrance.outside.y;

  walkPath(engine, ROLES.BUNNY, solveMaze(walls, spec.entrance.outside, gazebos.north));
  assert.deepEqual({ x: bunny.x, y: bunny.y }, { x: gazebos.north.x, y: gazebos.north.y });
  assert.deepEqual(bunny.carrying, ['bunny_baby'], '走到花亭自动抱起小兔宝宝');

  walkPath(engine, ROLES.BUNNY, solveMaze(walls, gazebos.north, spec.exit.outside));
  assert.deepEqual({ x: bunny.x, y: bunny.y }, { x: spec.exit.outside.x, y: spec.exit.outside.y });
  assert.equal(inMaze(bunny.x, bunny.y), false, '已经走出迷宫');
  assert.deepEqual(bunny.carrying, ['bunny_baby'], '小兔宝宝一路都抱在怀里');
});

test('走错路会撞树篱：不扣行动点、不穿墙、给出退路箭头', () => {
  const engine = new GameEngine();
  const bunny = engine.players[ROLES.BUNNY];
  const deadEnd = findDeadEnds(walls)[0];
  bunny.x = deadEnd.x;
  bunny.y = deadEnd.y;

  const only = DIRECTIONS.find((dir) => !probeStep(engine.world, deadEnd.x, deadEnd.y, dir).blocked);
  const walled = DIRECTIONS.filter((dir) => dir !== only);

  for (const dir of walled) {
    bunny.facing = dir;
    bunny.ap = 3;
    const wrong = engine.act(ROLES.BUNNY, { type: ACTION.FORWARD });
    assert.equal(wrong.ok, false);
    assert.equal(wrong.reason, REJECT.BLOCKED);
    assert.ok([BLOCKER.HEDGE, BLOCKER.BOUNDARY].includes(wrong.blocker), `死胡同的墙应是树篱或围墙，实际 ${wrong.blocker}`);
    assert.equal(bunny.ap, 3, '撞墙不扣行动点');
    assert.deepEqual({ x: bunny.x, y: bunny.y }, { x: deadEnd.x, y: deadEnd.y }, '不穿墙');
    assert.deepEqual(wrong.hint.alternatives, [only], '死胡同里唯一的出路就是原路返回');
  }
});

test('迷宫外的格子无法横穿树篱进入，只能走 4 个开口', () => {
  const world = buildWorld();
  const illegal = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (inMaze(x, y)) continue;
      for (const dir of DIRECTIONS) {
        const v = DIR_VECTOR[dir];
        if (!inMaze(x + v.dx, y + v.dy)) continue;
        if (!probeStep(world, x, y, dir).blocked) illegal.push(`(${x},${y})→${dir}`);
      }
    }
  }
  const expected = mazeOpenings()
    .map((o) => {
      const dir = DIR_OPPOSITE[o.dir];
      return `(${o.outside.x},${o.outside.y})→${dir}`;
    })
    .sort();
  assert.deepEqual(illegal.sort(), expected, '只能从两座迷宫的花廊与拱门进出');
});

test('hedgeSegments 为 3D 渲染输出去重后的墙体', () => {
  const segments = hedgeSegments(walls);
  const keys = new Set(segments.map((s) => `${s.cx},${s.cy}`));
  assert.equal(keys.size, segments.length, '同一道墙不能输出两次');
  assert.ok(segments.length >= 40, `两座迷宫应当有足够多的墙体，实际只有 ${segments.length} 道`);
  for (const s of segments) {
    assert.equal(typeof s.horizontal, 'boolean');
    assert.ok(Number.isFinite(s.cx) && Number.isFinite(s.cy));
  }
});
