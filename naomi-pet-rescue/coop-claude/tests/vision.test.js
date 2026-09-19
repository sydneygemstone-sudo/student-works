/**
 * tests/vision.test.js — 视线遮挡 (Line of Sight) 与防穿墙相机的纯数学测试。
 *
 * 地形与迷宫布局会随关卡调整而变，所以这里的测试点都**从世界里现查**
 * （找一块森林、找一道树篱），不写死坐标。
 *
 * Author: Claude Code (Claude Opus)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWorld, inBounds } from '../core/world.js';
import { lineOfSight, resolveCameraPosition, castRay, smoothDamp } from '../core/vision.js';
import {
  LOS_MAX_DISTANCE, CAMERA_MIN_DISTANCE, ROLES, TERRAIN, GRID_SIZE,
  DIRECTIONS, DIR_VECTOR, DIR_OPPOSITE,
} from '../core/constants.js';
import { hasHedge, inMaze, findGazebos, mazeOpenings } from '../core/maze.js';
import { GameEngine } from '../core/game.js';
import { dirToYaw, yawToForward } from '../client/coords.js';

const world = buildWorld();
const gazebos = findGazebos(world.walls);

test('3D 朝向约定：模型正脸、移动方向与相机 forward 对四个方向完全一致', () => {
  for (const dir of DIRECTIONS) {
    const expected = DIR_VECTOR[dir];
    const yaw = dirToYaw(dir);
    const forward = yawToForward(yaw);
    assert.ok(Math.abs(forward.x - expected.dx) < 1e-9, `${dir} 的 X 朝向应一致`);
    assert.ok(Math.abs(forward.z - expected.dy) < 1e-9, `${dir} 的 Z 朝向应一致`);
  }

  assert.ok(dirToYaw('E') < 0, 'Three.js 中模型 -Z 转向东应为负 90°');
  assert.ok(dirToYaw('W') > 0, 'Three.js 中模型 -Z 转向西应为正 90°');
});

/** 找一处「A — 障碍 — B」的直线三连格，用来验证遮挡。 */
function findOccluder(terrain) {
  for (let y = 1; y < GRID_SIZE - 1; y += 1) {
    for (let x = 1; x < GRID_SIZE - 1; x += 1) {
      if (world.grid[y][x] !== terrain) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const a = { x: x - dx, y: y - dy };
        const b = { x: x + dx, y: y + dy };
        if (!inBounds(a.x, a.y) || !inBounds(b.x, b.y)) continue;
        if (world.grid[a.y][a.x] === TERRAIN.ROCK || world.grid[b.y][b.x] === TERRAIN.ROCK) continue;
        if (inMaze(a.x, a.y) || inMaze(b.x, b.y)) continue; // 迷宫里另有树篱干扰
        return { a, b, blocker: { x, y } };
      }
    }
  }
  throw new Error(`地图里找不到可用于测试的 ${terrain} 遮挡`);
}

/** 找一道迷宫内部的树篱，返回它两侧的格子。 */
function findInnerHedge() {
  for (const key of world.walls) {
    const [xs, ys, dir] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const v = DIR_VECTOR[dir];
    const nx = x + v.dx;
    const ny = y + v.dy;
    if (!inBounds(nx, ny)) continue;
    if (!inMaze(x, y) || !inMaze(nx, ny)) continue;
    return { a: { x, y }, b: { x: nx, y: ny }, dir };
  }
  throw new Error('找不到迷宫内部树篱');
}

/** 找一对隔着树篱相邻、但绕一格就能互相看见的格子（用于「拆开看是通的」）。 */
function findOpenNeighbour(from) {
  for (const dir of DIRECTIONS) {
    const v = DIR_VECTOR[dir];
    const nx = from.x + v.dx;
    const ny = from.y + v.dy;
    if (!inBounds(nx, ny)) continue;
    if (hasHedge(world.walls, from.x, from.y, dir)) continue;
    if (world.grid[ny][nx] === TERRAIN.ROCK) continue;
    return { x: nx, y: ny };
  }
  throw new Error(`(${from.x},${from.y}) 四周都是墙`);
}

test('同格与空旷直线上的队友可见', () => {
  assert.equal(lineOfSight(world, { x: 7, y: 7 }, { x: 7, y: 7 }).visible, true);
  const near = lineOfSight(world, { x: 7, y: 7 }, { x: 7, y: 8 });
  assert.equal(near.visible, true);
  assert.equal(near.distance, 1);
  assert.equal(lineOfSight(world, { x: 8, y: 7 }, { x: 9, y: 7 }).visible, true);
});

test('距离太远看不见队友', () => {
  const far = lineOfSight(world, { x: 0, y: 14 }, { x: 14, y: 0 });
  assert.equal(far.visible, false);
  assert.equal(far.reason, 'too_far');
  assert.ok(far.distance > LOS_MAX_DISTANCE);
});

