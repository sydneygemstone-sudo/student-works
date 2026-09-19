// 共同回合制核心规则引擎 — 作者: Codex (GLM 5.3 Max)
'use strict';

const { HOME, terrainAt, costAt, inBounds } = require('./maze');

const MAX_ROUNDS = 14;
const STORM_EVERY = 2;
const MAX_SHIELD = 2;

const ROLES = {
  bear: { name: '小熊', move: 2, carry: 2 },
  bunny: { name: '小兔 Naomi', move: 3, carry: 1 },
};
const DIRS = ['N', 'E', 'S', 'W'];
const DELTA = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

function makePlayer(role, x, y, dir) {
  return {
    role, x, y, dir,
    ap: ROLES[role].move,
    baseMove: ROLES[role].move,
    bonusSteps: 0,
    carrying: [],
    ready: false,
    paused: false,
  };
}

function createGame(solo = false) {
  const animals = [
    { id: 'a1', kind: '小兔宝宝', x: 7, y: 1, carried: null },
    { id: 'a2', kind: '小刺猬', x: 1, y: 3 },
    { id: 'a3', kind: '小松鼠', x: 6, y: 7 },
    { id: 'a4', kind: '小狐狸', x: 2, y: 6 },
    { id: 'a5', kind: '小乌龟', x: 0, y: 5 },
    { id: 'a6', kind: '小鸭子', x: 8, y: 6 },
    { id: 'a7', kind: '小猫咪', x: 3, y: 8 },
    { id: 'a8', kind: '小鸟', x: 0, y: 0 },
  ];
  const boxes = [
    { id: 'b1', x: 2, y: 2, effect: 'courage', amount: 2, opened: false },
    { id: 'b2', x: 6, y: 5, effect: 'courage', amount: 2, opened: false },
    { id: 'b3', x: 5, y: 6, effect: 'pause', opened: false },
  ];
  return {
    solo,
    round: 1,
    phase: 'playing',
    weather: 'sunny',
    stormCountdown: STORM_EVERY,
    courage: 0,
    shield: 0,
    animals,
    boxes,
    players: {
      bear: makePlayer('bear', 3, 5, 'N'),
      bunny: makePlayer('bunny', 5, 5, 'N'),
    },
  };
}

function publicState(g) {
  return JSON.parse(JSON.stringify(g));
}

function turn(g, role, side) {
  const p = g.players[role];
  if (!p || g.phase !== 'playing') return err('无法行动');
  const idx = DIRS.indexOf(p.dir);
  p.dir = DIRS[(idx + (side === 'right' ? 1 : 3)) % 4];
  return ok({ dir: p.dir, ap: p.ap });
}

function move(g, role, forward) {
  const p = g.players[role];
  if (!p || g.phase !== 'playing') return err('无法行动');
  if (p.paused) return err('礼盒恶作剧：本回合暂停移动');
  const [dx, dy] = DELTA[p.dir];
  const sign = forward ? 1 : -1;
  const nx = p.x + dx * sign, ny = p.y + dy * sign;

  if (!inBounds(nx, ny)) return blocked(g, role, '花园边界');
  const t = terrainAt(nx, ny);
  if (t === 'stone' || t === 'hedge') return blocked(g, role, t === 'stone' ? '石头' : '树篱');

  let cost = costAt(nx, ny);
  if (t === 'net' && g.shield > 0) cost = 1;
  if (p.ap < cost) return err('行动点不足', { need: cost, have: p.ap });

  p.ap -= cost;
  p.x = nx; p.y = ny;

  for (const a of g.animals) {
    if (!a.carried && a.x === nx && a.y === ny && p.carrying.length < ROLES[role].carry) {
      a.carried = role;
      p.carrying.push(a.id);
    }
  }
  rescueAtHome(g, role);
  for (const b of g.boxes) {
    if (!b.opened && b.x === nx && b.y === ny) {
      b.opened = true;
      if (b.effect === 'courage') g.courage += b.amount;
      else p.paused = true;
    }
  }
  return ok({ x: p.x, y: p.y, ap: p.ap, terrain: t, cost });
}

function blocked(g, role, what) {
  return err(`前方挡路（${what}）！可以后退一步或换条路`, {
    blocked: true, arrow: 'back-or-turn', ap: g.players[role].ap,
  });
}

function rescueAtHome(g, role) {
  const p = g.players[role];
  if (p.x !== HOME.x || p.y !== HOME.y || !p.carrying.length) return 0;
  let n = 0;
  for (const id of p.carrying.splice(0)) {
    const a = g.animals.find((a) => a.id === id);
    a.carried = 'home';
    a.x = HOME.x; a.y = HOME.y;
    g.courage += 1;
    n++;
  }
  return n;
}

