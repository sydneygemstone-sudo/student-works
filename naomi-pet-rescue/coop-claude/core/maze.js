/**
 * core/maze.js — Naomi 创意 2：树篱迷宫（R2 起为两处，北 6×6 + 南 5×5）
 *
 * 设计要点：
 *  - 树篱仍然被建模为「格子之间的边墙」而不是整格障碍：边墙天然对应
 *    3D 中立在格缝上的薄高墙体，便于相机碰撞与视线遮挡。
 *  - 布局由**固定种子**的 DFS 生成，所以每次开局都是同一座迷宫（孩子能记路），
 *    同时比手写通道表丰富得多。
 *  - 生成完美迷宫后主动打通若干内墙形成回环，把死胡同压到目标数量：
 *    死胡同太多对 6–9 岁太劝退，太少又不像迷宫。
 *  - 每区四周包一圈树篱，只有 2 个开口（入口花廊 + 出口拱门）。
 *  - 核心花亭坐标固定（关卡预算可控、孩子第二次玩能记住地方），守护着一只待救小动物。
 *
 * Author: Claude Code (Claude Opus)
 */

import { MAZE_REGIONS, DIR_VECTOR, DIR_OPPOSITE, DIRECTIONS, GRID_SIZE } from './constants.js';
import { createRng } from './rng.js';

/**
 * 每区的开口、花亭与「有多绕」的预算。开口坐标必须落在区域边缘且朝区域外。
 *
 * loopRatio 是关键的儿童友好旋钮：DFS 出来的完美迷宫在 6×6 上最短路能到 30 多步，
 * 对 6–9 岁完全走不完。打通一部分内墙形成回环后，最短路压到 10 步以内，
 * 但岔路、死胡同和有限视野都还在 —— 仍然要探索、要记路，只是不再劝退。
 */
export const MAZE_OPENINGS = Object.freeze({
  north: Object.freeze({
    entrance: Object.freeze({ x: 9, y: 5, dir: 'S', outside: Object.freeze({ x: 9, y: 6 }), label: '玫瑰花廊' }),
    exit: Object.freeze({ x: 9, y: 2, dir: 'W', outside: Object.freeze({ x: 8, y: 2 }), label: '玫瑰拱门' }),
    gazebo: Object.freeze({ x: 12, y: 2 }),
    deadEndTarget: 4,
    loopRatio: 0.20,
  }),
  south: Object.freeze({
    // 薄荷迷宫窝在西南角，只有北 / 东两边能开口（西、南都是世界围墙）。
    // 入口开在离家最近的 (4,10)，否则从家跑过去就要 7 步，还没进门预算先花掉一半。
    entrance: Object.freeze({ x: 4, y: 10, dir: 'N', outside: Object.freeze({ x: 4, y: 9 }), label: '薄荷花廊' }),
    exit: Object.freeze({ x: 4, y: 13, dir: 'E', outside: Object.freeze({ x: 5, y: 13 }), label: '薄荷拱门' }),
    gazebo: Object.freeze({ x: 1, y: 12 }),
    deadEndTarget: 3,
    loopRatio: 0.20,
  }),
});

export function wallKey(x, y, dir) {
  return `${x},${y},${dir}`;
}

function regionOf(x, y) {
  return MAZE_REGIONS.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) ?? null;
}

/** (x,y) 是否落在任意一处迷宫里。 */
export function inMaze(x, y) {
  return regionOf(x, y) !== null;
}

/** 两格是否同属一处迷宫。 */
function sameRegion(ax, ay, bx, by) {
  const a = regionOf(ax, ay);
  return a !== null && a === regionOf(bx, by);
}

/** 区域内的全部格子，按 y 再按 x 排序（保证确定性）。 */
export function regionCells(region) {
  const cells = [];
  for (let y = region.y0; y <= region.y1; y += 1) {
    for (let x = region.x0; x <= region.x1; x += 1) cells.push({ x, y });
  }
  return cells;
}

/** 所有迷宫区域的格子。 */
export function mazeCells() {
  return MAZE_REGIONS.flatMap((region) => regionCells(region));
}

/** 通道集合的双向写入 / 查询。 */
function addPassage(passages, x, y, dir) {
  const v = DIR_VECTOR[dir];
  passages.add(wallKey(x, y, dir));
  passages.add(wallKey(x + v.dx, y + v.dy, DIR_OPPOSITE[dir]));
}

function hasPassage(passages, x, y, dir) {
  return passages.has(wallKey(x, y, dir));
}

/**
 * 用固定种子的 DFS 生成一处迷宫的内部通道，再打通回环把死胡同压到预算内。
 * @returns {Set<string>} 通道集合（双向）
 */
