/**
 * server/room.js — 房间 / 会话管理与协议处理（与 WebSocket 解耦，便于单元测试）。
 *
 * 会话令牌：join 时下发，客户端存 localStorage；掉线后用 resume 令牌
 * 找回原来的角色与全部对局状态（断线重连恢复）。
 *
 * Author: Claude Code (Claude Opus)
 */

import { randomBytes } from 'node:crypto';
import { GameEngine } from '../core/game.js';
import { ROLE_LIST, ROLES, STATUS } from '../core/constants.js';
import { C2S, S2C, ERROR_CODE, DEFAULT_ROOM, normalizeAction } from '../core/protocol.js';

/** 掉线会话被新玩家顶掉之前的保护期。 */
export const RECLAIM_GRACE_MS = 30_000;
/** 会话令牌有效期。 */
export const TOKEN_TTL_MS = 30 * 60_000;

/** 单人加入时优先拿到 Naomi 小兔。 */
const AUTO_ROLE_ORDER = [ROLES.BUNNY, ROLES.BEAR];

function newToken() {
  return randomBytes(12).toString('hex');
}

export class GameRoom {
  constructor(options = {}) {
    this.id = options.id ?? DEFAULT_ROOM;
    this.seed = options.seed;
    this.engine = new GameEngine({ seed: this.seed });
    this.sessions = new Map(); // token -> session
    this.slots = { [ROLES.BEAR]: null, [ROLES.BUNNY]: null }; // role -> token
    this.now = options.now ?? (() => Date.now());
  }

  // ———————————————————— 会话 ————————————————————

  sessionOf(token) {
    return this.sessions.get(token) ?? null;
  }

  freeRoles() {
    return ROLE_LIST.filter((role) => this.slots[role] === null);
  }

  /** 找出一个可被顶替的掉线角色（保护期已过，掉线最久的优先）。 */
  reclaimableRole(role = null) {
    const roles = role ? [role] : ROLE_LIST;
    const now = this.now();
    let best = null;
    for (const r of roles) {
      const token = this.slots[r];
      if (!token) continue;
      const session = this.sessions.get(token);
      if (!session || session.connected) continue;
      if (now - session.disconnectedAt < RECLAIM_GRACE_MS) continue;
      if (!best || session.disconnectedAt < best.disconnectedAt) best = { role: r, disconnectedAt: session.disconnectedAt, token };
    }
    return best;
  }

  releaseRoles(token) {
    for (const role of ROLE_LIST) {
      if (this.slots[role] === token) this.slots[role] = null;
    }
  }

  /**
   * 加入房间。
   * @param {{role?:string, solo?:boolean, name?:string}} req
   */
  join(req = {}) {
    const wantSolo = Boolean(req.solo);
    const wantRole = req.role && req.role !== 'auto' ? req.role : null;

    if (wantSolo) {
      // 单人测试模式：一人分饰两角，要求两个位置都可用
      for (const role of ROLE_LIST) {
        if (this.slots[role] !== null) {
          const reclaim = this.reclaimableRole(role);
          if (!reclaim) {
            return { ok: false, code: ERROR_CODE.ROOM_FULL, message: '已经有玩家在房间里，无法进入单人测试模式' };
          }
          this.evict(reclaim.token);
        }
      }
      return { ok: true, session: this.createSession([...ROLE_LIST], true, req.name ?? '单人测试') };
    }

    let role = wantRole;
    if (role) {
      if (this.slots[role] !== null) {
        const reclaim = this.reclaimableRole(role);
        if (!reclaim) return { ok: false, code: ERROR_CODE.ROLE_TAKEN, message: `${role} 已经有人在玩啦` };
        this.evict(reclaim.token);
      }
    } else {
      role = AUTO_ROLE_ORDER.find((r) => this.slots[r] === null) ?? null;
      if (!role) {
        const reclaim = this.reclaimableRole();
        if (!reclaim) return { ok: false, code: ERROR_CODE.ROOM_FULL, message: '房间已满（最多 2 位小伙伴）' };
        this.evict(reclaim.token);
        role = reclaim.role;
      }
    }

    // 若房间里原本是一个单人测试会话，它占着两个位置，需要让出另一个角色
    const soloToken = ROLE_LIST.map((r) => this.slots[r]).find((t) => t && this.sessions.get(t)?.solo);
    if (soloToken) {
      const soloSession = this.sessions.get(soloToken);
      if (!soloSession.connected) this.evict(soloToken);
      else {
        soloSession.roles = soloSession.roles.filter((r) => r !== role);
        soloSession.solo = soloSession.roles.length > 1;
        soloSession.activeRole = soloSession.roles[0];
        this.slots[role] = null;
      }
    }

    return { ok: true, session: this.createSession([role], false, req.name ?? null) };
  }

  createSession(roles, solo, name) {
    const token = newToken();
    const session = {
      token,
      roles,
      solo,
      activeRole: roles[0],
      name,
      connected: true,
      createdAt: this.now(),
      lastSeen: this.now(),
      disconnectedAt: 0,
    };
    this.sessions.set(token, session);
    for (const role of roles) this.slots[role] = token;
    return session;
  }

  evict(token) {
    this.releaseRoles(token);
    this.sessions.delete(token);
  }

