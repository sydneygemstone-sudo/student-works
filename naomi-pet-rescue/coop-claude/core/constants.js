/**
 * Naomi《小动物回家》双 iPad 局域网联机 3D 探索版
 * core/constants.js — 全局常量与规则参数（浏览器 / Node 双端通用，零 Node 依赖）
 *
 * R2（2026-09-19）扩展：地图 9×9 → 15×15、双树篱迷宫、狼 / 狮子、
 * 3 座假房子、能量星、迷雾小地图。
 *
 * Author: Claude Code (Claude Opus)
 */

/** 世界为 15×15 离散网格，(0,0) 位于西北角，y 向南递增。 */
export const GRID_SIZE = 15;

/** 中心家园坐标。 */
export const HOME = Object.freeze({ x: 7, y: 7 });

/** 两处树篱迷宫区域。北区在东北角，南区在西南角。 */
export const MAZE_REGIONS = Object.freeze([
  Object.freeze({ id: 'north', x0: 9, x1: 14, y0: 0, y1: 5, seed: 0x4e61, label: '玫瑰迷宫' }),
  Object.freeze({ id: 'south', x0: 0, x1: 4, y0: 10, y1: 14, seed: 0x6f6d, label: '薄荷迷宫' }),
]);

/** 兼容单区域写法的别名（= 北区）。 */
export const MAZE_REGION = MAZE_REGIONS[0];

/** 地形种类。 */
export const TERRAIN = Object.freeze({
  GRASS: 'grass',
  FOREST: 'forest',
  ROCK: 'rock',
  NET: 'net',
  HOME: 'home',
  DECOY: 'decoy', // 假房子所在格（可以走进去，进去要吃苦头）
});

/** 地形进入成本（行动点）。ROCK 为不可通行。 */
export const TERRAIN_COST = Object.freeze({
  [TERRAIN.GRASS]: 1,
  [TERRAIN.HOME]: 1,
  [TERRAIN.DECOY]: 1,
  [TERRAIN.FOREST]: 2,
  [TERRAIN.NET]: 3,
  [TERRAIN.ROCK]: Infinity,
});

/** 有庇护罩时，森林绳网被化解为 1 步，并消耗 1 层庇护。 */
export const NET_SHELTERED_COST = 1;

/** 地形是否遮挡视线（Line of Sight）。 */
export const TERRAIN_BLOCKS_SIGHT = Object.freeze({
  [TERRAIN.GRASS]: false,
  [TERRAIN.HOME]: false,
  [TERRAIN.DECOY]: true, // 假房子是实体小屋，会挡住视线
  [TERRAIN.FOREST]: true,
  [TERRAIN.ROCK]: true,
  [TERRAIN.NET]: false,
});

/** 四方向。屏幕上 N 朝上（-y），E 朝右（+x）。 */
export const DIRECTIONS = Object.freeze(['N', 'E', 'S', 'W']);

export const DIR_VECTOR = Object.freeze({
  N: Object.freeze({ dx: 0, dy: -1 }),
  E: Object.freeze({ dx: 1, dy: 0 }),
  S: Object.freeze({ dx: 0, dy: 1 }),
  W: Object.freeze({ dx: -1, dy: 0 }),
});

export const DIR_OPPOSITE = Object.freeze({ N: 'S', E: 'W', S: 'N', W: 'E' });

export const DIR_LABEL = Object.freeze({ N: '北', E: '东', S: '南', W: '西' });

/** 角色定义：小熊 2 步 / 抱 2 只；小兔 3 步 / 抱 1 只。 */
export const ROLES = Object.freeze({
  BEAR: 'bear',
  BUNNY: 'bunny',
});

export const ROLE_LIST = Object.freeze([ROLES.BEAR, ROLES.BUNNY]);

export const ROLE_CONFIG = Object.freeze({
  [ROLES.BEAR]: Object.freeze({
    id: ROLES.BEAR,
    name: '小熊',
    emoji: '🐻',
    color: '#c98a4b',
    baseAp: 2,
    carryLimit: 2,
    canScareWolf: true, // 只有小熊能把狼吓退
    start: Object.freeze({ x: 6, y: 7, facing: 'W' }),
  }),
  [ROLES.BUNNY]: Object.freeze({
    id: ROLES.BUNNY,
    name: 'Naomi 小兔',
    emoji: '🐰',
    color: '#f2a8c8',
    baseAp: 3,
    carryLimit: 1,
    canScareWolf: false,
    start: Object.freeze({ x: 8, y: 7, facing: 'N' }),
  }),
});

/**
 * 回合与胜负参数。地图从 81 格扩到 225 格，回合预算同步放大。
 * MAX_ROUNDS 由 tools/simulate.mjs 校准：贪心 AI 稳定在 27 回合通关，
 * 留约 25% 余量给「会走错路、会停下来看风景」的真孩子。
 */
export const MAX_ROUNDS = 36;
export const STORM_EVERY = 4; // 每 4 个共同回合结算一次雷雨风暴（一趟往返大约 4–6 回合，太密就趟趟被打断）
export const MAX_SHELTER = 2; // 庇护罩层数上限
export const START_COURAGE = 2; // 队伍初始勇气
export const COURAGE_PER_RESCUE = 2; // 每救回一只小动物奖励的勇气
export const COURAGE_PER_GIFT = 2; // 礼物盒奖励的勇气
export const STORM_COURAGE_PENALTY = 1; // 无庇护时雷雨扣除的勇气

