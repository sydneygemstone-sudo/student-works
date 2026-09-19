/**
 * Naomi《小动物回家》双 iPad 局域网联机探索版 —— 共同回合制核心引擎
 * 纯逻辑模块：支持 Node.js (CommonJS) 与浏览器 (window.CoopEngine)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CoopEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 方向定义：0: 北, 1: 东, 2: 南, 3: 西
  const HEADINGS = {
    NORTH: 0,
    EAST: 1,
    SOUTH: 2,
    WEST: 3,
  };

  const HEADING_VECTORS = [
    { dx: 0, dy: -1, name: '北' },
    { dx: 1, dy: 0, name: '东' },
    { dx: 0, dy: 1, name: '南' },
    { dx: -1, dy: 0, name: '西' },
  ];

  const CONFIG = {
    GRID: 9,
    MAX_TEAM_ROUNDS: 14,
    THUNDER_EVERY_TEAM_ROUNDS: 2,
    BEAR: { moves: 2, carry: 2, role: '小熊', emoji: '🐻' },
    BUNNY: { moves: 3, carry: 1, role: '小兔', emoji: '🐰' },
  };

  const PET_POOL = [
    { id: 0, name: '小兔宝宝', emoji: '🐰' }, // 迷宫守护目标
    { id: 1, name: '小猫', emoji: '🐱' },
    { id: 2, name: '小狗', emoji: '🐶' },
    { id: 3, name: '小鸡', emoji: '🐥' },
    { id: 4, name: '小仓鼠', emoji: '🐹' },
    { id: 5, name: '小乌龟', emoji: '🐢' },
    { id: 6, name: '小鸭', emoji: '🦆' },
    { id: 7, name: '小羊', emoji: '🐑' },
  ];

  function makeRng(seed) {
    let s = (seed >>> 0) || 123456789;
    return function () {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return (s >>> 0) / 4294967296;
    };
  }

  const key = (p) => p.x + ',' + p.y;
  const same = (a, b) => a.x === b.x && a.y === b.y;
  const adjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

  function inBounds(g, x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < g.n && y < g.n;
  }

  function getTerrain(g, x, y) {
    if (!inBounds(g, x, y)) return { type: 'barrier', solid: true };
    const t = g.terrain.find((item) => item.x === x && item.y === y);
    if (t) return t;
    return { type: 'grass', solid: false };
  }

  function moveCost(g, x, y) {
    if (!inBounds(g, x, y)) return Infinity;
    const terrain = getTerrain(g, x, y);
    if (terrain.type === 'rock' || terrain.type === 'hedge' || terrain.solid) {
      return Infinity;
    }
    if (terrain.type === 'forest') {
      if (terrain.net && !terrain.cleared) {
        // 若有家园庇护，消耗1层庇护，绳网只需2步
        return g.shield > 0 ? 2 : 3;
      }
      return 2;
    }
    return 1;
  }

  /**
   * 手工设计的迷宫规格及地标
   */
  const MAZE_SPEC = {
    entrance: { x: 6, y: 3, label: '迷宫入口花廊' },
    target: { x: 6, y: 0, label: '迷宫花亭（待救小兔宝宝）' },
    exit: { x: 5, y: 0, label: '迷宫出口拱门' },
    deadEnds: [
      { x: 8, y: 2, landmark: '🌸 花丛死胡同' },
      { x: 8, y: 0, landmark: '🍄 蘑菇死胡同' },
    ],
    hedges: [
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
      { x: 6, y: 1 },
      { x: 7, y: 3 }, { x: 8, y: 3 },
      { x: 8, y: 1 },
    ],
  };

  /**
   * 创建初始游戏状态
   */
  function createGame(opts = {}) {
    const seed = opts.seed == null ? 20260915 : opts.seed;
    const rng = makeRng(seed);
    const n = CONFIG.GRID;
    const home = { x: 4, y: 4 };

    // 默认玩家
    const players = [
      {
        id: 0,
        roleKey: 'BEAR',
        name: opts.bearName || '小熊',
        role: CONFIG.BEAR.role,
        emoji: CONFIG.BEAR.emoji,
        x: home.x,
        y: home.y,
        heading: HEADINGS.SOUTH,
        ap: CONFIG.BEAR.moves,
        moves: CONFIG.BEAR.moves,
        carry: CONFIG.BEAR.carry,
        carriedPets: [],
        ready: false,
        boosted: false,
        supported: false,
        skipTurns: 0,
        resting: false,
        connected: false,
      },
      {
        id: 1,
        roleKey: 'BUNNY',
        name: opts.bunnyName || 'Naomi',
        role: CONFIG.BUNNY.role,
        emoji: CONFIG.BUNNY.emoji,
        x: home.x,
        y: home.y,
        heading: HEADINGS.NORTH,
        ap: CONFIG.BUNNY.moves,
        moves: CONFIG.BUNNY.moves,
        carry: CONFIG.BUNNY.carry,
        carriedPets: [],
        ready: false,
        boosted: false,
        supported: false,
        skipTurns: 0,
        resting: false,
        connected: false,
      },
    ];

    // 地形生成
    const terrain = [];

    // 1. 植入树篱迷宫
    MAZE_SPEC.hedges.forEach((h) => {
      terrain.push({ x: h.x, y: h.y, type: 'hedge', solid: true });
    });

    // 2. 障碍石头（不遮挡主路）
    const rocks = [
      { x: 2, y: 2 },
      { x: 7, y: 4 },
      { x: 2, y: 6 },
      { x: 5, y: 6 },
    ];
    rocks.forEach((r) => {
      terrain.push({ x: r.x, y: r.y, type: 'rock', solid: true });
    });

    // 3. 森林与绳网
    const forests = [
      { x: 2, y: 4, net: false },
      { x: 2, y: 5, net: true, cleared: false },
      { x: 6, y: 5, net: true, cleared: false },
      { x: 3, y: 7, net: false },
      { x: 5, y: 7, net: false },
    ];
    forests.forEach((f) => {
      terrain.push({ x: f.x, y: f.y, type: 'forest', solid: false, net: f.net, cleared: f.cleared });
    });

    // 4. 小动物位置（1只固定在迷宫深处，7只在各区）
    const petSpots = [
      { x: 6, y: 0 }, // 迷宫核心小兔宝宝
      { x: 1, y: 1 },
      { x: 7, y: 7 },
      { x: 1, y: 7 },
      { x: 4, y: 8 },
      { x: 2, y: 4 },
      { x: 6, y: 6 },
      { x: 4, y: 1 },
    ];

    const pets = petSpots.map((spot, i) => ({
      id: i,
      name: PET_POOL[i].name,
      emoji: PET_POOL[i].emoji,
      x: spot.x,
      y: spot.y,
      carriedBy: null,
      home: false,
    }));

    // 5. 礼盒（2勇气，1恶作剧炸弹）
    const gifts = [
      { id: 0, x: 1, y: 3, opened: false, kind: 'energy' },
      { id: 1, x: 7, y: 5, opened: false, kind: 'energy' },
      { id: 2, x: 3, y: 1, opened: false, kind: 'bomb' },
    ];

    const game = {
      cfg: CONFIG,
      n,
      seed,
      rng,
      home,
      maze: MAZE_SPEC,
      players,
      pets,
      terrain,
      gifts,
      teamRound: 1,
      energy: 0,
      shield: 0,
      status: 'playing', // 'playing' | 'win' | 'lose'
      log: ['小动物们在花园和迷宫里走丢啦！小熊和小兔携手出发！'],
      version: 1,
    };

    return game;
  }

  /**
   * 石头箭头与阻挡检测（Naomi's Stone Arrow）
   * 遭遇障碍时计算附近的已知退路方向，提供给客户端展示清晰箭头
   */
  function checkObstacleHint(game, player, action) {
    const vec = HEADING_VECTORS[player.heading];
    let targetX = player.x;
    let targetY = player.y;

    if (action === 'FORWARD') {
      targetX += vec.dx;
      targetY += vec.dy;
    } else if (action === 'BACKWARD') {
      targetX -= vec.dx;
      targetY -= vec.dy;
    }

    const terrain = getTerrain(game, targetX, targetY);
    const isOutOfBounds = !inBounds(game, targetX, targetY);
    const isSolid = isOutOfBounds || terrain.solid || terrain.type === 'rock' || terrain.type === 'hedge';

    if (!isSolid) {
      return null; // 没有物理阻挡
    }

    // 计算退路提示：
    // 优先身后：沿朝向反方向 (player.x - vec.dx, player.y - vec.dy)
    const backX = player.x - vec.dx;
    const backY = player.y - vec.dy;
    const backTerrain = getTerrain(game, backX, backY);
    const backSafe = inBounds(game, backX, backY) && !backTerrain.solid;

    // 左侧：(player.x - vec.dy, player.y + vec.dx)
    const leftVec = HEADING_VECTORS[(player.heading + 3) % 4];
    const leftX = player.x + leftVec.dx;
    const leftY = player.y + leftVec.dy;
    const leftTerrain = getTerrain(game, leftX, leftY);
    const leftSafe = inBounds(game, leftX, leftY) && !leftTerrain.solid;

    // 右侧：(player.x + vec.dy, player.y - vec.dx)
    const rightVec = HEADING_VECTORS[(player.heading + 1) % 4];
    const rightX = player.x + rightVec.dx;
    const rightY = player.y + rightVec.dy;
    const rightTerrain = getTerrain(game, rightX, rightY);
    const rightSafe = inBounds(game, rightX, rightY) && !rightTerrain.solid;

    let arrowDirection = 'BACKWARD';
    let message = '这里走不通。';

    if (action === 'FORWARD') {
      if (terrain.type === 'rock') {
        message = '前方有大石头挡路！';
      } else if (terrain.type === 'hedge') {
        message = '前方是茂密的树篱死胡同！';
      } else {
        message = '前面已经到花园边缘了。';
      }

      if (backSafe) {
        arrowDirection = 'BACKWARD';
        message += ' 清楚的箭头提醒：可以后退一步。';
      } else if (leftSafe) {
        arrowDirection = 'LEFT';
        message += ' 清楚的箭头提醒：可以左转看另一条路。';
      } else if (rightSafe) {
        arrowDirection = 'RIGHT';
        message += ' 清楚的箭头提醒：可以右转看另一条路。';
      } else {
        arrowDirection = 'TURN';
        message += ' 转身看看四周的出路吧。';
      }
    }

    return {
      blocked: true,
      obstacleType: isOutOfBounds ? 'border' : terrain.type,
      arrowDirection,
      message,
      target: { x: targetX, y: targetY },
    };
  }

  /**
   * 角色拾取与进入格子效果
   */
  function enterCell(game, player) {
    const logs = [];

    // 1. 到家送回
    if (same(player, game.home)) {
      const carried = game.pets.filter((p) => p.carriedBy === player.id);
      if (carried.length > 0) {
        carried.forEach((p) => {
          p.carriedBy = null;
          p.home = true;
          p.x = game.home.x;
          p.y = game.home.y;
        });
        const gainedEnergy = carried.length * 2;
        game.energy += gainedEnergy;
        logs.push(
          `${player.emoji} ${player.name} 把 ${carried.map((p) => p.emoji + p.name).join('、')} 送回家啦！获得 ${gainedEnergy} 点团队勇气！`
        );
        checkWin(game);
      }
    } else {
      // 2. 拾取沿途小动物（不超过容量）
      const carriedCount = game.pets.filter((p) => p.carriedBy === player.id).length;
      const loosePets = game.pets.filter((p) => !p.home && p.carriedBy === null && same(p, player));
      for (const pet of loosePets) {
        const currentCarried = game.pets.filter((p) => p.carriedBy === player.id).length;
        if (currentCarried < player.carry) {
          pet.carriedBy = player.id;
          logs.push(`${player.emoji} ${player.name} 抱起了 ${pet.emoji} ${pet.name}！`);
        } else {
          logs.push(`${player.emoji} ${player.name} 已经抱满啦，${pet.emoji} ${pet.name} 在原地等待。`);
          break;
        }
      }
    }

    // 3. 开礼盒
    const gift = game.gifts.find((g) => !g.opened && same(g, player));
    if (gift) {
      gift.opened = true;
      if (gift.kind === 'bomb') {
        player.skipTurns = 1;
        logs.push(`🎁💥 哎呀！是恶作剧礼盒！${player.emoji} ${player.name} 下一回合需要休息。`);
      } else {
        game.energy += 2;
        logs.push(`🎁✨ 发现了勇气礼盒！团队勇气 +2！`);
      }
    }

    return logs;
  }

  /**
   * 胜负判定
   */
  function checkWin(game) {
    if (game.status === 'playing' && game.pets.every((p) => p.home)) {
      game.status = 'win';
      game.log.push('🎉 所有的 8 只小动物都被平安送回家了！胜利宴会开始啦！');
      return true;
    }
    return false;
  }

  /**
   * 执行动作
   * @param {Object} game - 游戏状态
   * @param {number} playerId - 0 (熊) 或 1 (兔)
   * @param {string} action - 'FORWARD' | 'BACKWARD' | 'TURN_LEFT' | 'TURN_RIGHT' | 'GIVE' | 'SUPPORT' | 'BOOST' | 'READY' | 'UNREADY'
   */
  function applyAction(game, playerId, action) {
    if (game.status !== 'playing') {
      return { success: false, error: '游戏已经结束' };
    }

    const player = game.players[playerId];
    if (!player) {
      return { success: false, error: '非法玩家 ID' };
    }

    // 休息中的玩家不可移动或主动操作，但允许准备
    if ((player.resting || player.skipTurns > 0) && action !== 'READY' && action !== 'UNREADY') {
      return { success: false, error: '本回合休息中，无法执行此动作' };
    }

    // 已经 ready 的玩家，必须先点“继续行动”撤回 ready
    if (player.ready && action !== 'UNREADY' && action !== 'READY') {
      return { success: false, error: '已结束本回合，如需行动请先点击“继续行动”' };
    }

    const mate = game.players[1 - playerId];
    const vec = HEADING_VECTORS[player.heading];

    switch (action) {
      case 'TURN_LEFT': {
        player.heading = (player.heading + 3) % 4;
        game.version++;
        return { success: true, action, heading: player.heading };
      }

      case 'TURN_RIGHT': {
        player.heading = (player.heading + 1) % 4;
        game.version++;
        return { success: true, action, heading: player.heading };
      }

      case 'FORWARD':
      case 'BACKWARD': {
        const sign = action === 'FORWARD' ? 1 : -1;
        const targetX = player.x + vec.dx * sign;
        const targetY = player.y + vec.dy * sign;

        // 1. 石头与障碍检测（不扣步、提供箭头）
        const obstacleHint = checkObstacleHint(game, player, action);
        if (obstacleHint && obstacleHint.blocked) {
          return {
            success: false,
            error: obstacleHint.message,
            reason: 'blocked',
            hint: obstacleHint,
          };
        }

        // 2. 行动点检测
        const cost = moveCost(game, targetX, targetY);
        if (player.ap < cost) {
          return {
            success: false,
            error: `步数不足：需要 ${cost} 步，当前仅剩 ${player.ap} 步`,
            reason: 'insufficient_ap',
            cost,
            ap: player.ap,
          };
        }

        // 3. 执行移动
        player.ap -= cost;
        player.x = targetX;
        player.y = targetY;

        // 森林绳网清除及庇护消耗
        const terrain = getTerrain(game, targetX, targetY);
        if (terrain.type === 'forest') {
          if (terrain.net && !terrain.cleared) {
            terrain.cleared = true;
            if (game.shield > 0) {
              game.shield--;
              game.log.push(`🛡️ 家园庇护保护了伙伴，顺利拆除森林绳网，还剩 ${game.shield} 层庇护。`);
            } else {
              game.log.push(`🕸️ ${player.emoji} ${player.name} 多花 1 步拆除了森林绳网。`);
            }
          }
        }

        const enterLogs = enterCell(game, player);
        game.log.push(...enterLogs);

        game.version++;
        return { success: true, action, x: player.x, y: player.y, ap: player.ap, cost };
      }

      case 'GIVE': {
        // 交接动物
        if (player.ready || mate.ready) {
          return { success: false, error: '双方都处于未就绪状态时才能交接，请队友点击“继续行动”' };
        }

        if (!same(player, mate) && !adjacent(player, mate)) {
          return { success: false, error: '必须与队友在同一格或相邻格才能交接' };
        }

        const myCarried = game.pets.filter((p) => p.carriedBy === player.id);
        if (myCarried.length === 0) {
          return { success: false, error: '身上没有可递交的小动物' };
        }

        const mateCarried = game.pets.filter((p) => p.carriedBy === mate.id);
        if (mateCarried.length >= mate.carry) {
          return { success: false, error: `队友 ${mate.name} 已经抱满啦（容量 ${mate.carry}）` };
        }

        // 转移一只动物
        const petToGive = myCarried[0];
        petToGive.carriedBy = mate.id;
        game.log.push(`${player.emoji} ${player.name} 把 ${petToGive.emoji} ${petToGive.name} 递给了 ${mate.emoji} ${mate.name}！好搭档！`);

        // 若队友在家，立即救回
        if (same(mate, game.home)) {
          const homeLogs = enterCell(game, mate);
          game.log.push(...homeLogs);
        }

        game.version++;
        return { success: true, action, petId: petToGive.id };
      }

      case 'SUPPORT': {
        // 家园守护
        if (!same(player, game.home)) {
          return { success: false, error: '必须在家中才能守护家园' };
        }
        if (player.supported) {
          return { success: false, error: '本回合已经守护过家园啦' };
        }
        if (player.ap < 1) {
          return { success: false, error: '守护家园需要消耗 1 步' };
        }
        if (game.shield >= 2) {
          return { success: false, error: '家园庇护已满（上限 2 层）' };
        }

        player.ap -= 1;
        player.supported = true;
        game.shield += 1;
        game.log.push(`🏡 ${player.emoji} ${player.name} 花费 1 步守护家园，团队庇护升至 ${game.shield} 层！`);

        game.version++;
        return { success: true, action, shield: game.shield, ap: player.ap };
      }

      case 'BOOST': {
        // 勇气加步：2点团队勇气换 2 步，每回合一次
        if (game.energy < 2) {
          return { success: false, error: '团队勇气不足 2 点' };
        }
        if (player.boosted) {
          return { success: false, error: '本回合已经使用过勇气加步啦' };
        }
        if (player.skipTurns > 0) {
          return { success: false, error: '休息中无法使用勇气加步' };
        }

        game.energy -= 2;
        player.boosted = true;
        player.ap = Math.min(player.moves + 2, player.ap + 2);
        game.log.push(`✨ ${player.emoji} ${player.name} 使用 2 点勇气，本回合多走 2 步！当前步数：${player.ap}`);

        game.version++;
        return { success: true, action, energy: game.energy, ap: player.ap };
      }

      case 'READY': {
        player.ready = true;
        game.log.push(`${player.emoji} ${player.name} 结束了本回合行动，等待队友。`);

        // 检查是否双方均 ready
        if (game.players[0].ready && game.players[1].ready) {
          const resolveResult = resolveTeamRound(game);
          game.version++;
          return { success: true, action, ready: true, roundResolved: true, details: resolveResult };
        }

        game.version++;
        return { success: true, action, ready: true, roundResolved: false };
      }

      case 'UNREADY': {
        if (!player.ready) {
          return { success: false, error: '当前本就处于行动中' };
        }
        player.ready = false;
        game.log.push(`${player.emoji} ${player.name} 决定继续行动！`);

        game.version++;
        return { success: true, action, ready: false };
      }

      default:
        return { success: false, error: `未知动作：${action}` };
    }
  }

  /**
   * 服务端原子结算共同回合
   */
  function resolveTeamRound(game) {
    if (game.status !== 'playing') return null;

    const roundNum = game.teamRound;
    const events = [];

    // 1. 推进天气与雷雨检查 (THUNDER_EVERY_TEAM_ROUNDS = 2)
    if (roundNum % CONFIG.THUNDER_EVERY_TEAM_ROUNDS === 0) {
      if (game.shield > 0) {
        game.shield--;
        events.push(`🛡️ 轰隆！雷雨滚滚，家园庇护抵御了雷击，庇护剩余 ${game.shield} 层！`);
      } else {
        // 雷雨惊吓一只尚未救回且未被抱起的小动物
        const loosePets = game.pets.filter((p) => !p.home && p.carriedBy === null);
        if (loosePets.length > 0) {
          const scaredPet = loosePets[Math.floor(game.rng() * loosePets.length)];
          // 尝试向安全非家相邻格移动一格
          const candidateDirs = DIRS.map((d) => ({ x: scaredPet.x + d[0], y: scaredPet.y + d[1] })).filter((t) => {
            return (
              inBounds(game, t.x, t.y) &&
              !same(t, game.home) &&
              moveCost(game, t.x, t.y) <= 2
            );
          });

          if (candidateDirs.length > 0) {
            const dest = candidateDirs[Math.floor(game.rng() * candidateDirs.length)];
            scaredPet.x = dest.x;
            scaredPet.y = dest.y;
            events.push(`⚡ 轰隆！${scaredPet.emoji} ${scaredPet.name} 吓得跑了一格！`);

            // 如果跑进玩家所在格，且玩家有余量，立即被抱起
            for (const p of game.players) {
              if (same(p, scaredPet)) {
                const currentCarried = game.pets.filter((pet) => pet.carriedBy === p.id).length;
                if (currentCarried < p.carry) {
                  scaredPet.carriedBy = p.id;
                  events.push(`${p.emoji} ${p.name} 反应迅速，一把接住了 ${scaredPet.emoji} ${scaredPet.name}！`);
                }
              }
            }
          } else {
            events.push(`⚡ 轰隆！雷声阵阵，小动物们互相靠拢！`);
          }
        } else {
          events.push(`⚡ 轰隆！雷声很大，不过身边的小动物都在怀里和家里，很安全！`);
        }
      }
    }

    // 2. 检查回合上限与风暴判定
    if (game.teamRound >= CONFIG.MAX_TEAM_ROUNDS && !game.pets.every((p) => p.home)) {
      game.status = 'lose';
      events.push(`🌧️ 暴风雨彻底到来了……还有 ${game.pets.filter((p) => !p.home).length} 只小动物没有回家。`);
      game.log.push(...events);
      return { status: 'lose', round: game.teamRound, events };
    }

    // 3. 准备进入下一共同回合
    game.teamRound++;
    events.push(`🔔 第 ${game.teamRound} 回合开始！`);

    // 重置玩家状态与行动点
    game.players.forEach((p) => {
      p.ready = false;
      p.boosted = false;
      p.supported = false;

      if (p.skipTurns > 0) {
        p.skipTurns--;
        p.resting = true;
        p.ap = 0;
        events.push(`💫 ${p.emoji} ${p.name} 休息一回合，暴风雨正在逼近。`);
      } else {
        p.resting = false;
        p.ap = p.moves;
      }
    });

    // 4. 勇气自动轮流分配
    // 回合开始时，轮流优先分配勇气（第奇数回合优先小熊，第偶数回合优先小兔）
    const priorityOrder = game.teamRound % 2 === 1 ? [0, 1] : [1, 0];
    for (const pid of priorityOrder) {
      const p = game.players[pid];
      if (game.energy >= 2 && !p.boosted && p.skipTurns === 0 && p.ap < p.moves + 2) {
        game.energy -= 2;
        p.boosted = true;
        p.ap = Math.min(p.moves + 2, p.ap + 2);
        events.push(`✨ 团队勇气充足！${p.emoji} ${p.name} 自动获得 2 点额外步数！当前步数：${p.ap}`);
      }
    }

    game.log.push(...events);
    return { status: 'playing', round: game.teamRound, events };
  }

  const DIRS = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  /**
   * 视线遮挡检测（Line of Sight Raycast）
   * 检查从 (x1, y1) 到 (x2, y2) 是否穿过任何实心树篱或石头
   */
  function hasLineOfSight(game, x1, y1, x2, y2) {
    let x = Math.round(x1);
    let y = Math.round(y1);
    const targetX = Math.round(x2);
    const targetY = Math.round(y2);

    const dx = Math.abs(targetX - x);
    const dy = Math.abs(targetY - y);
    const sx = x < targetX ? 1 : -1;
    const sy = y < targetY ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x === targetX && y === targetY) {
        return true;
      }

      // 中间格子是否阻挡视线
      if ((x !== Math.round(x1) || y !== Math.round(y1)) && (x !== targetX || y !== targetY)) {
        const terrain = getTerrain(game, x, y);
        if (terrain.solid || terrain.type === 'hedge' || terrain.type === 'rock') {
          return false;
        }
      }

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * 导出公开方法与常量
   */
  return {
    CONFIG,
    HEADINGS,
    HEADING_VECTORS,
    MAZE_SPEC,
    createGame,
    getTerrain,
    moveCost,
    inBounds,
    checkObstacleHint,
    enterCell,
    applyAction,
    resolveTeamRound,
    hasLineOfSight,
    checkWin,
    same,
    adjacent,
  };
});
