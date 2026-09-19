/**
 * client/net.js — WebSocket 局域网联机与本地单机引擎双模客户端。
 *
 * iPad 锁屏 / 切后台会杀掉 WebSocket，所以：
 *  - 令牌存在 localStorage，重连时先 resume，失败再 join；
 *  - 指数退避重连；页面重新可见时立刻重连。
 *  - 当无网络后端服务（如 GitHub Pages 访问、本地无 Node 服务或选择单机模式）时，
 *    自动切换为纯前端 LocalGameClient，支持单机双人合作与单人探索。
 *
 * Author: Claude Code (Claude Opus)
 */

import { C2S, S2C, ERROR_CODE } from '../core/protocol.js';
import { LocalGameClient } from './local-engine.js';

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
    this.localClient = null;
    this.isLocal = false;

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.wantConnection && !this.isLocal && this.status !== 'open') this.connect();
    });
    window.addEventListener('online', () => {
      if (this.wantConnection && !this.isLocal && this.status !== 'open') this.connect();
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

  /** 以指定意图开始游玩（支持网络或本地模式）。 */
  start(pref) {
    this.savePref(pref);
    this.wantConnection = true;

    // 如果明确指定本地单机，或者在静态 host / file 协议下，直接启动本地引擎
    const isStaticHost = location.hostname.endsWith('github.io') || location.protocol === 'file:';
    if (pref.local || pref.dual || isStaticHost) {
      this.startLocal(pref);
      return;
    }

    this.connect();
  }

  startLocal(pref) {
    this.isLocal = true;
    if (!this.localClient) {
      this.localClient = new LocalGameClient();
      this.localClient.addEventListener('status', (e) => this.emit('status', e.detail));
      this.localClient.addEventListener('welcome', (e) => this.emit('welcome', e.detail));
      this.localClient.addEventListener('state', (e) => this.emit('state', e.detail));
      this.localClient.addEventListener('rejected', (e) => this.emit('rejected', e.detail));
    }
    this.localClient.start(pref);
  }

  connect() {
    if (this.isLocal) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    clearTimeout(this.retryTimer);
    this.setStatus('connecting');

    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${scheme}://${location.host}/ws`);
    this.ws = ws;

    // 超时检测：如果 2.5 秒未连上，且是单人或单机请求，降级到本地引擎
    const connTimeout = setTimeout(() => {
      if (this.status !== 'open' && (this.pref.solo || this.pref.dual)) {
        console.warn('[NetClient] WebSocket 连接超时，自动降级为本地单机引擎！');
        if (this.ws) {
          try { this.ws.close(); } catch {}
          this.ws = null;
        }
        this.startLocal(this.pref);
      }
    }, 2500);

    ws.addEventListener('open', () => {
      clearTimeout(connTimeout);
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
      clearTimeout(connTimeout);
      this.setStatus('closed');
      if (this.wantConnection && !this.isLocal) this.scheduleRetry();
    });

    ws.addEventListener('error', () => {
      // 出现错误时，如果是首连失败且单人模式，降级到本地模式
      if (this.retry === 0 && (this.pref.solo || this.pref.dual)) {
        clearTimeout(connTimeout);
        console.warn('[NetClient] 网络连接失败，自动转为本地单机模式！');
        this.startLocal(this.pref);
      }
    });
  }

  scheduleRetry() {
    if (this.isLocal) return;
    this.retry += 1;
    if (this.retry > 3 && (this.pref.solo || this.pref.dual)) {
      console.warn('[NetClient] 重试多次未果，自动转为本地单机模式！');
      this.startLocal(this.pref);
      return;
    }
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
    if (this.isLocal && this.localClient) {
      return true;
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  // ———— 便捷动作 ————
  action(type, role = null, extra = {}) {
    if (this.isLocal && this.localClient) {
      return this.localClient.action(type, role, extra);
    }
    return this.send({ type: C2S.ACTION, action: { type, ...extra }, role });
  }

  ready(value = true, role = null) {
    if (this.isLocal && this.localClient) {
      return this.localClient.ready(value, role);
    }
    return this.send({ type: C2S.READY, ready: value, role });
  }

  readyAll() {
    if (this.isLocal && this.localClient) {
      return this.localClient.readyAll();
    }
    return this.send({ type: C2S.READY_ALL });
  }

  switchRole(role = null) {
    if (this.isLocal && this.localClient) {
      return this.localClient.switchRole(role);
    }
    return this.send({ type: C2S.SWITCH, role });
  }

  reset() {
    if (this.isLocal && this.localClient) {
      return this.localClient.reset();
    }
    return this.send({ type: C2S.RESET });
  }

  forgetSession() {
    this.token = null;
    localStorage.removeItem(TOKEN_KEY);
  }
}

export default NetClient;
