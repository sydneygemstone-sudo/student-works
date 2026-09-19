/**
 * client/local-engine.js — 本地单机双人/单人离线引擎客户端。
 *
 * 当未开启后台 Node.js 服务（例如直接在 GitHub Pages 上访问，或单台 iPad 离线游玩时），
 * 直接在浏览器内运行权威 GameEngine，完全无需 WebSocket 网络连接。
 * 支持单机器双人轮流回合制游玩与单人分饰两角探索。
 */

import { GameEngine } from '../core/game.js';
import { ROLES, ROLE_CONFIG, STATUS } from '../core/constants.js';

export class LocalGameClient extends EventTarget {
  constructor() {
    super();
    this.engine = new GameEngine();
    this.isLocal = true;
    this.activeRole = ROLES.BUNNY;
    this.isDual = false;
    this.isSolo = false;
    this.status = 'open';
  }

  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  setStatus(status, extra = {}) {
    this.status = status;
    this.emit('status', { status, isLocal: true, ...extra });
  }

  start(pref = {}) {
    this.pref = pref;
    this.isDual = Boolean(pref.dual);
    this.isSolo = Boolean(pref.solo) || this.isDual;
    this.activeRole = pref.role === ROLES.BEAR ? ROLES.BEAR : ROLES.BUNNY;

    this.setStatus('open', { mode: this.isDual ? 'dual' : 'solo' });

    // 触发入场 welcome 与 initial state 事件
    this.emit('welcome', {
      role: this.activeRole,
      solo: this.isSolo,
      dual: this.isDual,
      isLocal: true,
      snapshot: this.engine.snapshot(),
    });
    this.emit('state', {
      snapshot: this.engine.snapshot(),
      events: [],
    });
  }

  action(type, role = null, extra = {}) {
    const actRole = role || this.activeRole;
    const res = this.engine.act(actRole, { type, ...extra });
    if (!res.ok) {
      this.emit('rejected', { reason: res.reason, message: res.message, hint: res.hint });
    }
    this.emit('state', {
      snapshot: this.engine.snapshot(),
      events: res.events || [],
      hint: res.hint,
    });
    return res.ok;
  }

  ready(value = true, role = null) {
    const actRole = role || this.activeRole;
    const res = this.engine.setReady(actRole, value);

    // 在单机双人模式下，如果当前角色就绪了且另一方尚未就绪，自动平滑切给另一位角色
    if (this.isDual && value) {
      const snap = this.engine.snapshot();
      const otherRole = actRole === ROLES.BUNNY ? ROLES.BEAR : ROLES.BUNNY;
      if (!snap.players[otherRole].ready && snap.status === STATUS.PLAYING) {
        this.activeRole = otherRole;
      }
    }

    this.emit('state', {
      snapshot: this.engine.snapshot(),
      events: res.events || [],
    });
    return res.ok;
  }

  readyAll() {
    this.engine.setReady(ROLES.BUNNY, true);
    const res = this.engine.setReady(ROLES.BEAR, true);
    this.emit('state', {
      snapshot: this.engine.snapshot(),
      events: res.events || [],
    });
  }

  switchRole(role = null) {
    if (role) {
      this.activeRole = role;
    } else {
      this.activeRole = this.activeRole === ROLES.BUNNY ? ROLES.BEAR : ROLES.BUNNY;
    }
    this.emit('state', {
      snapshot: this.engine.snapshot(),
      events: [],
    });
    return this.activeRole;
  }

  reset() {
    this.engine.reset();
    this.emit('state', {
      snapshot: this.engine.snapshot(),
      events: [{ type: 'reset', message: '新的一局开始啦！' }],
    });
  }

  forgetSession() {}
}

export default LocalGameClient;
