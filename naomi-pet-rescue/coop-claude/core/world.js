/**
 * core/world.js — 15×15 花园世界的构建：地形、两处树篱迷宫、8 只小动物、
 * 3 个礼盒、6 颗能量星、3 座假房子、1 匹狼、1 头狮子。
 *
 * 地图本体是固定字面量（确定性 = 可测试 + 孩子每次玩到同一个花园，能记路），
 * 树篱布局由固定种子生成，只有礼盒内容用种子化随机决定。
 *
 * Author: Claude Code (Claude Opus)
 */

import {
  GRID_SIZE, HOME, TERRAIN, TERRAIN_COST, TERRAIN_BLOCKS_SIGHT,
  DIRECTIONS, DIR_VECTOR, TOTAL_ANIMALS, TOTAL_GIFTS, TOTAL_ENERGY, TOTAL_DECOYS,
} from './constants.js';
import { buildHedgeWalls, hasHedge, findGazebos, inMaze } from './maze.js';
import { createRng, shuffle } from './rng.js';

/**
 * 地形图：每行一条字符串，y=0 为最北。
 *  G=草地(1)  F=森林(2)  R=石头(不可通过)  N=森林绳网(3)  H=家园  D=假房子
 *  两处迷宫区域（x9~14/y0~5、x0~4/y10~14）地形全为草地，阻挡由树篱边墙负责。
 */
export const TERRAIN_MAP = Object.freeze([
  'GFGGRGGGGGGGGGG',
  'GGGFGGRGGGGGGGG',
  'GRGGGGGGGGGGGGG',
  'GGGDGGFGGGGGGGG',
  'FGGGGNGGGGGGGGG',
  'GGRGGGGGFGGGGGG',
  'GGGGGFGGGGGGFGG',
  'GGNGGGGHGGGDGGG',
  'GFGGRGGGGGGGGFG',
  'GGGGGGRGGGFGGGG',
  'GGGGGGGRGGGGGGF',
  'GGGGGGGGGFGGGGG',
  'GGGGGGGDGGNGGGG',
  'GGGGGGGGGGGRGGG',
  'GGGGGGFGGGGGGRG',
]);

const CHAR_TO_TERRAIN = Object.freeze({
  G: TERRAIN.GRASS,
  F: TERRAIN.FOREST,
  R: TERRAIN.ROCK,
  N: TERRAIN.NET,
  H: TERRAIN.HOME,
  D: TERRAIN.DECOY,
});

/**
 * 6 只在开阔花园里的小动物。另外 2 只由两处迷宫的核心花亭守护，
 * 花亭坐标是算出来的（距入口最远处），所以在 buildWorld 里补上。
 */
export const OPEN_ANIMAL_SPAWNS = Object.freeze([
  Object.freeze({ id: 'hedgehog', name: '小刺猬', emoji: '🦔', kind: 'hedgehog', x: 2, y: 1 }),
  Object.freeze({ id: 'owl', name: '小猫头鹰', emoji: '🦉', kind: 'owl', x: 1, y: 5 }),
  Object.freeze({ id: 'turtle', name: '小乌龟', emoji: '🐢', kind: 'turtle', x: 13, y: 6 }),
  Object.freeze({ id: 'squirrel', name: '小松鼠', emoji: '🐿️', kind: 'squirrel', x: 12, y: 8 }),
  Object.freeze({ id: 'fox', name: '小狐狸', emoji: '🦊', kind: 'fox', x: 13, y: 11 }),
  Object.freeze({ id: 'raccoon', name: '小浣熊', emoji: '🦝', kind: 'raccoon', x: 6, y: 13 }),
]);

/** 两处花亭里的小动物（坐标在 buildWorld 里按花亭算出来）。 */
export const MAZE_ANIMAL_SPAWNS = Object.freeze([
  Object.freeze({ id: 'bunny_baby', name: '小兔宝宝', emoji: '🐇', kind: 'bunny', region: 'north' }),
  Object.freeze({ id: 'deer', name: '小鹿', emoji: '🦌', kind: 'deer', region: 'south' }),
]);

/** 3 个恶作剧 / 礼物盒子。 */
export const GIFT_SPAWNS = Object.freeze([
  Object.freeze({ id: 'gift_west', x: 4, y: 6 }),
  Object.freeze({ id: 'gift_east', x: 11, y: 9 }),
  Object.freeze({ id: 'gift_south', x: 8, y: 11 }),
]);

/** 🌟 6 颗能量星，其中 2 颗藏在迷宫里，作为进迷宫的额外回报。 */
export const ENERGY_SPAWNS = Object.freeze([
  Object.freeze({ id: 'star_w', x: 3, y: 6 }),
  Object.freeze({ id: 'star_e', x: 11, y: 6 }),
  Object.freeze({ id: 'star_n', x: 7, y: 3 }),
  Object.freeze({ id: 'star_s', x: 7, y: 11 }),
  Object.freeze({ id: 'star_maze_n', x: 12, y: 1 }),
  Object.freeze({ id: 'star_maze_s', x: 2, y: 13 }),
]);

/**
 * 🏚️ 3 座假房子。外观和真家很像，走错门要吃苦头。
 * 坐标必须和 TERRAIN_MAP 里的 'D' 一一对应。
 */
