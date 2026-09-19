/**
 * core/game.js — 共同回合制引擎（权威状态机，服务端与单人测试模式共用）。
 *
 * 规则要点：
 *  - 双人各自自由走步，任一方「结束本回合」只是置 Ready；
 *    只有双方都 Ready，服务端才原子结算并推进下一个共同回合。
 *  - 原地转向 0 步；撞石头 / 树篱 / 外墙 / 狼绝不扣行动点，改为返回退路箭头提示。
 *  - 每 3 个共同回合结算一次雷雨风暴；最多 26 回合。
 *  - R2 新增：狼 / 狮子只在回合结算时各走 1 步；能量星补步；假房子罚步。
 *
 * Author: Claude Code (Claude Opus)
 */

import {
  ACTION, BLOCKER, BLOCKER_BANNER, BOOST_AP_GAIN, BOOST_COURAGE_COST,
  COURAGE_PER_GIFT, COURAGE_PER_RESCUE, DECOY_COURAGE_PENALTY, DIR_OPPOSITE,
  DIRECTIONS, DIR_LABEL, ENERGY_AP_GAIN, GIVE_MAX_DISTANCE, HOME,
  LION_COURAGE_PENALTY, LOS_MAX_DISTANCE, MAX_ROUNDS, MAX_SHELTER,
  MINIMAP_REVEAL_RADIUS, NET_SHELTERED_COST, REJECT, ROLE_CONFIG, ROLE_LIST,
  ROLES, START_COURAGE, STATUS, STORM_COURAGE_PENALTY, STORM_EVERY,
  SUPPORT_AP_COST, SUPPORT_SHELTER_GAIN, TERRAIN, TOTAL_ANIMALS,
  WOLF_COURAGE_PENALTY, WOLF_SCARE_AP_COST,
} from './constants.js';
import { buildWorld, probeStep, openDirections, terrainCost, isHome, inBounds } from './world.js';
import { lineOfSight } from './vision.js';
import { moveWolf, moveLion, scatterAnimal, scareWolf, pushWolfBack, manhattan, isSafeZone } from './beasts.js';

const LOG_LIMIT = 40;

/** 左转 / 右转的方向表（原地转向，0 步）。 */
const TURN_LEFT = Object.freeze({ N: 'W', W: 'S', S: 'E', E: 'N' });
const TURN_RIGHT = Object.freeze({ N: 'E', E: 'S', S: 'W', W: 'N' });

export class GameEngine {
  constructor(options = {}) {
    this.options = options;
    this.reset(options);
  }

  reset(options = this.options) {
    this.world = buildWorld({ seed: options.seed });
    this.seq = 0;
    this.round = 1;
    this.status = STATUS.PLAYING;
    this.weather = 'clear';
    this.log = [];
    this.team = {
      courage: START_COURAGE,
      shelter: 0,
      rescued: [],
      boostUsedThisRound: false,
      explored: new Set(),
    };
    this.players = {};
    for (const role of ROLE_LIST) {
      const cfg = ROLE_CONFIG[role];
      this.players[role] = {
        role,
        name: cfg.name,
        emoji: cfg.emoji,
        color: cfg.color,
        x: cfg.start.x,
        y: cfg.start.y,
        facing: cfg.start.facing,
        ap: cfg.baseAp,
        apMax: cfg.baseAp,
        baseAp: cfg.baseAp,
        carryLimit: cfg.carryLimit,
        canScareWolf: cfg.canScareWolf,
        carrying: [],
        ready: false,
        pausedNextRound: false,
        paused: false,
      };
      this.revealAround(this.players[role]);
    }
    this.pushEvent({ type: 'start', message: `第 1 个共同回合开始啦！一起把 ${TOTAL_ANIMALS} 只小动物送回家 🏡` });
    return this;
  }

  // ———————————————————— 事件与日志 ————————————————————

  pushEvent(event) {
    const record = { seq: (this.seq += 1), round: this.round, ...event };
    this.log.push(record);
    if (this.log.length > LOG_LIMIT) this.log.splice(0, this.log.length - LOG_LIMIT);
    return record;
  }

  // ———————————————————— 查询工具 ————————————————————

  getPlayer(role) {
    const player = this.players[role];
    if (!player) throw new Error(`未知角色：${role}`);
    return player;
  }

  otherRole(role) {
    return role === ROLES.BEAR ? ROLES.BUNNY : ROLES.BEAR;
  }

  animalById(id) {
    return this.world.animals.find((a) => a.id === id) ?? null;
  }

  beastById(id) {
    return this.world.beasts.find((b) => b.id === id) ?? null;
  }

  rescuedCount() {
    return this.world.animals.filter((a) => a.state === 'home').length;
  }

  /** 某格上是否站着野兽（狼会挡路，狮子不挡：它只顾找小动物）。 */
  blockingBeastAt(x, y) {
    return this.world.beasts.find((b) => b.kind === 'wolf' && b.x === x && b.y === y) ?? null;
  }

  /** 队友是否互相可见（视线遮挡判定）。 */
  visibility() {
    const bear = this.players[ROLES.BEAR];
    const bunny = this.players[ROLES.BUNNY];
    const los = lineOfSight(this.world, bear, bunny);
    return { [ROLES.BEAR]: los, [ROLES.BUNNY]: los };
  }