export function generateRegionPassages(region) {
  const opening = MAZE_OPENINGS[region.id];
  const rng = createRng(region.seed);
  const passages = new Set();
  const inRegion = (x, y) => x >= region.x0 && x <= region.x1 && y >= region.y0 && y <= region.y1;

  // —— 1) DFS 生成完美迷宫（从入口格出发）——
  const start = { x: opening.entrance.x, y: opening.entrance.y };
  const visited = new Set([`${start.x},${start.y}`]);
  const stack = [start];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const candidates = [];
    for (const dir of DIRECTIONS) {
      const v = DIR_VECTOR[dir];
      const nx = cur.x + v.dx;
      const ny = cur.y + v.dy;
      if (!inRegion(nx, ny)) continue;
      if (visited.has(`${nx},${ny}`)) continue;
      candidates.push({ dir, x: nx, y: ny });
    }
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    const pick = candidates[Math.floor(rng() * candidates.length)];
    addPassage(passages, cur.x, cur.y, pick.dir);
    visited.add(`${pick.x},${pick.y}`);
    stack.push({ x: pick.x, y: pick.y });
  }

  // —— 2) 打通回环：把「完美迷宫」变成有环的花园迷宫，最短路从 30 多步压到 10 步内 ——
  const innerWalls = [];
  for (const cell of regionCells(region)) {
    for (const dir of ['E', 'S']) { // 只枚举东 / 南，避免同一道墙数两次
      const v = DIR_VECTOR[dir];
      const nx = cell.x + v.dx;
      const ny = cell.y + v.dy;
      if (!inRegion(nx, ny)) continue;
      if (hasPassage(passages, cell.x, cell.y, dir)) continue;
      innerWalls.push({ x: cell.x, y: cell.y, dir });
    }
  }
  const loopCount = Math.floor(innerWalls.length * (opening.loopRatio ?? 0));
  const shuffledWalls = innerWalls.slice();
  for (let i = shuffledWalls.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledWalls[i], shuffledWalls[j]] = [shuffledWalls[j], shuffledWalls[i]];
  }
  for (const wall of shuffledWalls.slice(0, loopCount)) {
    addPassage(passages, wall.x, wall.y, wall.dir);
  }

  // —— 3) 把死胡同压到预算 ——
  const protectedCells = new Set([
    `${opening.entrance.x},${opening.entrance.y}`,
    `${opening.exit.x},${opening.exit.y}`,
  ]);
  const openingsOf = (cell) => DIRECTIONS.filter((dir) => hasPassage(passages, cell.x, cell.y, dir));
  const deadEndsNow = () => regionCells(region)
    .filter((cell) => !protectedCells.has(`${cell.x},${cell.y}`))
    .filter((cell) => openingsOf(cell).length === 1);

  let guard = 0;
  while (deadEndsNow().length > opening.deadEndTarget && guard++ < 200) {
    // 每次挑「距离入口最近」的死胡同打通一道墙：保留远处那些真正需要探索的死路
    const candidates = deadEndsNow().sort((a, b) => (
      (Math.abs(a.x - start.x) + Math.abs(a.y - start.y)) - (Math.abs(b.x - start.x) + Math.abs(b.y - start.y))
      || a.y - b.y || a.x - b.x
    ));
    const cell = candidates[0];
    const closed = DIRECTIONS.filter((dir) => {
      const v = DIR_VECTOR[dir];
      const nx = cell.x + v.dx;
      const ny = cell.y + v.dy;
      return inRegion(nx, ny) && !hasPassage(passages, cell.x, cell.y, dir);
    });
    if (closed.length === 0) break;
    addPassage(passages, cell.x, cell.y, closed[Math.floor(rng() * closed.length)]);
  }

  return passages;
}

/**
 * 构建全部树篱边墙。返回 Set<"x,y,DIR">，每一道墙在两侧各存一份，
 * 因此 hasHedge() 从任意一侧查询都成立。
 */
export function buildHedgeWalls() {
  const walls = new Set();
  const addWall = (x, y, dir) => {
    walls.add(wallKey(x, y, dir));
    const v = DIR_VECTOR[dir];
    walls.add(wallKey(x + v.dx, y + v.dy, DIR_OPPOSITE[dir]));
  };

  for (const region of MAZE_REGIONS) {
    const opening = MAZE_OPENINGS[region.id];
    const passages = generateRegionPassages(region);

    for (const cell of regionCells(region)) {
      for (const dir of DIRECTIONS) {
        const v = DIR_VECTOR[dir];
        const nx = cell.x + v.dx;
        const ny = cell.y + v.dy;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue; // 世界外墙由边界检查负责

        if (sameRegion(cell.x, cell.y, nx, ny)) {
          // 内部边：不在通道集合里的一律是树篱
          if (!hasPassage(passages, cell.x, cell.y, dir)) addWall(cell.x, cell.y, dir);
        } else {
          // 周界边：只有入口花廊与出口拱门是开口
          const isEntrance = cell.x === opening.entrance.x && cell.y === opening.entrance.y && dir === opening.entrance.dir;
          const isExit = cell.x === opening.exit.x && cell.y === opening.exit.y && dir === opening.exit.dir;
          if (!isEntrance && !isExit) addWall(cell.x, cell.y, dir);
        }
      }
    }
  }
  return walls;
}

