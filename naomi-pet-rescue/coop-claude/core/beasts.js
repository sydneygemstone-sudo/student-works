/**
 * core/beasts.js — 🐺 狼与 🦁 狮子的回合行为。
 *
 * 两头野兽都只在**共同回合结算时**动，每回合 1 步：游戏仍然是回合制，
 * 时间不会自己流逝，孩子想看多久地图都行。
 *
 *  - 狼盯着玩家：走到离最近的玩家还差一格就停下（不踩进玩家格），
 *    结算时贴着谁，谁就掉一只怀里的小动物、全队勇气 -1，然后狼退开一格，
 *    不会连着咬。只有小熊能花 1 步把它吓退。
 *  - 狮子不追玩家，它去找还没被救走的小动物。只要有玩家站在它旁边，
 *    它这回合就被牵制住不动 —— 这就是「一个牵制、一个去救」的合作点。
 *  - 家门口（曼哈顿距离 ≤ 1）是安全区，两头野兽都进不来。
 *
 * Author: Claude Code (Claude Opus)
 */

import {
  HOME, ROLE_LIST, WOLF_SCARE_PUSHBACK, WOLF_STUN_ROUNDS,
  LION_SCATTER_MIN_DISTANCE,
} from './constants.js';
import { bfs, stepToward, fleeFrom, dirFromDelta } from './pathfind.js';
import { inBounds, isHome, TERRAIN_MAP } from './world.js';

/** 家门口的安全区：家本身及其四邻，野兽不得入内。 */
export function isSafeZone(x, y) {
  return Math.abs(x - HOME.x) + Math.abs(y - HOME.y) <= 1;
}

export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * 野兽的可通行判断：不能进安全区，也不能和另一头野兽叠在一起。
 */
export function beastPassable(world, self) {
  const others = world.beasts.filter((b) => b !== self).map((b) => `${b.x},${b.y}`);
  return (x, y) => {
    if (!inBounds(x, y)) return false;
    if (isSafeZone(x, y)) return false;
    if (others.includes(`${x},${y}`)) return false;
    return true;
  };
}

/** 某格上是否站着玩家。 */
export function playerAt(players, x, y) {
  for (const role of ROLE_LIST) {
    const p = players[role];
    if (p.x === x && p.y === y) return p;
  }
  return null;
}

/** 与野兽正交相邻（或同格）的玩家列表。 */
export function adjacentPlayers(players, beast, distance = 1) {
  return ROLE_LIST
    .map((role) => players[role])
    .filter((p) => manhattan(p, beast) <= distance);
}

/**
 * 🐺 狼走一步：朝最近的玩家逼近，但绝不踩进玩家所在的格子。
 * @returns {{moved:boolean, from:{x,y}, to:{x,y}, target:string|null}}
 */
export function moveWolf(world, wolf, players) {
  const from = { x: wolf.x, y: wolf.y };
  const passable = beastPassable(world, wolf);
  // 目标：BFS 步数最近的玩家（平手时按 ROLE_LIST 顺序，保证可复现）
  const { dist } = bfs(world, wolf, { passable: (x, y) => passable(x, y) || playerAt(players, x, y) !== null });
  let target = null;
  for (const role of ROLE_LIST) {
    const p = players[role];
    const d = dist.get(`${p.x},${p.y}`);
    if (d === undefined) continue;
    if (!target || d < target.d) target = { role, p, d };
  }
  if (!target) return { moved: false, from, to: from, target: null };
  if (target.d <= 1) return { moved: false, from, to: from, target: target.role }; // 已经贴上了

  const step = stepToward(world, wolf, target.p, {
    passable: (x, y) => passable(x, y) && playerAt(players, x, y) === null,
  });
  if (!step) return { moved: false, from, to: from, target: target.role };

  wolf.x = step.x;
  wolf.y = step.y;
  wolf.facing = dirFromDelta(step.x - from.x, step.y - from.y) ?? wolf.facing;
  return { moved: true, from, to: { x: wolf.x, y: wolf.y }, target: target.role };
}

/**
 * 🦁 狮子走一步：被玩家牵制就原地不动，否则朝最近的野生小动物逼近。
 * @returns {{moved:boolean, distracted:boolean, from, to, targetAnimalId:string|null, reached:boolean}}
 */
