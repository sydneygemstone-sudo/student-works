/**
 * core/world.js — 9×9 花园世界的构建：地形、树篱迷宫、8 只小动物、3 个礼盒。
 *
 * 地图本体是固定字面量（确定性 = 可测试 + 孩子每次玩到同一个花园），
 * 只有礼盒内容用种子化随机决定。
 *
 * Author: Claude Code (Claude Opus)
 */

import {
  GRID_SIZE, HOME, TERRAIN, TERRAIN_COST, TERRAIN_BLOCKS_SIGHT,
  DIRECTIONS, DIR_VECTOR, TOTAL_ANIMALS, TOTAL_GIFTS,
} from './constants.js';
import { buildHedgeWalls, hasHedge, MAZE_GAZEBO } from './maze.js';
import { createRng, shuffle } from './rng.js';

/**
 * 地形图：每行一条字符串，y=0 为最北。
 *  G=草地(1)  F=森林(2)  R=石头(不可通过)  N=森林绳网(3)  H=家园
 *  东北角 x5~8 / y0~3 为树篱迷宫区域，地形全为草地，阻挡由树篱边墙负责。
 */
export const TERRAIN_MAP = Object.freeze([
  'GFGGGGGGG',
  'GGRGGGGGG',
  'FGGFGGGGG',
  'GRGGNGGGG',
  'GGGGHGGRG',
  'GFGGGGFGG',
  'GGRGNGGGF',
  'FGGGGRGGG',
  'GGGFGGGRG',
]);

const CHAR_TO_TERRAIN = Object.freeze({
  G: TERRAIN.GRASS,
  F: TERRAIN.FOREST,
  R: TERRAIN.ROCK,
  N: TERRAIN.NET,
  H: TERRAIN.HOME,
});

/** 8 只待救小动物。第 1 只「小兔宝宝」被树篱迷宫核心花亭守护。 */
export const ANIMAL_SPAWNS = Object.freeze([
  Object.freeze({ id: 'bunny_baby', name: '小兔宝宝', emoji: '🐇', x: MAZE_GAZEBO.x, y: MAZE_GAZEBO.y, inMaze: true }),
  Object.freeze({ id: 'hedgehog', name: '小刺猬', emoji: '🦔', x: 1, y: 1, inMaze: false }),
  Object.freeze({ id: 'squirrel', name: '小松鼠', emoji: '🐿️', x: 3, y: 2, inMaze: false }),
  Object.freeze({ id: 'owl', name: '小猫头鹰', emoji: '🦉', x: 1, y: 5, inMaze: false }),
  Object.freeze({ id: 'fox', name: '小狐狸', emoji: '🦊', x: 0, y: 6, inMaze: false }),
  Object.freeze({ id: 'raccoon', name: '小浣熊', emoji: '🦝', x: 8, y: 5, inMaze: false }),
  Object.freeze({ id: 'turtle', name: '小乌龟', emoji: '🐢', x: 6, y: 7, inMaze: false }),
  Object.freeze({ id: 'deer', name: '小鹿', emoji: '🦌', x: 3, y: 8, inMaze: false }),
]);

/** 3 个恶作剧 / 礼物盒子。 */
export const GIFT_SPAWNS = Object.freeze([
  Object.freeze({ id: 'gift_west', x: 2, y: 4 }),
  Object.freeze({ id: 'gift_east', x: 6, y: 4 }),
  Object.freeze({ id: 'gift_south', x: 4, y: 7 }),
]);

export function terrainAt(world, x, y) {
  if (!inBounds(x, y)) return null;
  return world.grid[y][x];
}

export function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
}

export function isHome(x, y) {
  return x === HOME.x && y === HOME.y;
}

export function terrainCost(terrain) {
  return TERRAIN_COST[terrain];
}

export function blocksSight(terrain) {
  return Boolean(TERRAIN_BLOCKS_SIGHT[terrain]);
}

/**
 * 构建一局新世界。
 * @param {object} [options]
 * @param {number} [options.seed] 礼盒内容的随机种子
 */
export function buildWorld(options = {}) {
  const seed = options.seed ?? 20260916;
  const rng = createRng(seed);

  const grid = TERRAIN_MAP.map((row, y) => {
    if (row.length !== GRID_SIZE) throw new Error(`地形图第 ${y} 行长度必须为 ${GRID_SIZE}`);
    return row.split('').map((ch) => {
      const terrain = CHAR_TO_TERRAIN[ch];
      if (!terrain) throw new Error(`未知地形字符 ${ch}`);
      return terrain;
    });
  });

  if (grid[HOME.y][HOME.x] !== TERRAIN.HOME) throw new Error('中心家园必须位于 (4,4)');

  const walls = buildHedgeWalls();

  const animals = ANIMAL_SPAWNS.map((spec) => {
    if (!inBounds(spec.x, spec.y)) throw new Error(`小动物 ${spec.id} 超出地图`);
    if (grid[spec.y][spec.x] === TERRAIN.ROCK) throw new Error(`小动物 ${spec.id} 不能待在石头上`);
    if (isHome(spec.x, spec.y)) throw new Error(`小动物 ${spec.id} 不能一开始就在家里`);
    return { ...spec, state: 'wild', x: spec.x, y: spec.y, carriedBy: null };
  });
  if (animals.length !== TOTAL_ANIMALS) throw new Error(`必须正好有 ${TOTAL_ANIMALS} 只小动物`);

  // 礼盒内容：2 份礼物（勇气）+ 1 份恶作剧（下回合暂停），顺序由种子决定
  const kinds = shuffle(['gift', 'gift', 'prank'], rng);
  const gifts = GIFT_SPAWNS.map((spec, i) => {
    if (grid[spec.y][spec.x] === TERRAIN.ROCK) throw new Error(`礼盒 ${spec.id} 不能放在石头上`);
    if (isHome(spec.x, spec.y)) throw new Error(`礼盒 ${spec.id} 不能放在家里`);
    return { ...spec, kind: kinds[i], opened: false };
  });
  if (gifts.length !== TOTAL_GIFTS) throw new Error(`必须正好有 ${TOTAL_GIFTS} 个礼盒`);

  return { seed, grid, walls, animals, gifts, home: { ...HOME }, size: GRID_SIZE };
}

/**
 * 判断从 (x,y) 朝 dir 走一步是否被挡住（世界外墙 / 石头 / 树篱）。
 * @returns {{blocked:boolean, blocker?:string, target?:{x:number,y:number}}}
 */
export function probeStep(world, x, y, dir) {
  const v = DIR_VECTOR[dir];
  const nx = x + v.dx;
  const ny = y + v.dy;
  if (!inBounds(nx, ny)) return { blocked: true, blocker: 'boundary' };
  if (hasHedge(world.walls, x, y, dir)) return { blocked: true, blocker: 'hedge', target: { x: nx, y: ny } };
  if (world.grid[ny][nx] === TERRAIN.ROCK) return { blocked: true, blocker: 'rock', target: { x: nx, y: ny } };
  return { blocked: false, target: { x: nx, y: ny } };
}

/** 列出从 (x,y) 出发所有不被挡住的方向。 */
export function openDirections(world, x, y) {
  return DIRECTIONS.filter((dir) => !probeStep(world, x, y, dir).blocked);
}

/** 以家园为起点，BFS 计算所有可到达的格子（用于地图连通性校验）。 */
export function reachableCells(world, from = HOME) {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const dir of DIRECTIONS) {
      const probe = probeStep(world, cur.x, cur.y, dir);
      if (probe.blocked) continue;
      const key = `${probe.target.x},${probe.target.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(probe.target);
    }
  }
  return seen;
}
