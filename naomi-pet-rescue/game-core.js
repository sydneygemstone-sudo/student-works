/* 小动物回家 —— 纯游戏逻辑（浏览器挂 window.PetRescue，node 下 module.exports）
   难度常量全部在 CONFIG 里，调数字不动规则。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PetRescue = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const CONFIG = {
    GRID: 7,          // 棋盘边长（奇数，家在正中）
    PETS: 8,          // 走丢的小动物数量
    STORM_STEPS: 28,  // 暴风雨到达前的总手数（两人合计）——主要控制时长与难度；启发式模拟中位 22 手、胜率约 96%
    SCARE_EVERY: 4,   // 每隔几手，有一只小动物受惊跑走一格
    BEAR: { moves: 2, carry: 2 }, // 小熊：慢但能抱两只
    BUNNY: { moves: 3, carry: 1 }, // 小兔：快但只能抱一只
  };

  const PET_POOL = [
    { emoji: '🐱', name: '小猫' }, { emoji: '🐶', name: '小狗' }, { emoji: '🐹', name: '小仓鼠' },
    { emoji: '🐥', name: '小鸡' }, { emoji: '🐢', name: '小乌龟' }, { emoji: '🐰', name: '小兔宝宝' },
    { emoji: '🐷', name: '小猪' }, { emoji: '🦆', name: '小鸭' }, { emoji: '🐑', name: '小羊' },
    { emoji: '🐸', name: '小青蛙' },
  ];

  function makeRng(seed) {
    let s = (seed >>> 0) || 123456789;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return (s >>> 0) / 4294967296;
    };
  }

  function newGame(opts) {
    opts = opts || {};
    const cfg = Object.assign({}, CONFIG, opts.config || {});
    const rng = makeRng(opts.seed || Math.floor(Math.random() * 1e9));
    const n = cfg.GRID, c = Math.floor(n / 2);
    const g = {
      cfg, rng, n, home: { x: c, y: c },
      players: [
        { id: 0, key: 'BEAR', emoji: '🐻', role: '小熊', name: opts.names ? opts.names[0] : '玩家一', x: c, y: c, ap: cfg.BEAR.moves, moves: cfg.BEAR.moves, carry: cfg.BEAR.carry },
        { id: 1, key: 'BUNNY', emoji: '🐰', role: '小兔', name: opts.names ? opts.names[1] : '玩家二', x: c, y: c, ap: cfg.BUNNY.moves, moves: cfg.BUNNY.moves, carry: cfg.BUNNY.carry },
      ],
      pets: [], current: 0, turn: 0, storm: 0, status: 'playing', log: [], lastEvent: null,
    };
    const used = new Set([c + ',' + c]);
    for (let i = 0; i < cfg.PETS; i++) {
      let x, y, tries = 0;
      do {
        x = Math.floor(rng() * n); y = Math.floor(rng() * n); tries++;
      } while ((used.has(x + ',' + y) || Math.abs(x - c) + Math.abs(y - c) < 2) && tries < 500);
      used.add(x + ',' + y);
      const p = PET_POOL[i % PET_POOL.length];
      g.pets.push({ id: i, emoji: p.emoji, name: p.name, x, y, carriedBy: null, home: false });
    }
    g.log.push('小动物们在花园里走丢啦！暴风雨快来了，一起把它们送回家吧。');
    return g;
  }

  const cur = g => g.players[g.current];
  const mate = g => g.players[1 - g.current];
  const carried = (g, pid) => g.pets.filter(p => p.carriedBy === pid);
  const inBounds = (g, x, y) => x >= 0 && y >= 0 && x < g.n && y < g.n;
  const adjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  const same = (a, b) => a.x === b.x && a.y === b.y;

  function legalMoves(g) {
    if (g.status !== 'playing') return [];
    const p = cur(g);
    if (p.ap <= 0) return [];
    return [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(d => ({ x: p.x + d[0], y: p.y + d[1] }))
      .filter(t => inBounds(g, t.x, t.y));
  }

  function canGive(g) {
    if (g.status !== 'playing') return false;
    const p = cur(g), m = mate(g);
    if (!(same(p, m) || adjacent(p, m))) return false;
    return carried(g, p.id).length > 0 && carried(g, m.id).length < m.carry;
  }

  function enterCell(g, p) {
    const ev = [];
    if (same(p, g.home)) {
      const c = carried(g, p.id);
      c.forEach(pet => { pet.carriedBy = null; pet.home = true; pet.x = g.home.x; pet.y = g.home.y; });
      if (c.length) ev.push(p.emoji + ' 把 ' + c.map(x => x.emoji).join('') + ' 送回家啦！');
    } else {
      const here = g.pets.filter(pet => !pet.home && pet.carriedBy === null && pet.x === p.x && pet.y === p.y);
      for (const pet of here) {
        if (carried(g, p.id).length >= p.carry) { ev.push(p.emoji + ' 抱不下更多了，' + pet.emoji + ' 还在这里等着'); break; }
        pet.carriedBy = p.id;
        ev.push(p.emoji + ' 抱起了 ' + pet.emoji + pet.name);
      }
    }
    return ev;
  }

  function move(g, x, y) {
    if (!legalMoves(g).some(t => t.x === x && t.y === y)) return false;
    const p = cur(g);
    p.x = x; p.y = y; p.ap -= 1;
    g.log.push(...enterCell(g, p));
    checkWin(g);
    if (g.status === 'playing' && p.ap === 0) endTurn(g);
    return true;
  }

  function give(g) {
    if (!canGive(g)) return false;
    const p = cur(g), m = mate(g);
    const pet = carried(g, p.id)[0];
    pet.carriedBy = m.id;
    g.log.push(p.emoji + ' 把 ' + pet.emoji + ' 递给了 ' + m.emoji + '，好队友！');
    return true;
  }

  function checkWin(g) {
    if (g.pets.every(p => p.home)) { g.status = 'win'; g.log.push('🎉 全部小动物都回家啦！'); }
  }

  function scare(g) {
    const loose = g.pets.filter(p => !p.home && p.carriedBy === null);
    if (!loose.length) return;
    const pet = loose[Math.floor(g.rng() * loose.length)];
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(d => ({ x: pet.x + d[0], y: pet.y + d[1] }))
      .filter(t => inBounds(g, t.x, t.y) && !same(t, g.home));
    if (!opts.length) return;
    const t = opts[Math.floor(g.rng() * opts.length)];
    pet.x = t.x; pet.y = t.y;
    g.lastEvent = '⚡ 打雷了！' + pet.emoji + pet.name + ' 吓得跑了一格';
    g.log.push(g.lastEvent);
  }

  function endTurn(g) {
    if (g.status !== 'playing') return false;
    g.turn += 1;
    g.storm += 1;
    g.lastEvent = null;
    if (g.storm >= g.cfg.STORM_STEPS) {
      g.status = 'lose';
      g.log.push('🌧️ 暴风雨来了……还有 ' + g.pets.filter(p => !p.home).length + ' 只小动物没回家');
      return true;
    }
    if (g.turn % g.cfg.SCARE_EVERY === 0) scare(g);
    g.current = 1 - g.current;
    const p = cur(g);
    p.ap = p.moves;
    return true;
  }

  // 合理但不完美的启发式：抱满或没剩余就回家，否则去最近的小动物；不会用递宠物
  function stepToward(g, p, target) {
    const opts = legalMoves(g);
    if (!opts.length) return null;
    let best = null, bd = Infinity;
    for (const t of opts) {
      const d = Math.abs(t.x - target.x) + Math.abs(t.y - target.y);
      if (d < bd || (d === bd && g.rng() < 0.5)) { bd = d; best = t; }
    }
    return best;
  }

  function heuristicTurn(g) {
    const p = cur(g);
    let guard = 0;
    while (g.status === 'playing' && cur(g) === p && p.ap > 0 && guard++ < 20) {
      const mine = carried(g, p.id).length;
      const loose = g.pets.filter(x => !x.home && x.carriedBy === null);
      let target;
      if (mine >= p.carry || (mine > 0 && !loose.length)) target = g.home;
      else if (loose.length) {
        target = loose.reduce((a, b) => (Math.abs(b.x - p.x) + Math.abs(b.y - p.y) < Math.abs(a.x - p.x) + Math.abs(a.y - p.y) ? b : a));
      } else target = g.home;
      const t = stepToward(g, p, target);
      if (!t) break;
      move(g, t.x, t.y);
    }
    if (g.status === 'playing' && cur(g) === p) endTurn(g);
  }

  function simulate(games, config, seed) {
    let wins = 0; const turns = [];
    for (let i = 0; i < games; i++) {
      const g = newGame({ seed: (seed || 1) + i, config });
      let guard = 0;
      while (g.status === 'playing' && guard++ < 500) heuristicTurn(g);
      if (g.status === 'win') wins++;
      turns.push(g.turn);
    }
    turns.sort((a, b) => a - b);
    const q = f => turns[Math.min(turns.length - 1, Math.floor(f * turns.length))];
    return { games, winRate: wins / games, turnsMedian: q(0.5), turnsP25: q(0.25), turnsP75: q(0.75), turnsMin: turns[0], turnsMax: turns[turns.length - 1] };
  }

  return { CONFIG, newGame, legalMoves, canGive, move, give, endTurn, heuristicTurn, simulate, cur, mate, carried };
});
