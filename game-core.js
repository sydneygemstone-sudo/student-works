/* 小动物回家 —— 纯游戏逻辑（浏览器挂 window.PetRescue，node 下 module.exports） */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PetRescue = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const CONFIG = {
    GRID: 7, PETS: 8, STORM_STEPS: 28, SCARE_EVERY: 4, NET_EVERY: 6,
    ROCKS: 4, FORESTS: 5, GIFTS: 3,
    BEAR: { moves: 2, carry: 2 }, BUNNY: { moves: 3, carry: 1 },
  };
  const PET_POOL = [
    { emoji: '🐱', name: '小猫' }, { emoji: '🐶', name: '小狗' }, { emoji: '🐹', name: '小仓鼠' },
    { emoji: '🐥', name: '小鸡' }, { emoji: '🐢', name: '小乌龟' }, { emoji: '🐰', name: '小兔宝宝' },
    { emoji: '🐷', name: '小猪' }, { emoji: '🦆', name: '小鸭' }, { emoji: '🐑', name: '小羊' },
    { emoji: '🐸', name: '小青蛙' },
  ];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const cur = g => g.players[g.current];
  const mate = g => g.players[1 - g.current];
  const carried = (g, pid) => g.pets.filter(p => p.carriedBy === pid);
  const inBounds = (g, x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < g.n && y < g.n;
  const adjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  const same = (a, b) => a.x === b.x && a.y === b.y;
  const key = p => p.x + ',' + p.y;
  const neighbors = p => DIRS.map(d => ({ x: p.x + d[0], y: p.y + d[1] }));

  function makeRng(seed) {
    let s = (seed >>> 0) || 123456789;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return (s >>> 0) / 4294967296;
    };
  }
  function shuffled(g, items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(g.rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function moveCost(g, x, y) {
    if (!inBounds(g, x, y)) return Infinity;
    const terrain = g.terrain.find(t => t.x === x && t.y === y);
    return terrain ? (terrain.type === 'rock' ? Infinity : terrain.type === 'forest' ? 2 : 1) : 1;
  }
  // 石头只在移除该格后，全部可行走格仍与家连通时落下。
  function connected(g) {
    const seen = new Set([key(g.home)]), queue = [g.home];
    for (let i = 0; i < queue.length; i++) {
      for (const t of neighbors(queue[i])) {
        if (!Number.isFinite(moveCost(g, t.x, t.y)) || seen.has(key(t))) continue;
        seen.add(key(t)); queue.push(t);
      }
    }
    return seen.size === g.n * g.n - g.terrain.filter(t => t.type === 'rock').length;
  }
  function newGame(opts) {
    opts = opts || {};
    const cfg = Object.assign({}, CONFIG, opts.config || {});
    cfg.BEAR = Object.assign({}, CONFIG.BEAR, cfg.BEAR);
    cfg.BUNNY = Object.assign({}, CONFIG.BUNNY, cfg.BUNNY);
    const seed = opts.seed == null ? Math.floor(Math.random() * 1e9) : opts.seed;
    const n = cfg.GRID, c = Math.floor(n / 2);
    const g = {
      cfg, rng: makeRng(seed), n, home: { x: c, y: c },
      players: ['BEAR', 'BUNNY'].map((role, i) => ({
        id: i, key: role, emoji: i ? '🐰' : '🐻', role: i ? '小兔' : '小熊',
        name: opts.names && opts.names[i] ? opts.names[i] : (i ? '玩家二' : '玩家一'),
        x: c, y: c, ap: cfg[role].moves, moves: cfg[role].moves, carry: cfg[role].carry,
        boosted: false, supported: false, skipTurns: 0, snared: false,
      })),
      pets: [], terrain: [], gifts: [], energy: 0, shield: 0,
      current: 0, turn: 0, storm: 0, status: 'playing', log: [], lastEvent: null,
    };
    const cells = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (x !== c || y !== c) cells.push({ x, y });
    const distant = shuffled(g, cells.filter(t => Math.abs(t.x - c) + Math.abs(t.y - c) >= 2));
    const nearby = shuffled(g, cells.filter(t => Math.abs(t.x - c) + Math.abs(t.y - c) < 2));
    const spots = distant.concat(nearby);
    if (cfg.PETS > spots.length) throw new RangeError('棋盘没有足够的位置安置小动物');
    for (let i = 0; i < cfg.PETS; i++) {
      const p = PET_POOL[i % PET_POOL.length];
      g.pets.push({ id: i, emoji: p.emoji, name: p.name, ...spots[i], carriedBy: null, home: false });
    }
    const occupied = new Set(g.pets.map(key));
    for (const t of shuffled(g, cells.filter(t => !occupied.has(key(t))))) {
      if (g.terrain.length >= cfg.ROCKS) break;
      g.terrain.push({ ...t, type: 'rock' });
      if (!connected(g)) g.terrain.pop();
    }
    const walkable = cells.filter(t => Number.isFinite(moveCost(g, t.x, t.y)));
    for (const t of shuffled(g, walkable).slice(0, cfg.FORESTS)) g.terrain.push({ ...t, type: 'forest' });
    const giftSpots = shuffled(g, walkable.filter(t => !occupied.has(key(t)))).slice(0, cfg.GIFTS);
    const bomb = Math.floor(g.rng() * giftSpots.length);
    g.gifts = giftSpots.map((t, i) => ({ id: i, ...t, opened: false, kind: i === bomb ? 'bomb' : 'energy' }));
    g.log.push('小动物们在花园里走丢啦！绕过石头、穿过森林，一起把它们送回家吧。');
    return g;
  }

  function legalMoves(g) {
    if (g.status !== 'playing') return [];
    const p = cur(g);
    return neighbors(p).filter(t => moveCost(g, t.x, t.y) <= p.ap);
  }
  function canGive(g) {
    if (g.status !== 'playing') return false;
    const p = cur(g), m = mate(g);
    return (same(p, m) || adjacent(p, m)) && carried(g, p.id).length > 0 && carried(g, m.id).length < m.carry;
  }
  function canBoost(g) {
    return g.status === 'playing' && g.energy >= 2 && !cur(g).boosted && cur(g).ap < cur(g).moves + 2;
  }
  function boost(g) {
    if (!canBoost(g)) return false;
    const p = cur(g);
    g.energy -= 2; p.ap = Math.min(p.moves + 2, p.ap + 2); p.boosted = true;
    g.log.push('✨ ' + p.emoji + ' 使用2点团队能量，这回合多走2步！');
    return true;
  }
  function canSupport(g) {
    const p = cur(g);
    return g.status === 'playing' && same(p, g.home) && p.ap >= 1 && !p.supported && g.shield < 2;
  }
  function support(g) {
    if (!canSupport(g)) return false;
    const p = cur(g);
    p.ap--; p.supported = true; g.shield++;
    g.log.push('🏡 ' + p.emoji + ' 花1步守护家园，庇护增加到' + g.shield + '层。');
    if (p.ap === 0) endTurn(g);
    return true;
  }
  function enterCell(g, p) {
    const ev = [];
    if (same(p, g.home)) {
      const saved = carried(g, p.id);
      saved.forEach(pet => { pet.carriedBy = null; pet.home = true; pet.x = g.home.x; pet.y = g.home.y; });
      if (saved.length) {
        g.energy = Math.min(6, g.energy + saved.length * 2);
        ev.push(p.emoji + ' 把 ' + saved.map(x => x.emoji).join('') + ' 送回家啦！每只带来2点能量（现有' + g.energy + '）。');
      }
    } else {
      for (const pet of g.pets.filter(pet => !pet.home && pet.carriedBy === null && same(pet, p))) {
        if (carried(g, p.id).length >= p.carry) { ev.push(p.emoji + ' 抱不下更多了，' + pet.emoji + ' 还在这里等着'); break; }
        pet.carriedBy = p.id;
        ev.push(p.emoji + ' 抱起了 ' + pet.emoji + pet.name);
      }
    }
    const gift = g.gifts.find(t => !t.opened && same(t, p));
    if (gift) {
      gift.opened = true;
      if (gift.kind === 'bomb') {
        p.skipTurns = Math.max(p.skipTurns, 1);
        ev.push('🎁💥 是恶作剧炸弹！' + p.emoji + ' 下次暂停一回合，小动物们都安全。');
      } else {
        g.energy = Math.min(6, g.energy + 2);
        ev.push('🎁✨ 找到能量礼物，团队能量+2（现有' + g.energy + '）！');
      }
    }
    return ev;
  }
  function checkWin(g) {
    if (g.status === 'playing' && g.pets.every(p => p.home)) { g.status = 'win'; g.log.push('🎉 全部小动物都回家啦！'); }
  }
  function move(g, x, y) {
    if (!legalMoves(g).some(t => t.x === x && t.y === y)) return false;
    const p = cur(g), cost = moveCost(g, x, y);
    p.x = x; p.y = y; p.ap -= cost;
    if (cost === 2) g.log.push('🌲 ' + p.emoji + ' 穿过森林，花了2步。');
    g.log.push(...enterCell(g, p));
    checkWin(g);
    if (g.status === 'playing' && p.ap === 0) endTurn(g);
    return true;
  }
  function give(g) {
    if (!canGive(g)) return false;
    const p = cur(g), m = mate(g), pet = carried(g, p.id)[0];
    pet.carriedBy = m.id;
    g.log.push(p.emoji + ' 把 ' + pet.emoji + ' 递给了 ' + m.emoji + '，好队友！');
    if (same(m, g.home)) g.log.push(...enterCell(g, m));
    checkWin(g);
    return true;
  }
  function event(g, message) {
    g.lastEvent = g.lastEvent ? g.lastEvent + ' ' + message : message;
    g.log.push(message);
  }
  function shelter(g, hazard) {
    if (g.shield <= 0) return false;
    g.shield--;
    event(g, '🛡️ 家园庇护挡住了' + hazard + '，还剩' + g.shield + '层。');
    return true;
  }
  function scare(g) {
    if (shelter(g, '雷雨')) return;
    const loose = g.pets.filter(p => !p.home && p.carriedBy === null);
    if (!loose.length) { event(g, '⚡ 打雷了！被抱着和在家的小动物都很安全。'); return; }
    const pet = loose[Math.floor(g.rng() * loose.length)];
    const opts = neighbors(pet).filter(t => Number.isFinite(moveCost(g, t.x, t.y)) && !same(t, g.home));
    if (!opts.length) return;
    const t = opts[Math.floor(g.rng() * opts.length)];
    pet.x = t.x; pet.y = t.y;
    event(g, '⚡ 打雷了！' + pet.emoji + pet.name + ' 吓得跑了一格');
    // 受惊后跑进队友所在格，也由该队友立即接住。
    for (const player of g.players) if (same(player, pet)) g.log.push(...enterCell(g, player));
  }
  function endTurn(g) {
    if (g.status !== 'playing') return false;
    g.lastEvent = null;
    let pendingNet = false;
    // 跳过也是真实的一手；有界于风暴期限，双方同时暂停也不会递归或卡住。
    while (g.status === 'playing') {
      g.turn++; g.storm++;
      if (g.storm >= g.cfg.STORM_STEPS) {
        g.status = 'lose';
        event(g, '🌧️ 暴风雨来了……还有 ' + g.pets.filter(p => !p.home).length + ' 只小动物没回家');
        return true;
      }
      if (g.cfg.SCARE_EVERY > 0 && g.turn % g.cfg.SCARE_EVERY === 0) scare(g);
      if (g.cfg.NET_EVERY > 0 && g.turn % g.cfg.NET_EVERY === 0 && !shelter(g, '绳网')) pendingNet = true;
      g.current = 1 - g.current;
      const p = cur(g);
      p.boosted = false; p.supported = false; p.snared = false;
      if (p.skipTurns > 0) {
        p.skipTurns--; p.ap = 0;
        event(g, '💫 ' + p.emoji + p.name + ' 被炸弹逗晕了，暂停这一回合；暴风雨继续靠近。');
        continue;
      }
      p.snared = pendingNet;
      p.ap = Math.max(1, p.moves - (p.snared ? 1 : 0));
      if (p.snared) event(g, '🕸️ 绳网落下！' + p.emoji + ' 这回合少1步，下回合恢复。');
      return true;
    }
    return true;
  }

  // 小棋盘 Dijkstra：森林用2步、石头不能穿过；保留seed可复现。
  function pathsFrom(g, p) {
    const dist = new Map([[key(p), 0]]), first = new Map(), done = new Set();
    while (true) {
      let cell = null, best = Infinity;
      for (const [k, d] of dist) if (!done.has(k) && d < best) { best = d; cell = k; }
      if (cell === null) break;
      done.add(cell);
      const [x, y] = cell.split(',').map(Number);
      for (const t of neighbors({ x, y })) {
        const d = best + moveCost(g, t.x, t.y), k = key(t);
        if (d < (dist.has(k) ? dist.get(k) : Infinity)) {
          dist.set(k, d); first.set(k, cell === key(p) ? t : first.get(cell));
        }
      }
    }
    return { dist, first };
  }
  function heuristicTurn(g) {
    if (g.status !== 'playing') return;
    const p = cur(g), started = g.turn;
    let guard = 0;
    while (g.status === 'playing' && g.turn === started && p.ap > 0 && guard++ < 20) {
      const mine = carried(g, p.id).length;
      const loose = g.pets.filter(x => !x.home && x.carriedBy === null);
      const paths = pathsFrom(g, p), distance = t => paths.dist.get(key(t)) ?? Infinity;
      let target = g.home;
      if (mine < p.carry && loose.length) {
        target = loose.reduce((a, b) => distance(b) < distance(a) ? b : a);
        if (mine > 0 && distance(g.home) <= distance(target) + 1) target = g.home;
      }
      if (same(p, target)) {
        if (mine || loose.some(t => same(t, p))) { g.log.push(...enterCell(g, p)); checkWin(g); }
        else if (canSupport(g)) support(g);
        break;
      }
      if (canBoost(g) && distance(target) > p.ap) boost(g);
      const t = paths.first.get(key(target));
      if (!t || moveCost(g, t.x, t.y) > p.ap) break;
      move(g, t.x, t.y);
    }
    if (g.status === 'playing' && g.turn === started) endTurn(g);
  }
  function simulate(games, config, seed) {
    let wins = 0; const turns = [];
    for (let i = 0; i < games; i++) {
      const g = newGame({ seed: (seed == null ? 1 : seed) + i, config });
      let guard = 0;
      while (g.status === 'playing' && guard++ < 500) heuristicTurn(g);
      if (g.status === 'win') wins++;
      turns.push(g.turn);
    }
    turns.sort((a, b) => a - b);
    const q = f => turns[Math.min(turns.length - 1, Math.floor(f * turns.length))];
    return { games, winRate: games ? wins / games : 0, turnsMedian: q(0.5), turnsP25: q(0.25), turnsP75: q(0.75), turnsMin: turns[0], turnsMax: turns[turns.length - 1] };
  }
  return { CONFIG, newGame, legalMoves, moveCost, canGive, canBoost, boost, canSupport, support,
    move, give, endTurn, heuristicTurn, simulate, cur, mate, carried };
});
