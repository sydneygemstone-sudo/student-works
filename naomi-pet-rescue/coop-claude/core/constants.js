/**
 * Naomi《小动物回家》双 iPad 局域网联机 3D 探索版
 * core/constants.js — 全局常量与规则参数（浏览器 / Node 双端通用，零 Node 依赖）
 *
 * Author: Claude Code (Claude Opus)
 */

/** 世界为 9×9 离散网格，(0,0) 位于西北角，y 向南递增。 */
export const GRID_SIZE = 9;

/** 中心家园坐标。 */
export const HOME = Object.freeze({ x: 4, y: 4 });

/** 东北角树篱迷宫区域：x 5~8, y 0~3。 */
export const MAZE_REGION = Object.freeze({ x0: 5, x1: 8, y0: 0, y1: 3 });

/** 地形种类。 */
export const TERRAIN = Object.freeze({
  GRASS: 'grass',
  FOREST: 'forest',
  ROCK: 'rock',
  NET: 'net',
  HOME: 'home',
});

/** 地形进入成本（行动点）。ROCK 为不可通行。 */
export const TERRAIN_COST = Object.freeze({
  [TERRAIN.GRASS]: 1,
  [TERRAIN.HOME]: 1,
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
    start: Object.freeze({ x: 3, y: 4, facing: 'W' }),
  }),
  [ROLES.BUNNY]: Object.freeze({
    id: ROLES.BUNNY,
    name: 'Naomi 小兔',
    emoji: '🐰',
    color: '#f2a8c8',
    baseAp: 3,
    carryLimit: 1,
    start: Object.freeze({ x: 5, y: 4, facing: 'N' }),
  }),
});

/** 回合与胜负参数。 */
export const MAX_ROUNDS = 14;
export const STORM_EVERY = 2; // 每 2 个共同回合结算一次雷雨风暴
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

/** 视线与相机参数（客户端 3D 使用，放在 core 便于单元测试）。 */
export const LOS_MAX_DISTANCE = 4.5; // 超出该格距离看不见队友
export const CAMERA_MIN_DISTANCE = 0.55; // 相机防穿墙最小贴身距离（格）
export const CAMERA_DISTANCE = 2.6; // 越肩相机默认后退距离（格）
export const CAMERA_HEIGHT = 2.0;
export const CAMERA_SHOULDER_OFFSET = 0.45;

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
});

/** 阻挡物类型（用于 3D 石头退路箭头的差异化提示）。 */
export const BLOCKER = Object.freeze({
  ROCK: 'rock',
  HEDGE: 'hedge',
  BOUNDARY: 'boundary',
});

export const BLOCKER_BANNER = Object.freeze({
  [BLOCKER.ROCK]: '前方挡路！这里有一块大石头，可以后退一步或换条路 🪨',
  [BLOCKER.HEDGE]: '前方挡路！树篱太高啦，可以后退一步或换条路 🌿',
  [BLOCKER.BOUNDARY]: '前方挡路！花园的围墙到头啦，可以后退一步或换条路 🧱',
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
});

/** 对局状态。 */
export const STATUS = Object.freeze({
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
});

export const TOTAL_ANIMALS = 8;
export const TOTAL_GIFTS = 3;