function give(g, fromRole, toRole, animalId) {
  if (g.phase !== 'playing') return err('无法行动');
  const from = g.players[fromRole], to = g.players[toRole];
  if (!from || !to || fromRole === toRole) return err('无效队友');
  const d = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  if (d > 1) return err('需要同格或相邻才能递给队友');
  const id = animalId ?? from.carrying[0];
  if (!id || !from.carrying.includes(id)) return err('怀中没有这只小动物');
  if (to.x === HOME.x && to.y === HOME.y) {
    from.carrying.splice(from.carrying.indexOf(id), 1);
    const a = g.animals.find((a) => a.id === id);
    a.carried = 'home'; a.x = HOME.x; a.y = HOME.y;
    g.courage += 1;
    return ok({ rescued: true });
  }
  if (to.carrying.length >= ROLES[toRole].carry) return err('队友抱不动了');
  from.carrying.splice(from.carrying.indexOf(id), 1);
  to.carrying.push(id);
  const a = g.animals.find((a) => a.id === id);
  a.carried = toRole;
  return ok({ given: true });
}

function support(g, role) {
  const p = g.players[role];
  if (!p || g.phase !== 'playing') return err('无法行动');
  if (p.x !== HOME.x || p.y !== HOME.y) return err('需要站在家园 (4,4)');
  if (p.ap < 1) return err('行动点不足');
  if (g.shield >= MAX_SHIELD) return err('庇护已达上限');
  p.ap -= 1;
  g.shield += 1;
  return ok({ shield: g.shield, ap: p.ap });
}

function boost(g) {
  if (g.phase !== 'playing') return err('无法行动');
  if (g.courage < 2) return err('勇气不足（需要 2 点）');
  if (g.players.bear.bonusSteps > 0 || g.players.bunny.bonusSteps > 0) return err('本回合已加步');
  g.courage -= 2;
  for (const p of [g.players.bear, g.players.bunny]) {
    p.bonusSteps = 2;
    p.ap += 2;
  }
  return ok({ courage: g.courage });
}

function setReady(g, role, ready = true) {
  const p = g.players[role];
  if (!p || g.phase !== 'playing') return err('无法行动');
  p.ready = ready;
  if (g.players.bear.ready && g.players.bunny.ready) {
    advanceRound(g);
    return ok({ roundAdvanced: true });
  }
  return ok({ ready: p.ready });
}

function advanceRound(g) {
  g.stormCountdown -= 1;
  if (g.stormCountdown <= 0) {
    g.weather = 'storm';
    g.stormCountdown = STORM_EVERY;
    if (g.shield > 0) {
      g.shield -= 1;
    } else {
      for (const p of [g.players.bear, g.players.bunny]) {
        if (p.carrying.length) {
          const id = p.carrying.pop();
          const a = g.animals.find((a) => a.id === id);
          a.carried = null; a.x = p.x; a.y = p.y;
        }
      }
    }
  } else {
    g.weather = 'sunny';
  }

  g.round += 1;
  for (const p of [g.players.bear, g.players.bunny]) {
    p.ready = false;
    p.paused = false;
    p.bonusSteps = 0;
    p.ap = p.baseMove;
  }

  if (g.animals.every((a) => a.carried === 'home')) { g.phase = 'won'; return true; }
  if (g.round > MAX_ROUNDS) { g.phase = 'lost'; return true; }
  return false;
}

function lineOfSight(g, r1, r2) {
  const a = g.players[r1], b = g.players[r2];
  if (!a || !b) return false;
  if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > 4) return false;
  let x0 = a.x, y0 = a.y;
  const x1 = b.x, y1 = b.y;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx - dy;
  while (!(x0 === x1 && y0 === y1)) {
    const e2 = 2 * e;
    if (e2 > -dy) { e -= dy; x0 += sx; }
    if (e2 < dx) { e += dx; y0 += sy; }
    if (x0 === x1 && y0 === y1) break;
    const t = terrainAt(x0, y0);
    if (t === 'hedge' || t === 'stone' || t === 'forest') return false;
  }
  return true;
}

function err(message, extra = {}) { return { ok: false, message, ...extra }; }
function ok(data = {}) { return { ok: true, ...data }; }

module.exports = {
  HOME, MAX_ROUNDS, MAX_SHIELD, ROLES, DIRS,
  createGame, publicState, turn, move, give, support, boost, setReady,
  lineOfSight, rescueAtHome,
};
