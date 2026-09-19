/**
 * core/vision.js — 视线遮挡 (Line of Sight) 与防穿墙相机收缩的纯数学。
 *
 * 这两件事虽然服务于 3D 表现，但本质是 2D 网格上的射线求交，
 * 因此放在 core/ 里用 Node 单元测试覆盖，客户端只负责把结果喂给 Three.js。
 *
 * Author: Claude Code (Claude Opus)
 */

import { DIR_VECTOR, LOS_MAX_DISTANCE, TERRAIN } from './constants.js';
import { hasHedge } from './maze.js';
import { inBounds, blocksSight } from './world.js';

const EPS = 1e-9;

/** 相机撞得到的实体：石头、真家的小屋、假房子的小屋。 */
export function cameraBlocks(terrain) {
  return terrain === TERRAIN.ROCK || terrain === TERRAIN.HOME || terrain === TERRAIN.DECOY;
}

/**
 * 在连续网格坐标系中投射一条线段，找出第一次被阻挡的位置。
 * 坐标约定：格 (x,y) 的中心是 (x+0.5, y+0.5)。
 *
 * @param {object} world
 * @param {{x:number,y:number}} from 连续坐标
 * @param {{x:number,y:number}} to   连续坐标
 * @param {object} [opts]
 * @param {(terrain:string)=>boolean} [opts.cellBlocks] 判断格子地形是否阻挡
 * @param {boolean} [opts.ignoreTargetCell] 终点所在格不参与地形判定（看队友时用）
 * @returns {{hit:boolean, t:number, blocker:string|null, cell:{x:number,y:number}|null}}
 *          t 为命中处在 from→to 上的归一化参数 [0,1]
 */
export function castRay(world, from, to, opts = {}) {
  const cellBlocks = opts.cellBlocks ?? ((terrain) => terrain === TERRAIN.ROCK);
  const ignoreTargetCell = opts.ignoreTargetCell ?? false;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const targetCell = { x: Math.floor(to.x), y: Math.floor(to.y) };
  let x = Math.floor(from.x);
  let y = Math.floor(from.y);

  if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) {
    return { hit: false, t: 1, blocker: null, cell: null };
  }

  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  let tMaxX = Math.abs(dx) < EPS ? Infinity : ((dx > 0 ? x + 1 : x) - from.x) / dx;
  let tMaxY = Math.abs(dy) < EPS ? Infinity : ((dy > 0 ? y + 1 : y) - from.y) / dy;
  const tDeltaX = Math.abs(dx) < EPS ? Infinity : Math.abs(1 / dx);
  const tDeltaY = Math.abs(dy) < EPS ? Infinity : Math.abs(1 / dy);

  const edgeOpen = (cx, cy, dir) => {
    const v = DIR_VECTOR[dir];
    const nx = cx + v.dx;
    const ny = cy + v.dy;
    if (!inBounds(nx, ny)) return false;
    if (hasHedge(world.walls, cx, cy, dir)) return false;
    return true;
  };

  const cellOpaque = (cx, cy) => {
    if (!inBounds(cx, cy)) return true;
    if (ignoreTargetCell && cx === targetCell.x && cy === targetCell.y) return false;
    return cellBlocks(world.grid[cy][cx]);
  };

  let guard = 0;
  while (guard++ < 512) {
    if (tMaxX > 1 && tMaxY > 1) return { hit: false, t: 1, blocker: null, cell: null };

    const corner = Math.abs(tMaxX - tMaxY) < 1e-7;
    if (corner && Number.isFinite(tMaxX) && Number.isFinite(tMaxY)) {
      // 射线正好穿过格点：只要「先横后纵」或「先纵后横」两条 L 形路径任一畅通即可
      const dirX = stepX > 0 ? 'E' : 'W';
      const dirY = stepY > 0 ? 'S' : 'N';
      const viaX = edgeOpen(x, y, dirX) && !cellOpaque(x + stepX, y) && edgeOpen(x + stepX, y, dirY);
      const viaY = edgeOpen(x, y, dirY) && !cellOpaque(x, y + stepY) && edgeOpen(x, y + stepY, dirX);
      const t = tMaxX;
      if (!viaX && !viaY) {
        return { hit: true, t, blocker: 'corner', cell: { x, y } };
      }
      x += stepX;
      y += stepY;
      tMaxX += tDeltaX;
      tMaxY += tDeltaY;
      if (cellOpaque(x, y)) return { hit: true, t, blocker: 'cell', cell: { x, y } };
      continue;
    }

    let dir;
    let t;
    if (tMaxX < tMaxY) {
      dir = stepX > 0 ? 'E' : 'W';
      t = tMaxX;
      tMaxX += tDeltaX;
    } else {
      dir = stepY > 0 ? 'S' : 'N';
      t = tMaxY;
      tMaxY += tDeltaY;
    }

    if (!edgeOpen(x, y, dir)) {
      const v = DIR_VECTOR[dir];
      return {
        hit: true,
        t,
        blocker: inBounds(x + v.dx, y + v.dy) ? 'hedge' : 'boundary',
        cell: { x, y },
      };
    }
    const v = DIR_VECTOR[dir];
    x += v.dx;
    y += v.dy;
    if (cellOpaque(x, y)) return { hit: true, t, blocker: 'cell', cell: { x, y } };
  }
  return { hit: true, t: 1, blocker: 'guard', cell: { x, y } };
}

