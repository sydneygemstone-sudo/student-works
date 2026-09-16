/**
 * tests/vision.test.js — 视线遮挡 (Line of Sight) 与防穿墙相机的纯数学测试。
 * Author: Claude Code (Claude Opus)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWorld } from '../core/world.js';
import { lineOfSight, resolveCameraPosition, castRay, smoothDamp } from '../core/vision.js';
import { LOS_MAX_DISTANCE, CAMERA_MIN_DISTANCE, ROLES, TERRAIN } from '../core/constants.js';
import { GameEngine } from '../core/game.js';

const world = buildWorld();

test('同格与空旷直线上的队友可见', () => {
  assert.equal(lineOfSight(world, { x: 4, y: 4 }, { x: 4, y: 4 }).visible, true);
  const near = lineOfSight(world, { x: 3, y: 4 }, { x: 3, y: 5 });
  assert.equal(near.visible, true);
  assert.equal(near.distance, 1);
  assert.equal(lineOfSight(world, { x: 3, y: 4 }, { x: 3, y: 6 }).visible, true);
});

test('距离太远看不见队友', () => {
  const far = lineOfSight(world, { x: 0, y: 8 }, { x: 8, y: 0 });
  assert.equal(far.visible, false);
  assert.equal(far.reason, 'too_far');
  assert.ok(far.distance > LOS_MAX_DISTANCE);
});

test('森林与石头会遮挡视线', () => {
  // (0,2) 是森林，挡住 (0,1) ↔ (0,3)
  const forest = lineOfSight(world, { x: 0, y: 1 }, { x: 0, y: 3 });
  assert.equal(world.grid[2][0], TERRAIN.FOREST);
  assert.equal(forest.visible, false);
  assert.equal(forest.reason, 'occluded');

  // (2,1) 是石头，挡住 (2,0) ↔ (2,2)
  const rock = lineOfSight(world, { x: 2, y: 0 }, { x: 2, y: 2 });
  assert.equal(world.grid[1][2], TERRAIN.ROCK);
  assert.equal(rock.visible, false);
});

test('树篱会遮挡视线，拆开看则是通的', () => {
  // (7,1) 花亭 与 (8,1) 之间隔着树篱
  const blocked = lineOfSight(world, { x: 7, y: 1 }, { x: 8, y: 1 });
  assert.equal(blocked.visible, false);
  assert.equal(blocked.reason, 'hedge');

  // 同一条走廊上没有树篱
  assert.equal(lineOfSight(world, { x: 7, y: 1 }, { x: 7, y: 2 }).visible, true);
  assert.equal(lineOfSight(world, { x: 7, y: 0 }, { x: 7, y: 2 }).visible, true);
});

test('迷宫周界树篱挡住视线，只有花廊与拱门能望进去', () => {
  assert.equal(lineOfSight(world, { x: 6, y: 4 }, { x: 6, y: 3 }).visible, false, '南侧周界树篱挡住视线');
  assert.equal(lineOfSight(world, { x: 4, y: 1 }, { x: 5, y: 1 }).visible, false, '西侧周界树篱挡住视线');
  // 入口花廊与出口拱门正对着是通的
  assert.equal(lineOfSight(world, { x: 5, y: 4 }, { x: 5, y: 3 }).visible, true);
  assert.equal(lineOfSight(world, { x: 5, y: 4 }, { x: 5, y: 2 }).visible, true, '站在花廊口能一眼望到浅死胡同尽头');
  assert.equal(lineOfSight(world, { x: 4, y: 0 }, { x: 5, y: 0 }).visible, true, '出口拱门是通的');
});

test('视线判定是对称的', () => {
  const pairs = [
    [{ x: 0, y: 1 }, { x: 0, y: 3 }],
    [{ x: 3, y: 4 }, { x: 3, y: 6 }],
    [{ x: 7, y: 1 }, { x: 8, y: 1 }],
    [{ x: 4, y: 4 }, { x: 5, y: 5 }],
    [{ x: 2, y: 0 }, { x: 2, y: 2 }],
  ];
  for (const [a, b] of pairs) {
    assert.equal(lineOfSight(world, a, b).visible, lineOfSight(world, b, a).visible, `(${a.x},${a.y}) ↔ (${b.x},${b.y}) 视线应当对称`);
  }
});

test('斜向穿过格点时也不会「穿墙看人」', () => {
  // (5,2) 与 (6,1) 斜向相邻：两条 L 形绕行路线都被树篱挡住 → 看不见
  assert.equal(lineOfSight(world, { x: 5, y: 2 }, { x: 6, y: 1 }).visible, false);
  // (7,1) 与 (8,0) 虽有一道树篱，但沿 (7,0) 的拐角是通的 → 看得见
  assert.equal(lineOfSight(world, { x: 7, y: 1 }, { x: 8, y: 0 }).visible, true);
  // 空旷草地上的斜向可见
  assert.equal(lineOfSight(world, { x: 3, y: 4 }, { x: 4, y: 5 }).visible, true);
});

test('引擎快照里的 visibility 与 lineOfSight 一致', () => {
  const engine = new GameEngine();
  const snapshot = engine.snapshot();
  const expected = lineOfSight(engine.world, engine.players[ROLES.BEAR], engine.players[ROLES.BUNNY]);
  assert.equal(snapshot.visibility.visible, expected.visible);

  // 把小兔藏进迷宫深处 → 看不见
  engine.players[ROLES.BUNNY].x = 8;
  engine.players[ROLES.BUNNY].y = 0;
  assert.equal(engine.snapshot().visibility.visible, false);
});

test('相机在空旷处保持理想距离，不做收缩', () => {
  const anchor = { x: 3.5, y: 4.5 };
  const desired = { x: 3.5, y: 6.3 };
  const cam = resolveCameraPosition(world, anchor, desired);
  assert.equal(cam.clamped, false);
  assert.equal(cam.x, desired.x);
  assert.equal(cam.y, desired.y);
});

test('相机撞上树篱时平滑收缩，绝不穿到墙的另一侧', () => {
  const anchor = { x: 7.5, y: 1.5 }; // 花亭
  const desired = { x: 8.9, y: 1.5 }; // 理想机位在树篱外侧
  const cam = resolveCameraPosition(world, anchor, desired);
  assert.equal(cam.clamped, true);
  assert.ok(cam.x < 8, `相机 x=${cam.x} 必须留在树篱内侧`);
  assert.ok(cam.distance >= 0);
  assert.ok(cam.distance < Math.hypot(desired.x - anchor.x, desired.y - anchor.y));
  assert.equal(cam.y, anchor.y);
});

test('相机撞上石头时同样收缩', () => {
  const anchor = { x: 3.5, y: 1.5 };
  const desired = { x: 1.6, y: 1.5 }; // 中间隔着石头 (2,1)
  const cam = resolveCameraPosition(world, anchor, desired);
  assert.equal(cam.clamped, true);
  assert.ok(cam.x > 3, `相机 x=${cam.x} 不能穿过石头`);
});

test('贴墙极近时宁可贴身也绝不穿墙', () => {
  // 角色几乎贴着树篱，理想机位在墙外 → 相机只能贴到角色身上
  const cam = resolveCameraPosition(world, { x: 7.95, y: 1.5 }, { x: 9.5, y: 1.5 });
  assert.equal(cam.clamped, true);
  assert.ok(cam.x < 8, '绝不越过墙面');
  assert.ok(cam.distance >= 0 && cam.distance < CAMERA_MIN_DISTANCE);

  // 空旷处：理想机位原样返回，收缩只在真的会穿墙时发生
  const close = resolveCameraPosition(world, { x: 3.5, y: 4.5 }, { x: 3.5, y: 4.7 });
  assert.equal(close.clamped, false);
  assert.ok(Math.abs(close.distance - 0.2) < 1e-9);
});

test('castRay 命中参数 t 落在 [0,1] 且能报出阻挡类型', () => {
  const hit = castRay(world, { x: 7.5, y: 1.5 }, { x: 8.5, y: 1.5 });
  assert.equal(hit.hit, true);
  assert.ok(hit.t >= 0 && hit.t <= 1);
  assert.equal(hit.blocker, 'hedge');

  const clear = castRay(world, { x: 3.5, y: 4.5 }, { x: 3.5, y: 5.5 });
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