/** 协作动作参数。 */
export const SUPPORT_AP_COST = 1; // 守护家园消耗 1 步
export const SUPPORT_SHELTER_GAIN = 1;
export const BOOST_COURAGE_COST = 2; // 勇气加步消耗 2 点勇气
export const BOOST_AP_GAIN = 2; // 本回合双方各 +2 步
export const GIVE_MAX_DISTANCE = 1; // 曼哈顿距离 ≤ 1 可递交

/** 🌟 能量星：踩到立刻回复行动点，本回合就能用掉。 */
export const TOTAL_ENERGY = 6;
export const ENERGY_AP_GAIN = 2;

/** 🐺 狼：每个共同回合朝最近的玩家走 1 步。 */
export const WOLF_STEPS_PER_ROUND = 1;
export const WOLF_SCARE_AP_COST = 1; // 小熊吓退狼消耗 1 步
export const WOLF_SCARE_PUSHBACK = 3; // 被吓退后沿逃跑方向退开的格数
export const WOLF_STUN_ROUNDS = 1; // 被吓退后发愣的回合数
export const WOLF_COURAGE_PENALTY = 1; // 被狼堵到时扣的勇气

/** 🦁 狮子：不追玩家，专门去找还没被救走的小动物。 */
export const LION_STEPS_PER_ROUND = 1;
export const LION_COURAGE_PENALTY = 1; // 小动物被狮子叼走时扣的勇气
export const LION_SCATTER_MIN_DISTANCE = 4; // 被叼走的小动物重新落点距狮子的最小距离

/** 🏚️ 假房子：长得像家，走错要吃苦头。 */
export const TOTAL_DECOYS = 3;
export const DECOY_COURAGE_PENALTY = 1;

/** 视线与相机参数（客户端 3D 使用，放在 core 便于单元测试）。 */
export const LOS_MAX_DISTANCE = 5.5; // 超出该格距离看不见队友 / 野兽
export const CAMERA_MIN_DISTANCE = 0.55; // 相机防穿墙最小贴身距离（格）
export const CAMERA_DISTANCE = 2.6; // 越肩相机默认后退距离（格）
export const CAMERA_HEIGHT = 2.0;
export const CAMERA_SHOULDER_OFFSET = 0.45;

/** 🗺️ 小地图：走过 / 看到过的格子才点亮（迷雾）。 */
export const MINIMAP_REVEAL_RADIUS = 2; // 站在一格上能点亮周围几格

/** 动作被拒绝的原因码。 */
export const REJECT = Object.freeze({
  BLOCKED: 'blocked', // 撞墙 / 石头 / 树篱 / 外墙 —— 绝不扣行动点
  NO_AP: 'no_ap', // 行动点不足 —— 也不扣行动点
  NOT_YOUR_TURN: 'not_your_turn',
  GAME_OVER: 'game_over',
  TOO_FAR: 'too_far',
  NOTHING_TO_GIVE: 'nothing_to_give',
  RECEIVER_FULL: 'receiver_full',
  NOT_AT_HOME: 'not_at_home',
  SHELTER_FULL: 'shelter_full',
  NO_COURAGE: 'no_courage',
  BOOST_USED: 'boost_used',
  PAUSED: 'paused',
  UNKNOWN_ACTION: 'unknown_action',
  NO_WOLF: 'no_wolf', // 旁边没有狼可以吓
  NOT_BEAR: 'not_bear', // 只有小熊能吓退狼
  NOTHING_HERE: 'nothing_here', // 脚下没有能抱起来的小动物
  CARRY_FULL: 'carry_full', // 怀里已经满了
});

/** 阻挡物类型（用于 3D 石头退路箭头的差异化提示）。 */
export const BLOCKER = Object.freeze({
  ROCK: 'rock',
  HEDGE: 'hedge',
  BOUNDARY: 'boundary',
  WOLF: 'wolf',
});

export const BLOCKER_BANNER = Object.freeze({
  [BLOCKER.ROCK]: '前方挡路！这里有一块大石头，可以后退一步或换条路 🪨',
  [BLOCKER.HEDGE]: '前方挡路！树篱太高啦，可以后退一步或换条路 🌿',
  [BLOCKER.BOUNDARY]: '前方挡路！花园的围墙到头啦，可以后退一步或换条路 🧱',
  [BLOCKER.WOLF]: '前方有狼挡路！让小熊花 1 步把它吓走，或者绕开它 🐺',
});

/** 动作类型。 */
export const ACTION = Object.freeze({
  FORWARD: 'forward',
  BACKWARD: 'backward',
  TURN_LEFT: 'turnLeft',
  TURN_RIGHT: 'turnRight',
  GIVE: 'give',
  SUPPORT: 'support',
  BOOST: 'boost',
  SCARE: 'scare', // 小熊吓退狼
  PICKUP: 'pickup', // 把脚下的小动物抱起来（0 步）
});

/** 对局状态。 */
export const STATUS = Object.freeze({
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
});

export const TOTAL_ANIMALS = 8;
export const TOTAL_GIFTS = 3;
