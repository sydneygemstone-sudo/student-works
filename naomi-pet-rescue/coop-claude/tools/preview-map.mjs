/**
 * tools/preview-map.mjs — 开发用：在终端把整张 15×15 花园 + 树篱迷宫画出来。
 *
 * 仅供开发调试与关卡预算核对，不会被客户端加载，孩子的界面里没有全图。
 * 用法：node tools/preview-map.mjs
 *
 * Author: Claude Code (Claude Opus)
 */

import { GRID_SIZE, HOME, TERRAIN, MAZE_REGIONS } from '../core/constants.js';
import { buildHedgeWalls, hasHedge, findDeadEnds, findGazebos, mazeOpenings, solveMaze } from '../core/maze.js';
import { buildWorld, probeStep } from '../core/world.js';

const world = buildWorld();
const walls = world.walls;

const TERRAIN_CHAR = {
  [TERRAIN.GRASS]: '·',
  [TERRAIN.FOREST]: '♣',
  [TERRAIN.ROCK]: '▓',
  [TERRAIN.NET]: '#',
  [TERRAIN.HOME]: 'H',
  [TERRAIN.DECOY]: 'D',
};

const marks = new Map();
const mark = (x, y, ch) => marks.set(`${x},${y}`, ch);
for (const a of world.animals) mark(a.x, a.y, 'a');
for (const g of world.gifts) mark(g.x, g.y, 'g');
for (const e of world.energies) mark(e.x, e.y, '*');
for (const b of world.beasts) mark(b.x, b.y, b.kind === 'wolf' ? 'W' : 'L');
mark(HOME.x, HOME.y, 'H');

// 每格画成 3 字符宽，格间竖线表示树篱
let out = '     ' + Array.from({ length: GRID_SIZE }, (_, x) => String(x).padStart(2, ' ') + ' ').join('') + '\n';
for (let y = 0; y < GRID_SIZE; y += 1) {
  // 本行格子 + 东西向树篱
  let row = String(y).padStart(3, ' ') + ' ';
  for (let x = 0; x < GRID_SIZE; x += 1) {
    const ch = marks.get(`${x},${y}`) ?? TERRAIN_CHAR[world.grid[y][x]] ?? '?';
    row += ` ${ch}`;
    row += hasHedge(walls, x, y, 'E') && x < GRID_SIZE - 1 ? '|' : ' ';
  }
  out += row + '\n';
  // 南向树篱
  if (y === GRID_SIZE - 1) break;
  let under = '    ';
  for (let x = 0; x < GRID_SIZE; x += 1) {
    under += hasHedge(walls, x, y, 'S') ? ' ──' : '   ';
  }
  out += under + '\n';
}
console.log(out);
console.log('图例： H=家  D=假房子  a=小动物  g=礼盒  *=能量星  W=狼  L=狮子  ♣=森林  ▓=石头  #=绳网  |──=树篱');

const gazebos = findGazebos(walls);
console.log('\n花亭：', JSON.stringify(gazebos));
console.log('死胡同数：', findDeadEnds(walls).length, JSON.stringify(findDeadEnds(walls)));

for (const region of MAZE_REGIONS) {
  const openings = mazeOpenings().filter((o) => o.region === region.id);
  const entrance = openings.find((o) => o.kind === 'entrance');
  const exit = openings.find((o) => o.kind === 'exit');
  const gazebo = gazebos[region.id];
  const toGazebo = solveMaze(walls, entrance.outside, gazebo);
  const backOut = solveMaze(walls, gazebo, exit.outside);
  console.log(`\n${region.label}(${region.id})  入口${JSON.stringify(entrance.outside)} → 花亭(${gazebo.x},${gazebo.y}) = ${toGazebo ? toGazebo.length - 1 : '✗'} 步`
    + `；花亭 → 出口${JSON.stringify(exit.outside)} = ${backOut ? backOut.length - 1 : '✗'} 步`);
}

// 家 → 每只动物的最短步数（只算树篱与石头，不含地形加权），用于回合预算
const stepsFromHome = (target) => {
  const seen = new Set([`${HOME.x},${HOME.y}`]);
  let frontier = [{ ...HOME }];
  let d = 0;
  while (frontier.length) {
    if (frontier.some((c) => c.x === target.x && c.y === target.y)) return d;
    const next = [];
    for (const cur of frontier) {
      for (const dir of ['N', 'E', 'S', 'W']) {
        const probe = probeStep(world, cur.x, cur.y, dir);
        if (probe.blocked) continue;
        const k = `${probe.target.x},${probe.target.y}`;
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(probe.target);
      }
    }
    frontier = next;
    d += 1;
  }
  return Infinity;
};

console.log('\n家 → 各小动物最短步数：');
let total = 0;
for (const a of world.animals) {
  const d = stepsFromHome(a);
  total += d;
  console.log(`  ${a.emoji} ${a.name.padEnd(6, '　')} (${a.x},${a.y})  ${d} 步  往返 ${d * 2}`);
}
console.log(`  合计单程 ${total} 步，全部单独往返 ${total * 2} 步（熊一次带 2 只可省下一部分）`);