  /** 每位玩家此刻能看见哪些野兽（客户端据此决定渲不渲染狼 / 狮子）。 */
  visibleBeasts() {
    const out = {};
    for (const role of ROLE_LIST) {
      const p = this.players[role];
      out[role] = this.world.beasts
        .filter((b) => lineOfSight(this.world, p, b, LOS_MAX_DISTANCE).visible)
        .map((b) => b.id);
    }
    return out;
  }

  /**
   * 🗺️ 迷雾小地图：把玩家身边能走到、能看到的格子点亮（队伍共享这张地图）。
   * 用受树篱 / 石头阻挡的 BFS 扩散，所以隔着树篱的另一条走廊不会被点亮。
   */
  revealAround(player, radius = MINIMAP_REVEAL_RADIUS) {
    const seen = new Set([`${player.x},${player.y}`]);
    let frontier = [{ x: player.x, y: player.y }];
    for (let step = 0; step < radius; step += 1) {
      const next = [];
      for (const cur of frontier) {
        for (const dir of DIRECTIONS) {
          const probe = probeStep(this.world, cur.x, cur.y, dir);
          // 石头 / 树篱挡视线，但石头那一格本身是看得见的
          if (probe.blocked) {
            if (probe.blocker === 'rock' && probe.target) seen.add(`${probe.target.x},${probe.target.y}`);
            continue;
          }
          const key = `${probe.target.x},${probe.target.y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          next.push(probe.target);
        }
      }
      frontier = next;
    }
    for (const key of seen) this.team.explored.add(key);
    return seen;
  }

  // ———————————————————— 动作分发 ————————————————————

  /**
   * 执行一个动作。
   * @returns {{ok:boolean, reason?:string, events:object[], hint?:object}}
   */
  act(role, action) {
    if (this.status !== STATUS.PLAYING) {
      return this.reject(REJECT.GAME_OVER, '这一局已经结束啦');
    }
    const type = typeof action === 'string' ? action : action?.type;
    const player = this.getPlayer(role);
    if (player.paused && type !== ACTION.TURN_LEFT && type !== ACTION.TURN_RIGHT) {
      return this.reject(REJECT.PAUSED, `${player.name}被恶作剧定住了，这回合只能转身看看`);
    }

    switch (type) {
      case ACTION.FORWARD: return this.move(role, false);
      case ACTION.BACKWARD: return this.move(role, true);
      case ACTION.TURN_LEFT: return this.turn(role, 'left');
      case ACTION.TURN_RIGHT: return this.turn(role, 'right');
      case ACTION.GIVE: return this.give(role, action?.animalId);
      case ACTION.SUPPORT: return this.support(role);
      case ACTION.BOOST: return this.boost(role);
      case ACTION.SCARE: return this.scare(role);
      case ACTION.PICKUP: return this.pickup(role);
      default: return this.reject(REJECT.UNKNOWN_ACTION, `不认识的动作：${type}`);
    }
  }

  reject(reason, message, extra = {}) {
    return { ok: false, reason, message, events: [], ...extra };
  }

  // ———————————————————— 转向（0 步） ————————————————————

  turn(role, side) {
    const player = this.getPlayer(role);
    const before = player.facing;
    player.facing = side === 'left' ? TURN_LEFT[before] : TURN_RIGHT[before];
    const event = this.pushEvent({
      type: 'turn', role, from: before, to: player.facing, apCost: 0,
      message: `${player.name}原地转向${DIR_LABEL[player.facing]}（0 步）`,
    });
    return { ok: true, apCost: 0, events: [event] };
  }

  // ———————————————————— 移动 ————————————————————

  /**
   * 前进 / 后退。撞上石头、树篱、外墙或狼时：不扣行动点、不穿墙，
   * 返回 Naomi 创意 1 的「石头退路箭头」提示。
   */
  move(role, backward) {
    const player = this.getPlayer(role);
    const dir = backward ? DIR_OPPOSITE[player.facing] : player.facing;
    const probe = probeStep(this.world, player.x, player.y, dir);

    const blocker = probe.blocked
      ? probe.blocker
      : (this.blockingBeastAt(probe.target.x, probe.target.y) ? BLOCKER.WOLF : null);

    if (blocker) {
      const hint = this.buildBlockHint(player, dir, blocker);
      const event = this.pushEvent({
        type: 'blocked', role, dir, blocker, hint,
        apCost: 0, message: hint.banner,
      });
      return { ok: false, reason: REJECT.BLOCKED, blocker, hint, message: hint.banner, events: [event] };
    }

    const { x: nx, y: ny } = probe.target;
    const terrain = this.world.grid[ny][nx];
    let cost = terrainCost(terrain);
    let shelterUsed = false;
    if (terrain === TERRAIN.NET && this.team.shelter > 0) {
      cost = NET_SHELTERED_COST;
      shelterUsed = true;
    }

    if (player.ap < cost) {
      return this.reject(
        REJECT.NO_AP,
        `${player.name}的行动点不够走进${terrainName(terrain)}（需要 ${cost} 步，还剩 ${player.ap} 步）`,
        { needed: cost, available: player.ap },
      );
    }

    player.ap -= cost;
    if (shelterUsed) {
      this.team.shelter -= 1;
      this.pushEvent({ type: 'shelter', delta: -1, shelter: this.team.shelter, message: '庇护罩化解了森林绳网 🛡️' });
    }
    player.x = nx;
    player.y = ny;
    this.revealAround(player);

    const events = [this.pushEvent({
      type: 'move', role, dir, backward: Boolean(backward), to: { x: nx, y: ny }, terrain, apCost: cost,
      message: `${player.name}${backward ? '后退' : '前进'}到 (${nx},${ny})，消耗 ${cost} 步`,
    })];

    events.push(...this.resolveCell(role));
    return { ok: true, apCost: cost, events };
  }

  buildBlockHint(player, dir, blocker) {
    const alternatives = openDirections(this.world, player.x, player.y)
      .filter((d) => d !== dir)
      .filter((d) => {
        const probe = probeStep(this.world, player.x, player.y, d);
        return probe.target ? !this.blockingBeastAt(probe.target.x, probe.target.y) : false;
      });
    const retreatDir = DIR_OPPOSITE[dir];
    return {
      blocker,
      banner: BLOCKER_BANNER[blocker] ?? BLOCKER_BANNER[BLOCKER.ROCK],
      attemptedDir: dir,
      retreatDir,
      retreatOpen: alternatives.includes(retreatDir),
      alternatives,
      from: { x: player.x, y: player.y },
      // 3D 箭头挂在角色与障碍之间的半格处，指回安全的退路方向
      arrow: { x: player.x, y: player.y, towards: dir, pointing: retreatDir },
    };
  }

  // ———————————————————— 进入格子后的结算 ————————————————————

  resolveCell(role) {
    const player = this.getPlayer(role);
    const events = [];

    // 1) 走错门：假房子长得像家，进去要吃苦头
    if (this.world.grid[player.y][player.x] === TERRAIN.DECOY) {
      events.push(...this.enterDecoy(role));
      return events; // 进了假房子这一格就先别捡东西了，先把苦头吃完
    }

    // 2) 回到家园：怀里的小动物全部得救
    if (isHome(player.x, player.y) && player.carrying.length > 0) {
      events.push(...this.rescueCarried(role));
    }

    // 3) 踩到小动物：还有空余负重就自动抱起
    for (const animal of this.world.animals) {
      if (animal.state !== 'wild') continue;
      if (animal.x !== player.x || animal.y !== player.y) continue;
      if (player.carrying.length >= player.carryLimit) {
        events.push(this.pushEvent({
          type: 'carry_full', role, animalId: animal.id,
          message: `${player.name}怀里满啦，抱不下${animal.name}${animal.emoji}（上限 ${player.carryLimit} 只）`,
        }));
        continue;
      }
      animal.state = 'carried';
      animal.carriedBy = role;
      player.carrying.push(animal.id);
      events.push(this.pushEvent({
        type: 'pickup', role, animalId: animal.id,
        message: `${player.name}抱起了${animal.name}${animal.emoji}`,
      }));
    }

    // 4) 🌟 能量星：立刻回步，本回合就能用掉
    const star = this.world.energies.find((e) => !e.taken && e.x === player.x && e.y === player.y);
    if (star) {
      star.taken = true;
      star.takenBy = role;
      player.ap += ENERGY_AP_GAIN;
      player.apMax += ENERGY_AP_GAIN;
      events.push(this.pushEvent({
        type: 'energy', role, energyId: star.id, gain: ENERGY_AP_GAIN, ap: player.ap,
        message: `🌟 能量星！${player.name}本回合 +${ENERGY_AP_GAIN} 步（还剩 ${player.ap} 步）`,
      }));
    }

    // 5) 礼盒
    const gift = this.world.gifts.find((g) => !g.opened && g.x === player.x && g.y === player.y);
    if (gift) {
      gift.opened = true;
      gift.openedBy = role;
      if (gift.kind === 'gift') {
        this.team.courage += COURAGE_PER_GIFT;
        events.push(this.pushEvent({
          type: 'gift', role, giftId: gift.id, kind: 'gift', courage: this.team.courage,
          message: `🎁 礼物盒！全队勇气 +${COURAGE_PER_GIFT}（现在 ${this.team.courage}）`,
        }));
      } else {
        player.pausedNextRound = true;
        events.push(this.pushEvent({
          type: 'gift', role, giftId: gift.id, kind: 'prank',
          message: `🃏 恶作剧盒！${player.name}下个回合要原地休息一轮`,
        }));
      }
    }

    return events;
  }

  /** 🏚️ 走进假房子：怀里的小动物掉在门口，本回合剩下的步数也用光了。 */
  enterDecoy(role) {
    const player = this.getPlayer(role);
    const decoy = this.world.decoys.find((d) => d.x === player.x && d.y === player.y);
    const events = [];
    const firstTime = decoy ? !decoy.discovered : true;
    if (decoy) {
      decoy.discovered = true;
      decoy.trips += 1;
    }

    const dropped = player.carrying.slice();
    for (const animalId of dropped) {
      const animal = this.animalById(animalId);
      animal.state = 'wild';
      animal.carriedBy = null;
      animal.x = player.x;
      animal.y = player.y;
    }
    player.carrying = [];

    const lostAp = player.ap;
    player.ap = 0;
    if (firstTime) this.team.courage = Math.max(0, this.team.courage - DECOY_COURAGE_PENALTY);

    events.push(this.pushEvent({
      type: 'decoy',
      role,
      decoyId: decoy?.id ?? null,
      firstTime,
      dropped,
      lostAp,
      courage: this.team.courage,
      message: firstTime
        ? `🏚️ 这不是家！${decoy?.hint ?? '这座'}小屋是空的，${player.name}愣住了${dropped.length ? `，怀里的小动物掉在了门口` : ''}。本回合剩下的 ${lostAp} 步用光了，勇气 -${DECOY_COURAGE_PENALTY}`
        : `🏚️ 又走错门啦！${decoy?.hint ?? '这座'}小屋还是空的${dropped.length ? `，小动物又掉了下来` : ''}。本回合剩下的 ${lostAp} 步用光了`,
    }));
    if (dropped.length > 0) {
      events.push(this.pushEvent({
        type: 'drop', role, animalIds: dropped, at: { x: player.x, y: player.y },
        message: `真正的家在花园正中央 (${HOME.x},${HOME.y})，看看小地图上的 🏡 再出发`,
      }));
    }
    return events;
  }

  rescueCarried(role) {
    const player = this.getPlayer(role);
    const events = [];
    for (const animalId of player.carrying.slice()) {
      const animal = this.animalById(animalId);
      animal.state = 'home';
      animal.carriedBy = null;
      animal.x = HOME.x;
      animal.y = HOME.y;
      this.team.courage += COURAGE_PER_RESCUE;
      this.team.rescued.push(animalId);
      events.push(this.pushEvent({
        type: 'rescue', role, animalId, rescued: this.rescuedCount(), courage: this.team.courage,
        message: `🏡 ${animal.name}${animal.emoji}平安到家！勇气 +${COURAGE_PER_RESCUE}（${this.rescuedCount()}/${TOTAL_ANIMALS}）`,
      }));
    }
    player.carrying = [];
    if (this.rescuedCount() >= TOTAL_ANIMALS) {
      this.status = STATUS.WON;
      events.push(this.pushEvent({
        type: 'win',
        message: `🎉 太棒了！${TOTAL_ANIMALS} 只小动物全部回家，小熊和 Naomi 小兔做到了！`,
      }));
    }
    return events;
  }

  // ———————————————————— 协作动作 ————————————————————

  /** 🤝 递给队友：同格或相邻，0 步。队友在家则直接救回。 */
  give(role, animalId) {
    const giver = this.getPlayer(role);
    const receiverRole = this.otherRole(role);
    const receiver = this.getPlayer(receiverRole);

    if (giver.carrying.length === 0) {
      return this.reject(REJECT.NOTHING_TO_GIVE, `${giver.name}怀里没有小动物可以递出去`);
    }
    const distance = Math.abs(giver.x - receiver.x) + Math.abs(giver.y - receiver.y);
    if (distance > GIVE_MAX_DISTANCE) {
      return this.reject(REJECT.TOO_FAR, `离队友太远啦（曼哈顿距离 ${distance}，需要 ≤ ${GIVE_MAX_DISTANCE}）`, { distance });
    }

    const chosen = animalId && giver.carrying.includes(animalId) ? animalId : giver.carrying[0];
    const animal = this.animalById(chosen);
    const receiverAtHome = isHome(receiver.x, receiver.y);

    if (!receiverAtHome && receiver.carrying.length >= receiver.carryLimit) {
      return this.reject(REJECT.RECEIVER_FULL, `${receiver.name}怀里满啦（上限 ${receiver.carryLimit} 只）`);
    }

    giver.carrying = giver.carrying.filter((id) => id !== chosen);
    const events = [];

    if (receiverAtHome) {
      animal.state = 'home';
      animal.carriedBy = null;
      animal.x = HOME.x;
      animal.y = HOME.y;
      this.team.courage += COURAGE_PER_RESCUE;
      this.team.rescued.push(chosen);
      events.push(this.pushEvent({
        type: 'give', role, to: receiverRole, animalId: chosen, rescuedImmediately: true, apCost: 0,
        message: `🤝 ${giver.name}把${animal.name}${animal.emoji}递给在家的${receiver.name}，直接得救！勇气 +${COURAGE_PER_RESCUE}`,
      }));
      events.push(this.pushEvent({
        type: 'rescue', role: receiverRole, animalId: chosen, rescued: this.rescuedCount(), courage: this.team.courage,
        message: `🏡 ${animal.name}${animal.emoji}平安到家！（${this.rescuedCount()}/${TOTAL_ANIMALS}）`,
      }));
      if (this.rescuedCount() >= TOTAL_ANIMALS) {
        this.status = STATUS.WON;
        events.push(this.pushEvent({ type: 'win', message: `🎉 太棒了！${TOTAL_ANIMALS} 只小动物全部回家！` }));
      }
    } else {
      animal.carriedBy = receiverRole;
      receiver.carrying.push(chosen);
      events.push(this.pushEvent({
        type: 'give', role, to: receiverRole, animalId: chosen, rescuedImmediately: false, apCost: 0,
        message: `🤝 ${giver.name}把${animal.name}${animal.emoji}递给了${receiver.name}（0 步）`,
      }));
    }
    return { ok: true, apCost: 0, events };
  }

  /** 🏡 守护家园：在家消耗 1 步，为全队 +1 层庇护（上限 2）。 */
  support(role) {
    const player = this.getPlayer(role);
    if (!isHome(player.x, player.y)) {
      return this.reject(REJECT.NOT_AT_HOME, `要站在家园 (${HOME.x},${HOME.y}) 才能守护小木屋哦`);
    }
    if (this.team.shelter >= MAX_SHELTER) {
      return this.reject(REJECT.SHELTER_FULL, `庇护罩已经有 ${MAX_SHELTER} 层，是最强状态啦`);
    }
    if (player.ap < SUPPORT_AP_COST) {
      return this.reject(REJECT.NO_AP, `守护家园需要 ${SUPPORT_AP_COST} 步，${player.name}的行动点不够了`);
    }
    player.ap -= SUPPORT_AP_COST;
    this.team.shelter += SUPPORT_SHELTER_GAIN;
    const event = this.pushEvent({
      type: 'support', role, shelter: this.team.shelter, apCost: SUPPORT_AP_COST,
      message: `🏡 ${player.name}守护家园，庇护罩 ${this.team.shelter}/${MAX_SHELTER} 层 🛡️`,
    });
    return { ok: true, apCost: SUPPORT_AP_COST, events: [event] };
  }

  /** ✨ 勇气加步：全队消耗 2 点勇气，本回合双方各 +2 步（每回合限一次）。 */
  boost() {
    if (this.team.boostUsedThisRound) {
      return this.reject(REJECT.BOOST_USED, '这个回合已经用过勇气加步啦');
    }
    if (this.team.courage < BOOST_COURAGE_COST) {
      return this.reject(REJECT.NO_COURAGE, `勇气不够（需要 ${BOOST_COURAGE_COST}，现在 ${this.team.courage}）`);
    }
    this.team.courage -= BOOST_COURAGE_COST;
    this.team.boostUsedThisRound = true;
    for (const role of ROLE_LIST) {
      const player = this.players[role];
      if (player.paused) continue; // 被恶作剧定住的角色这回合不加步
      player.ap += BOOST_AP_GAIN;
      player.apMax += BOOST_AP_GAIN;
    }
    const event = this.pushEvent({
      type: 'boost', courage: this.team.courage, gain: BOOST_AP_GAIN,
      message: `✨ 勇气加步！本回合双方各 +${BOOST_AP_GAIN} 步（勇气剩 ${this.team.courage}）`,
    });
    return { ok: true, apCost: 0, events: [event] };
  }

  /**
   * 🫳 把脚下的小动物抱起来，0 步。
   *
   * 雷雨、狼、走错门都会让怀里的小动物掉在脚边。没有这个动作，孩子就只能
   * 「走开一格再走回来」才能重新抱起 —— 明明就在脚下却捡不起来，很不讲道理。
   */
  pickup(role) {
    const player = this.getPlayer(role);
    const here = this.world.animals.filter(
      (a) => a.state === 'wild' && a.x === player.x && a.y === player.y,
    );
    if (here.length === 0) {
      return this.reject(REJECT.NOTHING_HERE, `${player.name}脚下没有需要抱起来的小动物`);
    }
    if (player.carrying.length >= player.carryLimit) {
      return this.reject(REJECT.CARRY_FULL, `${player.name}怀里满啦（上限 ${player.carryLimit} 只），先送回家再来`);
    }

    const events = [];
    for (const animal of here) {
      if (player.carrying.length >= player.carryLimit) break;
      animal.state = 'carried';
      animal.carriedBy = role;
      player.carrying.push(animal.id);
      events.push(this.pushEvent({
        type: 'pickup', role, animalId: animal.id, apCost: 0,
        message: `${player.name}把${animal.name}${animal.emoji}重新抱了起来（0 步）`,
      }));
    }
    return { ok: true, apCost: 0, events };
  }

  /** 🐻💢 吼一声吓退狼：只有小熊做得到，消耗 1 步。 */
  scare(role) {
    const player = this.getPlayer(role);
    if (!player.canScareWolf) {
      return this.reject(REJECT.NOT_BEAR, `${player.name}吓不住狼，得让小熊来吼一声 🐻`);
    }
    const wolf = this.world.beasts.find((b) => b.kind === 'wolf' && manhattan(b, player) <= 1);
    if (!wolf) {
      return this.reject(REJECT.NO_WOLF, '旁边没有狼，不用吓啦');
    }
    if (player.ap < WOLF_SCARE_AP_COST) {
      return this.reject(REJECT.NO_AP, `吓退狼需要 ${WOLF_SCARE_AP_COST} 步，${player.name}的行动点不够了`);
    }
    player.ap -= WOLF_SCARE_AP_COST;
    const result = scareWolf(this.world, wolf, player);
    const event = this.pushEvent({
      type: 'scare', role, beastId: wolf.id, apCost: WOLF_SCARE_AP_COST,
      from: result.from, to: result.to, pushed: result.pushed,
      message: result.pushed > 0
        ? `🐻💢 小熊大吼一声！灰狼被吓退了 ${result.pushed} 格，还要发愣一个回合 🐺💨`
        : '🐻💢 小熊大吼一声！灰狼缩在角落里发愣一个回合 🐺😵',
    });
    return { ok: true, apCost: WOLF_SCARE_AP_COST, events: [event] };
  }

  // ———————————————————— 就绪与原子推进 ————————————————————

  /**
   * 设置某一方的「结束本回合」状态。
   * 单方就绪不推进世界；行动点归零也不自动推进；重复置位幂等。
   * @returns {{ok:boolean, advanced:boolean, events:object[]}}
   */
  setReady(role, value = true) {
    if (this.status !== STATUS.PLAYING) {
      return { ok: false, advanced: false, reason: REJECT.GAME_OVER, events: [] };
    }
    const player = this.getPlayer(role);
    const changed = player.ready !== Boolean(value);
    player.ready = Boolean(value);
    const events = [];
    if (changed) {
      events.push(this.pushEvent({
        type: 'ready', role, ready: player.ready,
        message: player.ready ? `${player.name}已就绪，等待队友…` : `${player.name}取消了就绪`,
      }));
    }
    if (this.bothReady()) {
      const advanceEvents = this.advanceRound();
      return { ok: true, advanced: true, events: [...events, ...advanceEvents] };
    }
    return { ok: true, advanced: false, events };
  }

  bothReady() {
    return ROLE_LIST.every((role) => this.players[role].ready);
  }

  /**
   * 双方都就绪时的原子结算。顺序是固定的，测试锁死了它：
   *   天气 → 狼走 → 狼威胁 → 狮走 → 狮叼动物 → 回合上限 → 刷新行动点。
   */
  advanceRound() {
    const events = [];

    // 1) 天气结算：每 STORM_EVERY 个共同回合一次雷雨风暴
    if (this.round % STORM_EVERY === 0) {
      events.push(...this.resolveStorm());
    }

    // 2) 野兽行动
    events.push(...this.resolveBeasts());

    // 3) 回合上限
    if (this.round >= MAX_ROUNDS) {
      this.status = this.rescuedCount() >= TOTAL_ANIMALS ? STATUS.WON : STATUS.LOST;
      for (const role of ROLE_LIST) this.players[role].ready = false;
      events.push(this.pushEvent({
        type: this.status === STATUS.WON ? 'win' : 'lose',
        message: this.status === STATUS.WON
          ? '🎉 全部小动物都回家啦！'
          : `⏳ ${MAX_ROUNDS} 个回合用完了，还有 ${TOTAL_ANIMALS - this.rescuedCount()} 只小动物在外面，下次再来救它们！`,
      }));
      return events;
    }

    // 4) 推进回合，刷新行动点
    this.round += 1;
    this.team.boostUsedThisRound = false;
    this.weather = 'clear';
    for (const role of ROLE_LIST) {
      const player = this.players[role];
      player.ready = false;
      player.paused = player.pausedNextRound;
      player.pausedNextRound = false;
      player.apMax = player.baseAp;
      player.ap = player.paused ? 0 : player.baseAp;
      if (player.paused) {
        events.push(this.pushEvent({
          type: 'paused', role,
          message: `😵 ${player.name}这回合被恶作剧定住，行动点为 0`,
        }));
      }
    }
    events.push(this.pushEvent({
      type: 'round', round: this.round,
      message: `🔄 第 ${this.round}/${MAX_ROUNDS} 个共同回合开始，行动点已刷新`,
    }));
    return events;
  }

  /** 🐺🦁 野兽各走一步，并结算它们造成的后果。 */
  resolveBeasts() {
    const events = [];
    for (const beast of this.world.beasts) {
      // 还没到苏醒回合就继续打盹，给孩子熟悉花园的时间
      if (this.round < beast.wakeRound) continue;
      if (!beast.awake) {
        beast.awake = true;
        events.push(this.pushEvent({
          type: 'beast_wake', beastId: beast.id, kind: beast.kind, at: { x: beast.x, y: beast.y },
          message: beast.kind === 'wolf'
            ? '🐺 灰狼醒了！它会一直追着你们走，小熊可以吼一声把它吓退'
            : '🦁 狮子醒了！它要去抓还没被救走的小动物，一个人牵制住它，另一个赶紧去救',
        }));
      }
      if (beast.stunned > 0) {
        beast.stunned -= 1;
        events.push(this.pushEvent({
          type: 'beast_stunned', beastId: beast.id, kind: beast.kind, remaining: beast.stunned,
          message: `${beast.emoji} ${beast.name}还在发愣，这回合没动`,
        }));
        continue;
      }

      if (beast.kind === 'wolf') {
        const result = moveWolf(this.world, beast, this.players);
        if (result.moved) {
          events.push(this.pushEvent({
            type: 'beast_move', beastId: beast.id, kind: 'wolf', from: result.from, to: result.to,
            message: `🐺 灰狼朝${this.players[result.target]?.name ?? '你们'}走近了一步`,
          }));
        }
        events.push(...this.resolveWolfThreat(beast));
      } else if (beast.kind === 'lion') {
        const result = moveLion(this.world, beast, this.players, this.world.animals);
        if (result.distracted) {
          events.push(this.pushEvent({
            type: 'beast_distracted', beastId: beast.id, kind: 'lion', by: result.blockedBy,
            message: `🦁 狮子被${result.blockedBy.map((r) => this.players[r].name).join('和')}牵制住了，这回合没能去找小动物 👏`,
          }));
          continue;
        }
        if (result.moved) {
          events.push(this.pushEvent({
            type: 'beast_move', beastId: beast.id, kind: 'lion', from: result.from, to: result.to,
            targetAnimalId: result.targetAnimalId,
            message: `🦁 狮子朝${this.animalById(result.targetAnimalId)?.name ?? '小动物'}那边走近了一步`,
          }));
        }
        if (result.reached) events.push(...this.resolveLionSnatch(beast, result.targetAnimalId));
      }
    }
    return events;
  }

  /** 狼贴上来了：咬掉一只怀里的小动物，扣 1 勇气，然后它自己退开一格。 */
  resolveWolfThreat(wolf) {
    const events = [];
    for (const role of ROLE_LIST) {
      const player = this.players[role];
      if (manhattan(player, wolf) > 1) continue;
      if (isSafeZone(player.x, player.y)) continue; // 家门口狼不敢造次

      if (player.carrying.length > 0) {
        const animalId = player.carrying[0];
        const animal = this.animalById(animalId);
        player.carrying = player.carrying.filter((id) => id !== animalId);
        animal.state = 'wild';
        animal.carriedBy = null;
        animal.x = player.x;
        animal.y = player.y;
        this.team.courage = Math.max(0, this.team.courage - WOLF_COURAGE_PENALTY);
        events.push(this.pushEvent({
          type: 'wolf_bite', role, beastId: wolf.id, animalId, courage: this.team.courage,
          message: `🐺 灰狼扑过来！${player.name}吓了一跳，${animal.name}${animal.emoji}掉在了地上，勇气 -${WOLF_COURAGE_PENALTY}`,
        }));
      } else {
        this.team.courage = Math.max(0, this.team.courage - WOLF_COURAGE_PENALTY);
        events.push(this.pushEvent({
          type: 'wolf_bite', role, beastId: wolf.id, animalId: null, courage: this.team.courage,
          message: `🐺 灰狼冲${player.name}龇了龇牙，大家的勇气 -${WOLF_COURAGE_PENALTY}（让小熊吼回去！）`,
        }));
      }

      // 咬完就退开一格，不会贴着连咬；但它下回合照样会再追上来
      const back = { x: wolf.x, y: wolf.y };
      const retreat = pushWolfBack(this.world, wolf, player, 1, 0);
      if (retreat.to.x !== back.x || retreat.to.y !== back.y) {
        events.push(this.pushEvent({
          type: 'beast_move', beastId: wolf.id, kind: 'wolf', from: back, to: retreat.to,
          message: '🐺 灰狼叼着得意退开了几步',
        }));
      }
      break; // 一个回合只吓一个人
    }
    return events;
  }

  /** 狮子追上了小动物：把它叼到远处藏起来，扣 1 勇气。小动物不会永远丢掉。 */
  resolveLionSnatch(lion, animalId) {
    const events = [];
    const animal = this.animalById(animalId);
    if (!animal || animal.state !== 'wild') return events;

    const landed = scatterAnimal(this.world, animal, lion);
    this.team.courage = Math.max(0, this.team.courage - LION_COURAGE_PENALTY);
    events.push(this.pushEvent({
      type: 'lion_snatch', beastId: lion.id, animalId, to: landed ? { x: landed.x, y: landed.y } : null,
      courage: this.team.courage,
      message: landed
        ? `🦁 狮子追上了${animal.name}${animal.emoji}！它吓得一路跑到了 (${landed.x},${landed.y})，勇气 -${LION_COURAGE_PENALTY}。下次要有人去牵制狮子！`
        : `🦁 狮子扑了个空，${animal.name}${animal.emoji}躲了起来`,
    }));
    return events;
  }

  resolveStorm() {
    const events = [];
    this.weather = 'storm';
    if (this.team.shelter > 0) {
      this.team.shelter -= 1;
      events.push(this.pushEvent({
        type: 'storm', sheltered: true, shelter: this.team.shelter,
        message: `⛈️ 雷雨来了！庇护罩挡住了（还剩 ${this.team.shelter} 层）🛡️`,
      }));
      return events;
    }
    // 每人最多被吓掉 1 只，不是怀里的全掉。
    // Naomi 这一版的难度交给狼和狮子，雷雨主要是气氛 —— 一次清空小熊怀里的 2 只太狠，
    // 而且孩子拿它没辙（除非一直守在家造庇护罩，那就没人出去救了）。
    let startled = 0;
    for (const role of ROLE_LIST) {
      const player = this.players[role];
      const animalId = player.carrying[0];
      if (!animalId) continue;
      const animal = this.animalById(animalId);
      animal.state = 'wild';
      animal.carriedBy = null;
      animal.x = player.x;
      animal.y = player.y;
      player.carrying = player.carrying.filter((id) => id !== animalId);
      startled += 1;
    }
    this.team.courage = Math.max(0, this.team.courage - STORM_COURAGE_PENALTY);
    events.push(this.pushEvent({
      type: 'storm', sheltered: false, startled, courage: this.team.courage,
      message: startled > 0
        ? `⛈️ 雷雨来了！${startled} 只小动物受惊跳到了地上，勇气 -${STORM_COURAGE_PENALTY}（记得先在家造庇护罩）`
        : `⛈️ 雷雨来了！大家都空着手，只是勇气 -${STORM_COURAGE_PENALTY}`,
    }));
    return events;
  }

  // ———————————————————— 快照 ————————————————————

  /** 探索过的格子压成一串 0/1，比发一个几百项的数组省带宽。 */
  exploredMask() {
    const size = this.world.size;
    let mask = '';
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) mask += this.team.explored.has(`${x},${y}`) ? '1' : '0';
    }
    return mask;
  }

  /** 完整可 JSON 序列化的状态快照（服务端每次变更后广播）。 */
  snapshot() {
    const visibility = this.visibility()[ROLES.BEAR];
    return {
      status: this.status,
      round: this.round,
      maxRounds: MAX_ROUNDS,
      size: this.world.size,
      weather: this.weather,
      stormThisRound: this.round % STORM_EVERY === 0,
      nextStormIn: this.round % STORM_EVERY === 0 ? 0 : STORM_EVERY - (this.round % STORM_EVERY),
      seed: this.world.seed,
      grid: this.world.grid,
      walls: [...this.world.walls],
      home: { ...HOME },
      explored: this.exploredMask(),
      team: {
        courage: this.team.courage,
        shelter: this.team.shelter,
        maxShelter: MAX_SHELTER,
        rescued: this.team.rescued.slice(),
        rescuedCount: this.rescuedCount(),
        totalAnimals: TOTAL_ANIMALS,
        boostUsedThisRound: this.team.boostUsedThisRound,
      },
      players: Object.fromEntries(ROLE_LIST.map((role) => {
        const p = this.players[role];
        return [role, {
          role: p.role, name: p.name, emoji: p.emoji, color: p.color,
          x: p.x, y: p.y, facing: p.facing,
          ap: p.ap, apMax: p.apMax, baseAp: p.baseAp,
          carrying: p.carrying.slice(), carryLimit: p.carryLimit,
          ready: p.ready, paused: p.paused, pausedNextRound: p.pausedNextRound,
          canScareWolf: Boolean(p.canScareWolf),
          openDirs: openDirections(this.world, p.x, p.y),
          // 给客户端决定「🫳 抱起来」「🐻💢 吓退狼」两个按钮要不要亮
          animalsHere: this.world.animals
            .filter((a) => a.state === 'wild' && a.x === p.x && a.y === p.y)
            .map((a) => a.id),
          wolfAdjacent: this.world.beasts.some((b) => b.kind === 'wolf' && b.awake && manhattan(b, p) <= 1),
          onDecoy: this.world.grid[p.y][p.x] === TERRAIN.DECOY,
        }];
      })),
      animals: this.world.animals.map((a) => ({
        id: a.id, name: a.name, emoji: a.emoji, kind: a.kind,
        x: a.x, y: a.y, state: a.state, carriedBy: a.carriedBy,
      })),
      gifts: this.world.gifts.map((g) => ({
        id: g.id, x: g.x, y: g.y, opened: g.opened, kind: g.opened ? g.kind : null,
      })),
      energies: this.world.energies.map((e) => ({
        id: e.id, x: e.x, y: e.y, taken: e.taken,
      })),
      decoys: this.world.decoys.map((d) => ({
        id: d.id, x: d.x, y: d.y, discovered: d.discovered, trips: d.trips,
      })),
      beasts: this.world.beasts.map((b) => ({
        id: b.id, kind: b.kind, name: b.name, emoji: b.emoji,
        x: b.x, y: b.y, facing: b.facing,
        awake: b.awake, stunned: b.stunned, distracted: Boolean(b.distracted),
        wakeRound: b.wakeRound,
      })),
      visibleBeasts: this.visibleBeasts(),
      visibility: { visible: visibility.visible, reason: visibility.reason, distance: Number(visibility.distance.toFixed(2)) },
      log: this.log.slice(-20),
      directions: DIRECTIONS,
    };
  }
}

function terrainName(terrain) {
  return ({
    [TERRAIN.GRASS]: '草地', [TERRAIN.FOREST]: '森林',
    [TERRAIN.NET]: '森林绳网', [TERRAIN.HOME]: '家园',
    [TERRAIN.ROCK]: '石头', [TERRAIN.DECOY]: '小屋',
  })[terrain] ?? terrain;
}

export default GameEngine;