export function moveLion(world, lion, players, animals) {
  const from = { x: lion.x, y: lion.y };
  const blockers = adjacentPlayers(players, lion);
  if (blockers.length > 0) {
    lion.distracted = true;
    return { moved: false, distracted: true, from, to: from, targetAnimalId: null, reached: false, blockedBy: blockers.map((p) => p.role) };
  }
  lion.distracted = false;

  const passable = beastPassable(world, lion);
  const wild = animals.filter((a) => a.state === 'wild' && !isSafeZone(a.x, a.y));
  if (wild.length === 0) return { moved: false, distracted: false, from, to: from, targetAnimalId: null, reached: false };

  const { dist } = bfs(world, lion, { passable });
  let target = null;
  for (const animal of wild) {
    const d = dist.get(`${animal.x},${animal.y}`);
    if (d === undefined) continue;
    // 平手时取 id 字典序小的，保证可复现
    if (!target || d < target.d || (d === target.d && animal.id < target.animal.id)) target = { animal, d };
  }
  if (!target) return { moved: false, distracted: false, from, to: from, targetAnimalId: null, reached: false };

  const step = stepToward(world, lion, target.animal, { passable });
  if (!step) return { moved: false, distracted: false, from, to: from, targetAnimalId: target.animal.id, reached: false };

  lion.x = step.x;
  lion.y = step.y;
  lion.facing = dirFromDelta(step.x - from.x, step.y - from.y) ?? lion.facing;
  const reached = lion.x === target.animal.x && lion.y === target.animal.y;
  return {
    moved: true, distracted: false, from, to: { x: lion.x, y: lion.y },
    targetAnimalId: target.animal.id, reached,
  };
}

/**
 * 小动物被狮子叼走后，换一个离狮子够远、离家不太近的地方重新躲起来。
 * 用确定性挑选（BFS 距离 → 坐标序），不摇骰子，方便复现与测试。
 */
export function scatterAnimal(world, animal, lion) {
  const passable = (x, y) => !isSafeZone(x, y) && !isHome(x, y);
  const { dist } = bfs(world, lion, { passable });
  const occupied = new Set([
    ...world.animals.filter((a) => a !== animal && a.state === 'wild').map((a) => `${a.x},${a.y}`),
    ...world.beasts.map((b) => `${b.x},${b.y}`),
  ]);

  let best = null;
  for (const [cellKey, d] of dist) {
    if (d < LION_SCATTER_MIN_DISTANCE) continue;
    if (occupied.has(cellKey)) continue;
    const [xs, ys] = cellKey.split(',');
    const x = Number(xs);
    const y = Number(ys);
    if (TERRAIN_MAP[y][x] === 'R') continue;
    // 尽量挑「刚好够远」的地方：别把小动物扔到天涯海角，孩子还得救得回来
    if (!best || d < best.d || (d === best.d && (y < best.y || (y === best.y && x < best.x)))) {
      best = { x, y, d };
    }
  }
  if (!best) return null;
  animal.x = best.x;
  animal.y = best.y;
  return { x: best.x, y: best.y, distance: best.d };
}

/**
 * 让狼沿远离某人的方向退开。
 * @param {number} steps 退几格
 * @param {number} stun 退完发愣几个回合（0 = 下回合照样来）
 */
export function pushWolfBack(world, wolf, threat, steps, stun) {
  const passable = beastPassable(world, wolf);
  const landed = fleeFrom(world, wolf, threat, steps, { passable });
  const from = { x: wolf.x, y: wolf.y };
  wolf.x = landed.x;
  wolf.y = landed.y;
  wolf.stunned = stun;
  wolf.facing = dirFromDelta(landed.x - threat.x, landed.y - threat.y) ?? wolf.facing;
  return { from, to: { x: wolf.x, y: wolf.y }, pushed: landed.moved };
}

/** 🐻💢 小熊吼一声把狼吓退：退开 3 格，并发愣一个回合。 */
export function scareWolf(world, wolf, bear) {
  return pushWolfBack(world, wolf, bear, WOLF_SCARE_PUSHBACK, WOLF_STUN_ROUNDS);
}
