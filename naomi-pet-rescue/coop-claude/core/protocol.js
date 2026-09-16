/**
 * core/protocol.js — 客户端 / 服务端共用的 WebSocket 协议定义与校验。
 * Author: Claude Code (Claude Opus)
 */

import { ACTION, ROLE_LIST } from './constants.js';

export const PROTOCOL_VERSION = 1;
export const DEFAULT_ROOM = 'garden';

/** 客户端 → 服务端 */
export const C2S = Object.freeze({
  JOIN: 'join', // { role?: 'bear'|'bunny'|'auto', solo?: boolean, name?, room? }
  RESUME: 'resume', // { token }
  ACTION: 'action', // { action: {type, ...}, role? (solo 模式指定角色) }
  READY: 'ready', // { ready: boolean, role? }
  READY_ALL: 'readyAll', // solo 模式：一键双方就绪
  SWITCH: 'switch', // solo 模式：切换当前操控角色 { role }
  RESET: 'reset', // 重开一局
  PING: 'ping',
});

/** 服务端 → 客户端 */
export const S2C = Object.freeze({
  WELCOME: 'welcome', // { token, role, solo, roles, snapshot, room }
  STATE: 'state', // { snapshot, events }
  REJECTED: 'rejected', // { reason, message, hint? }
  PEERS: 'peers', // { bear: bool, bunny: bool, solo: bool }
  ERROR: 'error', // { code, message }
  PONG: 'pong',
});

export const ERROR_CODE = Object.freeze({
  BAD_MESSAGE: 'bad_message',
  ROOM_FULL: 'room_full',
  ROLE_TAKEN: 'role_taken',
  NOT_JOINED: 'not_joined',
  BAD_TOKEN: 'bad_token',
  NOT_SOLO: 'not_solo',
  FORBIDDEN_ROLE: 'forbidden_role',
});

const ACTION_TYPES = new Set(Object.values(ACTION));
const CLIENT_TYPES = new Set(Object.values(C2S));

export function encode(message) {
  return JSON.stringify(message);
}

export function decode(raw) {
  try {
    const parsed = JSON.parse(typeof raw === 'string' ? raw : String(raw));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 校验一条客户端消息。
 * @returns {{ok:true, message:object}|{ok:false, code:string, message:string}}
 */
export function validateClientMessage(msg) {
  if (!msg || typeof msg !== 'object') {
    return { ok: false, code: ERROR_CODE.BAD_MESSAGE, message: '消息必须是 JSON 对象' };
  }
  if (!CLIENT_TYPES.has(msg.type)) {
    return { ok: false, code: ERROR_CODE.BAD_MESSAGE, message: `未知消息类型：${msg.type}` };
  }
  if (msg.role !== undefined && msg.role !== null && msg.role !== 'auto' && !ROLE_LIST.includes(msg.role)) {
    return { ok: false, code: ERROR_CODE.BAD_MESSAGE, message: `未知角色：${msg.role}` };
  }
  if (msg.type === C2S.ACTION) {
    const type = typeof msg.action === 'string' ? msg.action : msg.action?.type;
    if (!ACTION_TYPES.has(type)) {
      return { ok: false, code: ERROR_CODE.BAD_MESSAGE, message: `未知动作：${type}` };
    }
  }
  if (msg.type === C2S.RESUME && typeof msg.token !== 'string') {
    return { ok: false, code: ERROR_CODE.BAD_TOKEN, message: '缺少会话令牌' };
  }
  return { ok: true, message: msg };
}

/** 归一化动作对象。 */
export function normalizeAction(action) {
  return typeof action === 'string' ? { type: action } : { ...action };
}