export const DECOY_SPAWNS = Object.freeze([
  Object.freeze({ id: 'decoy_nw', x: 3, y: 3, hint: '西北边那座' }),
  Object.freeze({ id: 'decoy_e', x: 11, y: 7, hint: '东边那座' }),
  Object.freeze({ id: 'decoy_s', x: 7, y: 12, hint: '南边那座' }),
]);

/** 🐺🦁 两头野兽的出生点与苏醒回合（前几个回合先让孩子熟悉花园）。 */
export const BEAST_SPAWNS = Object.freeze([
  Object.freeze({ id: 'wolf', kind: 'wolf', name: '灰狼', emoji: '🐺', x: 0, y: 7, facing: 'E', wakeRound: 2 }),
  Object.freeze({ id: 'lion', kind: 'lion', name: '狮子', emoji: '🦁', x: 14, y: 14, facing: 'N', wakeRound: 3 }),
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
  const seed = options.seed ?? 20260919;
  const rng = createRng(seed);

  const grid = TERRAIN_MAP.map((row, y) => {
    if (row.length !== GRID_SIZE) throw new Error(`地形图第 ${y} 行长度必须为 ${GRID_SIZE}，实际 ${row.length}`);
    return row.split('').map((ch) => {
      const terrain = CHAR_TO_TERRAIN[ch];
      if (!terrain) throw new Error(`未知地形字符 ${ch}`);
      return terrain;
    });
  });

  if (grid[HOME.y][HOME.x] !== TERRAIN.HOME) throw new Error(`中心家园必须位于 (${HOME.x},${HOME.y})`);

  const walls = buildHedgeWalls();
  const gazebos = findGazebos(walls);

  const assertPlaceable = (spec, what) => {
    if (!inBounds(spec.x, spec.y)) throw new Error(`${what} ${spec.id} 超出地图`);
    if (grid[spec.y][spec.x] === TERRAIN.ROCK) throw new Error(`${what} ${spec.id} 不能待在石头上`);
    if (isHome(spec.x, spec.y)) throw new Error(`${what} ${spec.id} 不能一开始就在家里`);
  };

  const animals = [
    ...MAZE_ANIMAL_SPAWNS.map((spec) => {
      const gazebo = gazebos[spec.region];
      if (!gazebo) throw new Error(`找不到 ${spec.region} 区的花亭`);
      return { ...spec, x: gazebo.x, y: gazebo.y, inMaze: true };
    }),
    ...OPEN_ANIMAL_SPAWNS.map((spec) => ({ ...spec, inMaze: inMaze(spec.x, spec.y) })),
  ].map((spec) => {
    assertPlaceable(spec, '小动物');
    return { ...spec, state: 'wild', carriedBy: null, homeX: spec.x, homeY: spec.y };
  });
  if (animals.length !== TOTAL_ANIMALS) throw new Error(`必须正好有 ${TOTAL_ANIMALS} 只小动物`);

  // 礼盒内容：2 份礼物（勇气）+ 1 份恶作剧（下回合暂停），顺序由种子决定
  const kinds = shuffle(['gift', 'gift', 'prank'], rng);
  const gifts = GIFT_SPAWNS.map((spec, i) => {
    assertPlaceable(spec, '礼盒');
    return { ...spec, kind: kinds[i], opened: false };
  });
  if (gifts.length !== TOTAL_GIFTS) throw new Error(`必须正好有 ${TOTAL_GIFTS} 个礼盒`);

  const energies = ENERGY_SPAWNS.map((spec) => {
    assertPlaceable(spec, '能量星');
    return { ...spec, taken: false, takenBy: null };
  });
  if (energies.length !== TOTAL_ENERGY) throw new Error(`必须正好有 ${TOTAL_ENERGY} 颗能量星`);

  const decoys = DECOY_SPAWNS.map((spec) => {
    if (grid[spec.y][spec.x] !== TERRAIN.DECOY) {
      throw new Error(`假房子 ${spec.id} 的坐标 (${spec.x},${spec.y}) 与地形图里的 D 对不上`);
    }
    return { ...spec, discovered: false, trips: 0 };
  });
  if (decoys.length !== TOTAL_DECOYS) throw new Error(`必须正好有 ${TOTAL_DECOYS} 座假房子`);
  const decoyCount = grid.flat().filter((t) => t === TERRAIN.DECOY).length;
  if (decoyCount !== TOTAL_DECOYS) throw new Error(`地形图里有 ${decoyCount} 座假房子，应为 ${TOTAL_DECOYS} 座`);

  const beasts = BEAST_SPAWNS.map((spec) => {
    assertPlaceable(spec, '野兽');
    return { ...spec, stunned: 0, distracted: false, lastMove: null, awake: false };
  });

  return {
    seed, grid, walls, animals, gifts, energies, decoys, beasts, gazebos,
    home: { ...HOME }, size: GRID_SIZE,
  };
}

/**
 * 判断从 (x,y) 朝 dir 走一步是否被静态地形挡住（世界外墙 / 石头 / 树篱）。
 * 野兽是动态阻挡，由 game.js 另行判定。
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

/** 列出从 (x,y) 出发所有不被静态地形挡住的方向。 */
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
