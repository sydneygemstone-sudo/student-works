/**
 * client/coords.js — 网格 ↔ 3D 世界坐标的唯一换算入口。
 *
 * 约定：格 (gx, gy) 的中心是 3D 世界的 (gx + 0.5, 0, gy + 0.5)；
 * 网格的 y 轴映射到 3D 的 Z 轴，Y 轴是高度。北 (N) = -Z。
 * 所有朝向、墙体、相机都必须经过这里，避免整张地图被镜像。
 *
 * Author: Claude Code (Claude Opus)
 */

import * as THREE from 'three';
import { DIR_VECTOR } from '/core/constants.js';

/** 格中心 → 3D 坐标。 */
export function toWorld(gx, gy, height = 0) {
  return new THREE.Vector3(gx + 0.5, height, gy + 0.5);
}

/** 连续网格坐标 → 3D 坐标（不再 +0.5）。 */
export function toWorldContinuous(x, y, height = 0) {
  return new THREE.Vector3(x, height, y);
}

/** 方向 → 3D 单位向量（N = -Z，E = +X）。 */
export function dirToVec3(dir) {
  const v = DIR_VECTOR[dir];
  return new THREE.Vector3(v.dx, 0, v.dy);
}

/** 方向 → 绕 Y 轴的朝向角（让模型的 -Z 面朝向该方向）。 */
export function dirToYaw(dir) {
  const v = DIR_VECTOR[dir];
  return Math.atan2(v.dx, -v.dy);
}

/** 朝向的右手方向（越肩相机用）。 */
export function rightOf(forward) {
  return new THREE.Vector3(-forward.z, 0, forward.x);
}

/** 角度最短路径插值，避免转身时绕远路。 */
export function lerpAngle(from, to, t) {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}