test('森林与石头会遮挡视线', () => {
  const forest = findOccluder(TERRAIN.FOREST);
  assert.equal(world.grid[forest.blocker.y][forest.blocker.x], TERRAIN.FOREST);
  const throughForest = lineOfSight(world, forest.a, forest.b);
  assert.equal(throughForest.visible, false, `(${forest.a.x},${forest.a.y}) 不该看穿森林 (${forest.blocker.x},${forest.blocker.y})`);
  assert.equal(throughForest.reason, 'occluded');

  const rock = findOccluder(TERRAIN.ROCK);
  assert.equal(world.grid[rock.blocker.y][rock.blocker.x], TERRAIN.ROCK);
  assert.equal(lineOfSight(world, rock.a, rock.b).visible, false);
});

test('假房子是实体小屋，也会挡住视线', () => {
  const decoy = world.decoys[0];
  const west = { x: decoy.x - 1, y: decoy.y };
  const east = { x: decoy.x + 1, y: decoy.y };
  assert.equal(world.grid[decoy.y][decoy.x], TERRAIN.DECOY);
  assert.equal(lineOfSight(world, west, east).visible, false, '看不穿假房子');
});

test('树篱会遮挡视线，同一条走廊上则是通的', () => {
  const hedge = findInnerHedge();
  const blocked = lineOfSight(world, hedge.a, hedge.b);
  assert.equal(blocked.visible, false);
  assert.equal(blocked.reason, 'hedge');

  const open = findOpenNeighbour(hedge.a);
  assert.equal(lineOfSight(world, hedge.a, open).visible, true, '没有树篱的那一侧应当看得见');
});

test('迷宫周界树篱挡住视线，只有花廊与拱门能望进去', () => {
  for (const opening of mazeOpenings()) {
    const outside = opening.outside;
    const inside = { x: opening.x, y: opening.y };
    assert.equal(
      lineOfSight(world, outside, inside).visible, true,
      `${opening.label} 正对着应当能望进去`,
    );

    // 沿着周界挪一格，就该被树篱挡住
    for (const dir of DIRECTIONS) {
      const v = DIR_VECTOR[dir];
      const probe = { x: outside.x + v.dx, y: outside.y + v.dy };
      if (!inBounds(probe.x, probe.y)) continue;
      if (!inMaze(probe.x, probe.y)) continue;
      if (probe.x === inside.x && probe.y === inside.y) continue;
      assert.equal(
        lineOfSight(world, outside, probe).visible, false,
        `(${outside.x},${outside.y}) 不该越过周界树篱看到 (${probe.x},${probe.y})`,
      );
    }
  }
});

test('视线判定是对称的', () => {
  const forest = findOccluder(TERRAIN.FOREST);
  const rock = findOccluder(TERRAIN.ROCK);
  const hedge = findInnerHedge();
  const pairs = [
    [forest.a, forest.b],
    [rock.a, rock.b],
    [hedge.a, hedge.b],
    [{ x: 7, y: 7 }, { x: 8, y: 8 }],
    [{ x: 7, y: 7 }, { x: 9, y: 9 }],
  ];
  for (const [a, b] of pairs) {
    assert.equal(
      lineOfSight(world, a, b).visible,
      lineOfSight(world, b, a).visible,
      `(${a.x},${a.y}) ↔ (${b.x},${b.y}) 视线应当对称`,
    );
  }
});

test('斜向穿过格点时也不会「穿墙看人」', () => {
  // 在迷宫里找一个「两条 L 形绕行都被树篱堵死」的斜向对
  let found = null;
  outer:
  for (let y = 0; y < GRID_SIZE - 1 && !found; y += 1) {
    for (let x = 0; x < GRID_SIZE - 1; x += 1) {
      const a = { x, y };
      const b = { x: x + 1, y: y + 1 };
      if (!inMaze(a.x, a.y) || !inMaze(b.x, b.y)) continue;
      const viaEast = !hasHedge(world.walls, x, y, 'E') && !hasHedge(world.walls, x + 1, y, 'S');
      const viaSouth = !hasHedge(world.walls, x, y, 'S') && !hasHedge(world.walls, x, y + 1, 'E');
      if (!viaEast && !viaSouth) {
        found = { a, b };
        break outer;
      }
    }
  }
  assert.ok(found, '迷宫里应当存在被完全堵死的斜向对');
  assert.equal(lineOfSight(world, found.a, found.b).visible, false, '两条 L 形路线都堵死时不该看得见');

  // 空旷草地上的斜向可见
  assert.equal(lineOfSight(world, { x: 7, y: 7 }, { x: 8, y: 8 }).visible, true);
});

