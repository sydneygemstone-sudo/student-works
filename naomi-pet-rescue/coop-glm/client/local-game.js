// Browser-only local rules for the GLM comparison build.
'use strict';

(() => {
  const SIZE = 9;
  const HOME = { x: 4, y: 4 };
  const MAX_ROUNDS = 14;
  const STORM_EVERY = 2;
  const MAX_SHIELD = 2;
  const ROLES = {
    bear: { name: '小熊', move: 2, carry: 2 },
    bunny: { name: '小兔 Naomi', move: 3, carry: 1 },
  };
  const DIRS = ['N', 'E', 'S', 'W'];
  const DELTA = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const TERRAIN_COST = { grass: 1, forest: 2, net: 3, stone: Infinity, hedge: Infinity };
  const HEDGE = ['.H.H', '...H', '.H.H', '.H..'];
  const FOREST = [[1,1],[2,1],[6,6],[7,6],[1,6],[3,3],[5,5],[2,7]];
  const STONE = [[0,3],[3,0],[8,5],[5,8],[0,8],[8,8],[3,6],[6,3]];
  const NET = [[2,4],[6,4],[4,1],[4,7]];

  function buildGrid() {
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill('grass'));
    FOREST.forEach(([x,y]) => { grid[y][x] = 'forest'; });
    STONE.forEach(([x,y]) => { grid[y][x] = 'stone'; });
    NET.forEach(([x,y]) => { grid[y][x] = 'net'; });
    HEDGE.forEach((row, dy) => [...row].forEach((ch, dx) => {
      grid[dy][5 + dx] = ch === 'H' ? 'hedge' : 'grass';
    }));
    grid[HOME.y][HOME.x] = 'grass';
    return grid;
  }

  const GRID = buildGrid();
  const inBounds = (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE;
  const terrainAt = (x, y) => inBounds(x, y) ? GRID[y][x] : 'wall';
  const costAt = (x, y) => TERRAIN_COST[terrainAt(x, y)] ?? Infinity;
  const ok = (data = {}) => ({ ok: true, ...data });
  const err = (message, extra = {}) => ({ ok: false, message, ...extra });

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

  function createGame() {
    return {
      solo: true,
      round: 1,
      phase: 'playing',
      weather: 'sunny',
      stormCountdown: STORM_EVERY,
      courage: 0,
      shield: 0,
      animals: [
        { id: 'a1', kind: '小兔宝宝', x: 7, y: 1, carried: null },
        { id: 'a2', kind: '小刺猬', x: 1, y: 3, carried: null },
        { id: 'a3', kind: '小松鼠', x: 6, y: 7, carried: null },
        { id: 'a4', kind: '小狐狸', x: 2, y: 6, carried: null },
        { id: 'a5', kind: '小乌龟', x: 0, y: 5, carried: null },
        { id: 'a6', kind: '小鸭子', x: 8, y: 6, carried: null },
        { id: 'a7', kind: '小猫咪', x: 3, y: 8, carried: null },
        { id: 'a8', kind: '小鸟', x: 0, y: 0, carried: null },
      ],
      boxes: [
        { id: 'b1', x: 2, y: 2, effect: 'courage', amount: 2, opened: false },
        { id: 'b2', x: 6, y: 5, effect: 'courage', amount: 2, opened: false },
        { id: 'b3', x: 5, y: 6, effect: 'pause', opened: false },
      ],
      players: {
        bear: makePlayer('bear', 3, 5, 'N'),
        bunny: makePlayer('bunny', 5, 5, 'N'),
      },
    };
  }

  function publicState(game) {
    return JSON.parse(JSON.stringify(game));
  }

  function rescueAtHome(game, role) {
    const player = game.players[role];
    if (player.x !== HOME.x || player.y !== HOME.y || !player.carrying.length) return;
    for (const id of player.carrying.splice(0)) {
      const animal = game.animals.find((item) => item.id === id);
      animal.carried = 'home';
      animal.x = HOME.x;
      animal.y = HOME.y;
      game.courage += 1;
    }
  }

  function turn(game, role, side) {
    const player = game.players[role];
    if (!player || game.phase !== 'playing') return err('无法行动');
    const idx = DIRS.indexOf(player.dir);
    player.dir = DIRS[(idx + (side === 'right' ? 1 : 3)) % 4];
    return ok({ dir: player.dir, ap: player.ap });
  }

  function move(game, role, forward) {
    const player = game.players[role];
    if (!player || game.phase !== 'playing') return err('无法行动');
    if (player.paused) return err('礼盒恶作剧：本回合暂停移动');
    const [dx, dy] = DELTA[player.dir];
    const sign = forward ? 1 : -1;
    const nx = player.x + dx * sign;
    const ny = player.y + dy * sign;
    if (!inBounds(nx, ny)) return err('前方挡路（花园边界）！可以后退一步或换条路', { blocked: true });

    const terrain = terrainAt(nx, ny);
    if (terrain === 'stone' || terrain === 'hedge') {
      return err(`前方挡路（${terrain === 'stone' ? '石头' : '树篱'}）！可以后退一步或换条路`, { blocked: true });
    }

    let cost = costAt(nx, ny);
    if (terrain === 'net' && game.shield > 0) cost = 1;
    if (player.ap < cost) return err('行动点不足');

    player.ap -= cost;
    player.x = nx;
    player.y = ny;

    for (const animal of game.animals) {
      if (!animal.carried && animal.x === nx && animal.y === ny && player.carrying.length < ROLES[role].carry) {
        animal.carried = role;
        player.carrying.push(animal.id);
      }
    }
    rescueAtHome(game, role);

    for (const box of game.boxes) {
      if (!box.opened && box.x === nx && box.y === ny) {
        box.opened = true;
        if (box.effect === 'courage') game.courage += box.amount;
        else player.paused = true;
      }
    }
    return ok({ x: nx, y: ny, ap: player.ap });
  }

  function give(game, fromRole) {
    const toRole = fromRole === 'bear' ? 'bunny' : 'bear';
    const from = game.players[fromRole];
    const to = game.players[toRole];
    const distance = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
    if (distance > 1) return err('需要同格或相邻才能递给队友');
    const id = from.carrying[0];
    if (!id) return err('怀中没有小动物');
    if (to.x === HOME.x && to.y === HOME.y) {
      from.carrying.shift();
      const animal = game.animals.find((item) => item.id === id);
      animal.carried = 'home';
      animal.x = HOME.x;
      animal.y = HOME.y;
      game.courage += 1;
      return ok({ rescued: true });
    }
    if (to.carrying.length >= ROLES[toRole].carry) return err('队友抱不动了');
    from.carrying.shift();
    to.carrying.push(id);
    game.animals.find((item) => item.id === id).carried = toRole;
    return ok({ given: true });
  }

  function support(game, role) {
    const player = game.players[role];
    if (player.x !== HOME.x || player.y !== HOME.y) return err('需要站在家园 (4,4)');
    if (player.ap < 1) return err('行动点不足');
    if (game.shield >= MAX_SHIELD) return err('庇护已达上限');
    player.ap -= 1;
    game.shield += 1;
    return ok();
  }

  function boost(game) {
    if (game.courage < 2) return err('勇气不足（需要 2 点）');
    if (game.players.bear.bonusSteps > 0 || game.players.bunny.bonusSteps > 0) return err('本回合已加步');
    game.courage -= 2;
    for (const player of [game.players.bear, game.players.bunny]) {
      player.bonusSteps = 2;
      player.ap += 2;
    }
    return ok();
  }

  function advanceRound(game) {
    game.stormCountdown -= 1;
    if (game.stormCountdown <= 0) {
      game.weather = 'storm';
      game.stormCountdown = STORM_EVERY;
      if (game.shield > 0) game.shield -= 1;
      else {
        for (const player of [game.players.bear, game.players.bunny]) {
          if (player.carrying.length) {
            const id = player.carrying.pop();
            const animal = game.animals.find((item) => item.id === id);
            animal.carried = null;
            animal.x = player.x;
            animal.y = player.y;
          }
        }
      }
    } else {
      game.weather = 'sunny';
    }

    game.round += 1;
    for (const player of [game.players.bear, game.players.bunny]) {
      player.ready = false;
      player.paused = false;
      player.bonusSteps = 0;
      player.ap = player.baseMove;
    }
    if (game.animals.every((animal) => animal.carried === 'home')) game.phase = 'won';
    else if (game.round > MAX_ROUNDS) game.phase = 'lost';
  }

  function ready(game, role, value = true) {
    const player = game.players[role];
    player.ready = value;
    if (game.players.bear.ready && game.players.bunny.ready) advanceRound(game);
    return ok();
  }

  function applyAction(game, action, role) {
    if (!game || game.phase !== 'playing') return err('无法行动');
    switch (action?.type) {
      case 'turn': return turn(game, role, action.side);
      case 'move': return move(game, role, action.forward !== false);
      case 'give': return give(game, role);
      case 'support': return support(game, role);
      case 'boost': return boost(game);
      case 'ready': return ready(game, role, action.value !== false);
      default: return err('未知指令');
    }
  }

  window.GLMGame = Object.freeze({ HOME, ROLES, GRID, createGame, publicState, applyAction });
})();
