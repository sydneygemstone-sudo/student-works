/**
 * core/maze.js — Naomi 创意 2：东北角 4×4 树篱迷宫 (x: 5~8, y: 0~3)
 *
 * 设计要点：
 *  - 树篱被建模为「格子之间的边墙」而不是整格障碍。4×4 只有 16 格，
 *    用边墙才能同时容纳入口花廊、核心花亭、出口拱门与 2 个浅死胡同，
 *    并且边墙天然对应 3D 中立在格缝上的薄高墙体，便于相机碰撞与视线遮挡。
 *  - 迷宫四周包一圈树篱，只有 2 个开口：南侧「入口花廊」与西侧「出口拱门」。
 *  - 核心花亭 (7,1) 守护着待救的第 1 只动物「小兔宝宝」。
 *  - 保证存在一条从入口花廊到花亭、再到出口拱门的无阻挡正确通路。
 *
 * Author: Claude Code (Claude Opus)
 */

import { MAZE_REGION, DIR_VECTOR, DIR_OPPOSITE, DIRECTIONS, GRID_SIZE } from './constants.js';

/** 迷宫核心花亭（守护小兔宝宝）。 */
export const MAZE_GAZEBO = Object.freeze({ x: 7, y: 1 });

/** 入口花廊：(5,3) 的南侧开口，从花园中部 (5,4) 进入。 */
export const MAZE_ENTRANCE = Object.freeze({ x: 5, y: 3, dir: 'S', outside: Object.freeze({ x: 5, y: 4 }) });

/** 出口拱门：(5,0) 的西侧开口，通往花园西北 (4,0)。 */
export const MAZE_EXIT = Object.freeze({ x: 5, y: 0, dir: 'W', outside: Object.freeze({ x: 4, y: 0 }) });

/** 2 个浅死胡同（深度 2）。 */
export const MAZE_DEAD_ENDS = Object.freeze([
  Object.freeze({ x: 8, y: 3, label: '东南浅死胡同', depth: 2 }),
  Object.freeze({ x: 5, y: 2, label: '入口旁浅死胡同', depth: 1 }),
]);

/**
 * 迷宫内部「可通行的格间通道」白名单。
 * 未列出的内部边即为树篱墙。
 */
export const MAZE_PASSAGES = Object.freeze([
  // —— 主通路：入口花廊 → 花亭 ——
  [[5, 3], [6, 3]],
  [[6, 3], [6, 2]],
  [[6, 2], [7, 2]],
  [[7, 2], [7, 1]], // 抵达核心花亭
  // —— 主通路：花亭 → 出口拱门 ——
  [[7, 1], [7, 0]],
  [[7, 0], [6, 0]],
  [[6, 0], [5, 0]],
  // —— 东南岔路（通往浅死胡同 (8,3)）——
  [[6, 3], [7, 3]],
  [[7, 3], [8, 3]],
  // —— 东侧回环 ——
  [[7, 2], [8, 2]],
  [[8, 2], [8, 1]],
  [[8, 1], [8, 0]],
  [[8, 0], [7, 0]],
  // —— 入口旁的浅死胡同 (5,2)：刚进门直走一步就没路了，是练习「退路箭头」的最佳位置 ——
  [[5, 2], [5, 3]],
  // —— 西侧回环 ——
  [[5, 0], [5, 1]],
  [[5, 1], [6, 1]],
  // —— 中部回环 ——
  [[6, 0], [6, 1]],
  [[6, 1], [6, 2]],
]);

export function wallKey(x, y, dir) {
  return `${x},${y},${dir}`;
}

export function inMaze(x, y) {
  return x >= MAZE_REGION.x0 && x <= MAZE_REGION.x1 && y >= MAZE_REGION.y0 && y <= MAZE_REGION.y1;
}

function dirBetween(ax, ay, bx, by) {
  for (const dir of DIRECTIONS) {
    const v = DIR_VECTOR[dir];
    if (ax + v.dx === bx && ay + v.dy === by) return dir;
  }
  throw new Error(`(${ax},${ay}) 与 (${bx},${by}) 不相邻，无法定义通道`);
}

/**
 * 构建树篱边墙集合。返回 Set<"x,y,DIR">，每一道墙在两侧各存一份，
 * 因此 hasHedge() 从任意一侧查询都成立。
 */
export function buildHedgeWalls() {
  const walls = new Set();
  const addWall = (x, y, dir) => {
    walls.add(wallKey(x, y, dir));
    const v = DIR_VECTOR[dir];
    const nx = x + v.dx;
    const ny = y + v.dy;
    walls.add(wallKey(nx, ny, DIR_OPPOSITE[dir]));
  };

  const passages = new Set();
  for (const [[ax, ay], [bx, by]] of MAZE_PASSAGES) {
    const dir = dirBetween(ax, ay, bx, by);
    passages.add(wallKey(ax, ay, dir));
    passages.add(wallKey(bx, by, DIR_OPPOSITE[dir]));
  }

  for (let y = MAZE_REGION.y0; y <= MAZE_REGION.y1; y += 1) {
    for (let x = MAZE_REGION.x0; x <= MAZE_REGION.x1; x += 1) {
      for (const dir of DIRECTIONS) {
        const v = DIR_VECTOR[dir];
        const nx = x + v.dx;
        const ny = y + v.dy;
        const neighbourInWorld = nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE;
        if (!neighbourInWorld) continue; // 世界外墙由边界检查负责，不重复建树篱

        if (inMaze(nx, ny)) {
          // 内部边：不在通道白名单里的一律是树篱
          if (!passages.has(wallKey(x, y, dir))) addWall(x, y, dir);
        } else {
          // 周界边：只有入口花廊与出口拱门是开口
          const isEntrance = x === MAZE_ENTRANCE.x && y === MAZE_ENTRANCE.y && dir === MAZE_ENTRANCE.dir;
          const isExit = x === MAZE_EXIT.x && y === MAZE_EXIT.y && dir === MAZE_EXIT.dir;
          if (!isEntrance && !isExit) addWall(x, y, dir);
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

/** 返回迷宫区域内所有格子的坐标列表。 */
export function mazeCells() {
  const cells = [];
  for (let y = MAZE_REGION.y0; y <= MAZE_REGION.y1; y += 1) {
    for (let x = MAZE_REGION.x0; x <= MAZE_REGION.x1; x += 1) cells.push({ x, y });
  }
  return cells;
}

/**
 * 在迷宫内做 BFS 寻路（只考虑树篱，不考虑地形），返回坐标数组或 null。
 * 起点/终点允许是迷宫外紧贴开口的格子。
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