  /** 断线重连：凭令牌恢复原角色与完整对局状态。 */
  resume(token) {
    const session = this.sessions.get(token);
    if (!session) return { ok: false, code: ERROR_CODE.BAD_TOKEN, message: '会话已过期，请重新加入' };
    if (this.now() - session.lastSeen > TOKEN_TTL_MS) {
      this.evict(token);
      return { ok: false, code: ERROR_CODE.BAD_TOKEN, message: '会话已过期，请重新加入' };
    }
    // 位置可能在保护期后被别人顶掉了
    const stillOwned = session.roles.filter((role) => this.slots[role] === token);
    if (stillOwned.length === 0) {
      this.evict(token);
      return { ok: false, code: ERROR_CODE.BAD_TOKEN, message: '你的角色已经被新的小伙伴接手啦' };
    }
    session.roles = stillOwned;
    session.solo = stillOwned.length > 1;
    if (!stillOwned.includes(session.activeRole)) session.activeRole = stillOwned[0];
    session.connected = true;
    session.lastSeen = this.now();
    session.disconnectedAt = 0;
    return { ok: true, session, resumed: true };
  }

  /** 连接断开：保留位置等待重连。 */
  disconnect(token) {
    const session = this.sessions.get(token);
    if (!session) return;
    session.connected = false;
    session.disconnectedAt = this.now();
  }

  connectedRoles() {
    const map = {};
    for (const role of ROLE_LIST) {
      const token = this.slots[role];
      const session = token ? this.sessions.get(token) : null;
      map[role] = Boolean(session && session.connected);
    }
    return map;
  }

  peersMessage() {
    return { type: S2C.PEERS, roles: this.connectedRoles(), solo: [...this.sessions.values()].some((s) => s.solo && s.connected) };
  }

  // ———————————————————— 协议处理 ————————————————————

  resolveRole(session, requested) {
    if (!requested || requested === 'auto') return session.activeRole ?? session.roles[0];
    if (!session.roles.includes(requested)) return null;
    return requested;
  }

  stateMessage(events = []) {
    return { type: S2C.STATE, snapshot: this.engine.snapshot(), events };
  }

  welcomeMessage(session, resumed = false) {
    return {
      type: S2C.WELCOME,
      token: session.token,
      role: session.activeRole,
      roles: session.roles,
      solo: session.solo,
      room: this.id,
      resumed,
      snapshot: this.engine.snapshot(),
    };
  }

  /**
   * 处理一条已经通过 validateClientMessage 的客户端消息。
   * @returns {{self:object[], broadcast:object[]}}
   */
  handle(session, msg) {
    const self = [];
    const broadcast = [];
    session.lastSeen = this.now();

    switch (msg.type) {
      case C2S.PING:
        self.push({ type: S2C.PONG, t: msg.t ?? null });
        break;

      case C2S.SWITCH: {
        if (!session.solo) {
          self.push({ type: S2C.ERROR, code: ERROR_CODE.NOT_SOLO, message: '只有单人测试模式才能切换角色' });
          break;
        }
        const next = msg.role && session.roles.includes(msg.role)
          ? msg.role
          : session.roles[(session.roles.indexOf(session.activeRole) + 1) % session.roles.length];
        session.activeRole = next;
        self.push({ type: S2C.WELCOME, token: session.token, role: next, roles: session.roles, solo: true, room: this.id, resumed: true, snapshot: this.engine.snapshot() });
        break;
      }

      case C2S.ACTION: {
        const role = this.resolveRole(session, msg.role);
        if (!role) {
          self.push({ type: S2C.ERROR, code: ERROR_CODE.FORBIDDEN_ROLE, message: '你不能操控这个角色' });
          break;
        }
        const result = this.engine.act(role, normalizeAction(msg.action));
        if (!result.ok) {
          self.push({ type: S2C.REJECTED, reason: result.reason, message: result.message, hint: result.hint ?? null, role });
        }
        // 撞墙也要广播：3D 场景里双方都能看到退路箭头动画
        broadcast.push(this.stateMessage(result.events));
        break;
      }

      case C2S.READY: {
        const role = this.resolveRole(session, msg.role);
        if (!role) {
          self.push({ type: S2C.ERROR, code: ERROR_CODE.FORBIDDEN_ROLE, message: '你不能操控这个角色' });
          break;
        }
        const result = this.engine.setReady(role, msg.ready !== false);
        if (!result.ok) self.push({ type: S2C.REJECTED, reason: result.reason, message: '这一局已经结束啦', role });
        broadcast.push(this.stateMessage(result.events));
        break;
      }

      case C2S.READY_ALL: {
        if (!session.solo) {
          self.push({ type: S2C.ERROR, code: ERROR_CODE.NOT_SOLO, message: '只有单人测试模式才能一键双方就绪' });
          break;
        }
        const events = [];
        for (const role of ROLE_LIST) {
          const result = this.engine.setReady(role, true);
          events.push(...result.events);
        }
        broadcast.push(this.stateMessage(events));
        break;
      }

      case C2S.RESET: {
        this.engine.reset({ seed: this.seed });
        broadcast.push(this.stateMessage([{ type: 'reset', message: '🌱 新的一局开始啦！' }]));
        break;
      }

      default:
        self.push({ type: S2C.ERROR, code: ERROR_CODE.BAD_MESSAGE, message: `服务端不处理该消息：${msg.type}` });
    }

    return { self, broadcast };
  }

  /** 房间是否已经打完（供 UI 展示）。 */
  isOver() {
    return this.engine.status !== STATUS.PLAYING;
  }
}

export default GameRoom;
