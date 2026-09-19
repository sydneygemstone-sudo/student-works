/**
 * core/pathfind.js — 网格 BFS 寻路。狼、狮子和关卡预算校验共用。
 *
 * 只认「能不能过」，不认地形成本：野兽穿草地和森林一样快，
 * 石头、树篱、世界边界过不去。这样孩子对野兽的移动有稳定预期。
 *
 * Author: Claude Code (Claude Opus)
 */

import { DIRECTIONS, DIR_VECTOR } from './constants.js';
import { probeStep } from './world.js';

const key = (x, y) => `${x},${y}`;

/**
 * 从起点做一次 BFS。
 * @param {object} world
 * @param {{x:number,y:number}} from
 * @param {object} [opts]
 * @param {(x:number,y:number)=>boolean} [opts.passable] 额外的可通行判断（默认全通）
 * @returns {{dist:Map<string,number>, prev:Map<string,string|null>}}
 */
export function bfs(world, from, opts = {}) {
  const passable = opts.passable ?? (() => true);
  const dist = new Map([[key(from.x, from.y), 0]]);
  const prev = new Map([[key(from.x, from.y), null]]);
  const queue = [{ x: from.x, y: from.y }];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const d = dist.get(key(cur.x, cur.y));
    for (const dir of DIRECTIONS) {
      const probe = probeStep(world, cur.x, cur.y, dir);
      if (probe.blocked) continue;
      const { x: nx, y: ny } = probe.target;
      if (!passable(nx, ny)) continue;
      const nk = key(nx, ny);
      if (dist.has(nk)) continue;
      dist.set(nk, d + 1);
      prev.set(nk, key(cur.x, cur.y));
      queue.push({ x: nx, y: ny });
    }
  }
  return { dist, prev };
}

/** 两点间的可通行最短步数，不可达返回 Infinity。 */
export function stepDistance(world, from, to, opts = {}) {
  const { dist } = bfs(world, from, opts);
  return dist.get(key(to.x, to.y)) ?? Infinity;
}

/**
 * 从 from 走向 to 的完整最短路径（含起点），不可达返回 null。
 */
export function shortestPath(world, from, to, opts = {}) {
  const { dist, prev } = bfs(world, from, opts);
  const goal = key(to.x, to.y);
  if (!dist.has(goal)) return null;
  const path = [];
  let cur = goal;
  while (cur) {
    const [xs, ys] = cur.split(',');
    path.unshift({ x: Number(xs), y: Number(ys) });
    cur = prev.get(cur) ?? null;
  }
  return path;
}

/**
 * 朝目标迈一步。返回 {dir, x, y} 或 null（已到达 / 不可达 / 无路）。
 * 多条同样短的路时按 N→E→S→W 固定顺序取第一条，保证可复现。
 */
export function stepToward(world, from, to, opts = {}) {
  if (from.x === to.x && from.y === to.y) return null;
  const { dist } = bfs(world, to, opts); // 从目标反向 BFS，取邻居里距离最小的
  let best = null;
  for (const dir of DIRECTIONS) {
    const probe = probeStep(world, from.x, from.y, dir);
    if (probe.blocked) continue;
    const { x: nx, y: ny } = probe.target;
    if (!(opts.passable ?? (() => true))(nx, ny)) continue;
    const d = dist.get(key(nx, ny));
    if (d === undefined) continue;
    if (!best || d < best.d) best = { dir, x: nx, y: ny, d };
  }
  return best;
}

/** 朝远离目标的方向逃跑若干格（狼被吓退时用）。 */
export function fleeFrom(world, from, threat, steps, opts = {}) {
  const passable = opts.passable ?? (() => true);
  let cur = { x: from.x, y: from.y };
  let moved = 0;
  for (let i = 0; i < steps; i += 1) {
    let best = null;
    for (const dir of DIRECTIONS) {
      const probe = probeStep(world, cur.x, cur.y, dir);
      if (probe.blocked) continue;
      const { x: nx, y: ny } = probe.target;
      if (!passable(nx, ny)) continue;
      const d = Math.abs(nx - threat.x) + Math.abs(ny - threat.y);
      if (!best || d > best.d) best = { x: nx, y: ny, d, dir };
    }
    const here = Math.abs(cur.x - threat.x) + Math.abs(cur.y - threat.y);
    if (!best || best.d <= here) break; // 退无可退就停下，不原地打转
    cur = { x: best.x, y: best.y };
    moved += 1;
  }
  return { x: cur.x, y: cur.y, moved };
}

/** 方向向量 → 方向名（野兽转身用）。 */
export function dirFromDelta(dx, dy) {
  for (const dir of DIRECTIONS) {
    const v = DIR_VECTOR[dir];
    if (v.dx === Math.sign(dx) && v.dy === Math.sign(dy)) return dir;
  }
  return null;
}