/**
 * 队友是否可见：必须在直视范围内、且中间没有树篱 / 石头 / 森林遮挡。
 * @returns {{visible:boolean, reason:string, distance:number}}
 */
export function lineOfSight(world, from, to, maxDistance = LOS_MAX_DISTANCE) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (from.x === to.x && from.y === to.y) return { visible: true, reason: 'same_cell', distance: 0 };
  if (distance > maxDistance) return { visible: false, reason: 'too_far', distance };

  const ray = castRay(
    world,
    { x: from.x + 0.5, y: from.y + 0.5 },
    { x: to.x + 0.5, y: to.y + 0.5 },
    { cellBlocks: blocksSight, ignoreTargetCell: true },
  );
  if (ray.hit) return { visible: false, reason: ray.blocker === 'cell' ? 'occluded' : 'hedge', distance };
  return { visible: true, reason: 'clear', distance };
}

/**
 * 防穿墙相机：从角色位置朝理想机位投射射线，若中途撞上树篱 / 石头，
 * 相机就平滑地向角色收缩到碰撞点之前，绝不穿墙穿模。
 *
 * @param {object} world
 * @param {{x:number,y:number}} anchor 角色所在连续坐标（格中心为 x+0.5）
 * @param {{x:number,y:number}} desired 理想机位连续坐标（长度由客户端决定，至少 CAMERA_MIN_DISTANCE）
 * @param {object} [opts] { padding } 墙面留白
 * @returns {{x:number,y:number,distance:number,clamped:boolean}}
 */
export function resolveCameraPosition(world, anchor, desired, opts = {}) {
  const padding = opts.padding ?? 0.18;
  const dx = desired.x - anchor.x;
  const dy = desired.y - anchor.y;
  const full = Math.hypot(dx, dy);
  if (full < EPS) return { x: anchor.x, y: anchor.y, distance: 0, clamped: false };

  const ray = castRay(world, anchor, desired, {
    // 石头、家、假房子都是立在格子上的实体，相机一概不许穿进去。
    // castRay 不检查起点所在的那一格，所以角色**站在**小屋里时相机照常后退，
    // 只有小屋夹在角色和机位之间时才会收缩 —— 正是想要的行为。
    cellBlocks: cameraBlocks,
    ignoreTargetCell: false,
  });
  if (!ray.hit) return { x: desired.x, y: desired.y, distance: full, clamped: false };

  // 墙面之前的最大允许距离；宁可贴到角色身上，也绝不越过墙面。
  // 理想机位由客户端给出（不短于 CAMERA_MIN_DISTANCE），这里只负责「不超过、不穿墙」。
  const hitAllowed = Math.max(0, ray.t * full - padding);
  const distance = Math.min(full, hitAllowed);
  const k = distance / full;
  return { x: anchor.x + dx * k, y: anchor.y + dy * k, distance, clamped: true };
}

/** 指数平滑，用于相机距离的丝滑收放（客户端每帧调用）。 */
export function smoothDamp(current, target, lambda, dt) {
  return target + (current - target) * Math.exp(-lambda * dt);
}