/** 查询 (x,y) 朝 dir 方向是否被树篱挡住。 */
export function hasHedge(walls, x, y, dir) {
  return walls.has(wallKey(x, y, dir));
}

/**
 * 在网格上做 BFS 寻路（只考虑树篱，不考虑地形），返回坐标数组或 null。
 * 起点 / 终点允许是迷宫外紧贴开口的格子。
 */
export function solveMaze(walls, from, to) {
  const key = (p) => `${p.x},${p.y}`;
  const queue = [from];
  const prev = new Map([[key(from), null]]);
  while (queue.length) {
    const cur = queue.shift();
    if (cur.x === to.x && cur.y === to.y) {
      const path = [];
      let node = cur;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = prev.get(key(node));
      }
      return path;
    }
    for (const dir of DIRECTIONS) {
      const v = DIR_VECTOR[dir];
      const nx = cur.x + v.dx;
      const ny = cur.y + v.dy;
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
      if (hasHedge(walls, cur.x, cur.y, dir)) continue;
      const nk = `${nx},${ny}`;
      if (prev.has(nk)) continue;
      prev.set(nk, cur);
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

/** 找出迷宫区域内所有死胡同（只有一个开口的格子）。 */
export function findDeadEnds(walls) {
  const result = [];
  for (const cell of mazeCells()) {
    let openings = 0;
    for (const dir of DIRECTIONS) {
      const v = DIR_VECTOR[dir];
      const nx = cell.x + v.dx;
      const ny = cell.y + v.dy;
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
      if (!hasHedge(walls, cell.x, cell.y, dir)) openings += 1;
    }
    if (openings === 1) result.push(cell);
  }
  return result;
}

/**
 * 每处迷宫的核心花亭（藏一只待救小动物）。坐标是固定的，
 * 这样关卡预算可控、孩子第二次玩能记住地方；depth 是从入口走到它的实际步数。
 */
export function findGazebos(walls) {
  const gazebos = {};
  for (const region of MAZE_REGIONS) {
    const opening = MAZE_OPENINGS[region.id];
    const gazebo = opening.gazebo;
    const path = solveMaze(walls, { x: opening.entrance.x, y: opening.entrance.y }, gazebo);
    if (!path) throw new Error(`${region.label}的花亭 (${gazebo.x},${gazebo.y}) 走不到，迷宫生成有问题`);
    gazebos[region.id] = {
      x: gazebo.x, y: gazebo.y, depth: path.length - 1, region: region.id, label: region.label,
    };
  }
  return gazebos;
}

/** 供 3D 渲染使用：把边墙集合转成去重后的墙体线段列表。 */
export function hedgeSegments(walls) {
  const seen = new Set();
  const segments = [];
  for (const raw of walls) {
    const [xs, ys, dir] = raw.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const v = DIR_VECTOR[dir];
    const nx = x + v.dx;
    const ny = y + v.dy;
    // 规范化：以较小坐标一侧为代表，避免同一道墙输出两次
    const canonical = (nx < x || ny < y) ? wallKey(nx, ny, DIR_OPPOSITE[dir]) : raw;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const [cxs, cys, cdir] = canonical.split(',');
    const cx = Number(cxs);
    const cy = Number(cys);
    segments.push({
      x: cx,
      y: cy,
      dir: cdir,
      // 墙体中心（以格中心为 0.5 偏移的世界坐标）
      cx: cx + 0.5 + DIR_VECTOR[cdir].dx * 0.5,
      cy: cy + 0.5 + DIR_VECTOR[cdir].dy * 0.5,
      horizontal: cdir === 'N' || cdir === 'S',
    });
  }
  return segments;
}

/** 所有开口（入口 + 出口）的扁平列表，3D 拱门与小地图都用它。 */
export function mazeOpenings() {
  return MAZE_REGIONS.flatMap((region) => {
    const o = MAZE_OPENINGS[region.id];
    return [
      { ...o.entrance, region: region.id, kind: 'entrance' },
      { ...o.exit, region: region.id, kind: 'exit' },
    ];
  });
}