test('引擎快照里的 visibility 与 lineOfSight 一致', () => {
  const engine = new GameEngine();
  const snapshot = engine.snapshot();
  const expected = lineOfSight(engine.world, engine.players[ROLES.BEAR], engine.players[ROLES.BUNNY]);
  assert.equal(snapshot.visibility.visible, expected.visible);

  // 把小兔藏进迷宫深处 → 看不见
  engine.players[ROLES.BUNNY].x = gazebos.north.x;
  engine.players[ROLES.BUNNY].y = gazebos.north.y;
  assert.equal(engine.snapshot().visibility.visible, false);
});

test('相机在空旷处保持理想距离，不做收缩', () => {
  const anchor = { x: 7.5, y: 7.5 };
  const desired = { x: 7.5, y: 9.3 };
  const cam = resolveCameraPosition(world, anchor, desired);
  assert.equal(cam.clamped, false);
  assert.equal(cam.x, desired.x);
  assert.equal(cam.y, desired.y);
});

test('相机撞上树篱时平滑收缩，绝不穿到墙的另一侧', () => {
  const hedge = findInnerHedge();
  const v = DIR_VECTOR[hedge.dir];
  const anchor = { x: hedge.a.x + 0.5, y: hedge.a.y + 0.5 };
  const desired = { x: anchor.x + v.dx * 1.4, y: anchor.y + v.dy * 1.4 }; // 理想机位在树篱外侧
  const cam = resolveCameraPosition(world, anchor, desired);
  assert.equal(cam.clamped, true);
  // 墙面在 anchor 前方 0.5 格处，收缩后绝不能越过
  const travelled = Math.hypot(cam.x - anchor.x, cam.y - anchor.y);
  assert.ok(travelled < 0.5, `相机走了 ${travelled} 格，越过了 0.5 格处的墙面`);
  assert.ok(cam.distance >= 0);
});

test('相机撞上石头时同样收缩', () => {
  const rock = findOccluder(TERRAIN.ROCK);
  const anchor = { x: rock.a.x + 0.5, y: rock.a.y + 0.5 };
  const desired = { x: rock.b.x + 0.5, y: rock.b.y + 0.5 };
  const cam = resolveCameraPosition(world, anchor, desired);
  assert.equal(cam.clamped, true);
  const travelled = Math.hypot(cam.x - anchor.x, cam.y - anchor.y);
  assert.ok(travelled < 1.5, `相机走了 ${travelled} 格，穿过了石头`);
});

test('贴墙极近时宁可贴身也绝不穿墙', () => {
  const hedge = findInnerHedge();
  const v = DIR_VECTOR[hedge.dir];
  // 角色几乎贴着树篱（距墙面 0.05 格），理想机位在墙外 → 相机只能贴到角色身上
  const anchor = { x: hedge.a.x + 0.5 + v.dx * 0.45, y: hedge.a.y + 0.5 + v.dy * 0.45 };
  const desired = { x: anchor.x + v.dx * 1.5, y: anchor.y + v.dy * 1.5 };
  const cam = resolveCameraPosition(world, anchor, desired);
  assert.equal(cam.clamped, true);
  assert.ok(cam.distance >= 0 && cam.distance < CAMERA_MIN_DISTANCE, `贴墙时应当贴身，实际 ${cam.distance}`);

  // 空旷处：理想机位原样返回，收缩只在真的会穿墙时发生
  const close = resolveCameraPosition(world, { x: 7.5, y: 7.5 }, { x: 7.5, y: 7.7 });
  assert.equal(close.clamped, false);
  assert.ok(Math.abs(close.distance - 0.2) < 1e-9);
});

test('castRay 命中参数 t 落在 [0,1] 且能报出阻挡类型', () => {
  const hedge = findInnerHedge();
  const v = DIR_VECTOR[hedge.dir];
  const hit = castRay(
    world,
    { x: hedge.a.x + 0.5, y: hedge.a.y + 0.5 },
    { x: hedge.a.x + 0.5 + v.dx, y: hedge.a.y + 0.5 + v.dy },
  );
  assert.equal(hit.hit, true);
  assert.ok(hit.t >= 0 && hit.t <= 1);
  assert.equal(hit.blocker, 'hedge');

  const clear = castRay(world, { x: 7.5, y: 7.5 }, { x: 7.5, y: 8.5 });
  assert.equal(clear.hit, false);
  assert.equal(clear.t, 1);
});

test('smoothDamp 单调逼近目标且不过冲', () => {
  let current = 3;
  const target = 1;
  for (let i = 0; i < 50; i += 1) {
    const next = smoothDamp(current, target, 8, 1 / 60);
    assert.ok(next <= current + 1e-9 && next >= target - 1e-9, '不应过冲');
    current = next;
  }
  assert.ok(Math.abs(current - target) < 0.01);
});
