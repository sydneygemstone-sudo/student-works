/**
 * client/net.js — WebSocket 连接、会话令牌持久化与自动重连。
 *
 * iPad 锁屏 / 切后台会杀掉 WebSocket，所以：
 *  - 令牌存在 localStorage，重连时先 resume，失败再 join；
 *  - 指数退避重连；页面重新可见时立刻重连。
 *
 * Author: Claude Code (Claude Opus)
 */

import { C2S, S2C, ERROR_CODE } from '/core/protocol.js';

const TOKEN_KEY = `naomi-coop-token@${location.host}`;
const PREF_KEY = `naomi-coop-pref@${location.host}`;

export class NetClient extends EventTarget {
  constructor() {
    super();
    this.ws = null;
    this.token = localStorage.getItem(TOKEN_KEY) || null;
    this.pref = this.readPref();
    this.retry = 0;
    this.retryTimer = null;
    this.wantConnection = false;
    this.status = 'idle';

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.wantConnection && this.status !== 'open') this.connect();
    });
    window.addEventListener('online', () => {
      if (this.wantConnection && this.status !== 'open') this.connect();
    });
  }

  readPref() {
    try {
      return JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    } catch {
      return {};
    }
  }

  savePref(pref) {
    this.pref = { ...this.pref, ...pref };
    localStorage.setItem(PREF_KEY, JSON.stringify(this.pref));
  }

  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  setStatus(status, extra = {}) {
    this.status = status;
    this.emit('status', { status, ...extra });
  }

  /** 以指定意图开始联机（会一直保持重连）。 */
  start(pref) {
    this.savePref(pref);
    this.wantConnection = true;
    this.connect();
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    clearTimeout(this.retryTimer);
    this.setStatus('connecting');

    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${scheme}://${location.host}/ws`);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.retry = 0;
      this.setStatus('open');
      if (this.token) this.send({ type: C2S.RESUME, token: this.token });
      else this.sendJoin();
    });

    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      this.route(msg);
    });

    ws.addEventListener('close', () => {
      this.setStatus('closed');
      if (this.wantConnection) this.scheduleRetry();
    });

    ws.addEventListener('error', () => { /* close 会紧随其后 */ });
  }

  scheduleRetry() {
    this.retry += 1;
    const delay = Math.min(8000, 500 * 2 ** (this.retry - 1));
    this.setStatus('retrying', { delay, attempt: this.retry });
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  sendJoin() {
    this.send({
      type: C2S.JOIN,
      role: this.pref.role ?? 'auto',
      solo: Boolean(this.pref.solo),
      name: this.pref.name ?? null,
    });
  }

  route(msg) {
    switch (msg.type) {
      case S2C.WELCOME:
        this.token = msg.token;
        localStorage.setItem(TOKEN_KEY, msg.token);
        this.emit('welcome', msg);
        break;
      case S2C.STATE:
        this.emit('state', msg);
        break;
      case S2C.REJECTED:
        this.emit('rejected', msg);
        break;
      case S2C.PEERS:
        this.emit('peers', msg);
        break;
      case S2C.PONG:
        this.emit('pong', msg);
        break;
      case S2C.ERROR:
        if (msg.code === ERROR_CODE.BAD_TOKEN) {
          // 令牌失效（会话过期或被顶掉）→ 清掉重新加入
          this.token = null;
          localStorage.removeItem(TOKEN_KEY);
          this.sendJoin();
          return;
        }
        this.emit('error-message', msg);
        break;
      default:
        break;
    }
  }

  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  // ———— 便捷动作 ————
  action(type, role = null, extra = {}) {
    return this.send({ type: C2S.ACTION, action: { type, ...extra }, role });
  }

  ready(value = true, role = null) {
    return this.send({ type: C2S.READY, ready: value, role });
  }

  readyAll() {
    return this.send({ type: C2S.READY_ALL });
  }

  switchRole(role = null) {
    return this.send({ type: C2S.SWITCH, role });
  }

  reset() {
    return this.send({ type: C2S.RESET });
  }

  forgetSession() {
    this.token = null;
    localStorage.removeItem(TOKEN_KEY);
  }
}

export default NetClient;
