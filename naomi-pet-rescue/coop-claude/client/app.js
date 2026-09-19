/**
 * client/app.js — 客户端主逻辑与 UI 交互绑定。
 *
 * Author: Claude Code (Claude Opus)
 */

import { NetClient } from './net.js';
import { GardenRenderer } from './render3d.js';
import { Minimap } from './minimap.js';
import { GardenAudio } from './audio.js';
import { ACTION, ROLES, STATUS, BLOCKER_BANNER } from '../core/constants.js';

const canvas = document.getElementById('view3d');
const renderer = new GardenRenderer(canvas);
const minimap = new Minimap(document.getElementById('minimap'));
const audio = new GardenAudio();
renderer.start();
minimap.resize();

window.addEventListener('resize', () => {
  renderer.resize();
  minimap.resize();
  minimap.draw();
});
window.addEventListener('orientationchange', () => {
  setTimeout(() => { renderer.resize(); minimap.resize(); minimap.draw(); }, 250);
});

const net = new NetClient();
let myRole = ROLES.BUNNY;
let isSolo = false;
let isDual = false;
let currentSnapshot = null;
let activeControlRole = ROLES.BUNNY;
let lastSeenSeq = 0;

// UI 元素
const netBadge = document.getElementById('net-badge');
const roundInd = document.getElementById('round-indicator');
const weatherBadge = document.getElementById('weather-badge');
const shelterVal = document.getElementById('shelter-val');
const courageVal = document.getElementById('courage-val');
const rescuedVal = document.getElementById('rescued-val');
const blockedBanner = document.getElementById('blocked-banner');
const blockedText = document.getElementById('blocked-text');
const btnReady = document.getElementById('btn-ready');
const btnPickup = document.getElementById('btn-pickup');
const btnScare = document.getElementById('btn-scare');
const soloBar = document.getElementById('solo-bar');
const joinModal = document.getElementById('join-modal');
const qrModal = document.getElementById('qr-modal');
const gameoverModal = document.getElementById('gameover-modal');
const toastBox = document.getElementById('toast');
const lightning = document.getElementById('lightning');

// ⚡ 渲染器闪电时，HUD 也闪一下
renderer.onFlash = () => {
  lightning.classList.add('flash');
  setTimeout(() => lightning.classList.remove('flash'), 150);
};

// ———————————————————— 播报 ————————————————————

function toast(message, tone = '') {
  const line = document.createElement('div');
  line.className = `toast-line ${tone}`;
  line.textContent = message;
  toastBox.appendChild(line);
  setTimeout(() => line.remove(), 4200);
  while (toastBox.children.length > 3) toastBox.firstChild.remove();
}

let bannerTimer = null;
function showBlockedHint(hint) {
  if (!hint) return;
  renderer.spawnRetreatArrow(hint);
  audio.blocked();
  blockedText.textContent = BLOCKER_BANNER[hint.blocker] || '前方挡路！可以后退一步或换条路 🌿';
  blockedBanner.style.display = 'flex';
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { blockedBanner.style.display = 'none'; }, 3200);
}

/** 把服务端事件翻译成声音 + 播报。只播本回合新发生的。 */
function handleEvents(events) {
  for (const ev of events ?? []) {
    if (ev.seq && ev.seq <= lastSeenSeq) continue;
    if (ev.seq) lastSeenSeq = Math.max(lastSeenSeq, ev.seq);

    switch (ev.type) {
      case 'blocked': showBlockedHint(ev.hint); break;
      case 'move': audio.step(); break;
      case 'pickup': audio.pickup(); break;
      case 'rescue': audio.rescue(); toast(ev.message, 'good'); break;
      case 'energy': audio.energy(); toast(ev.message, 'good'); break;
      case 'gift': (ev.kind === 'prank' ? audio.oops() : audio.gift()); toast(ev.message, ev.kind === 'prank' ? 'bad' : 'good'); break;
      case 'decoy': audio.oops(); toast(ev.message, 'bad'); break;
      case 'drop': toast(ev.message); break;
      case 'storm': audio.thunder(); renderer.strikeLightning(); toast(ev.message, ev.sheltered ? '' : 'bad'); break;
      case 'scare': audio.bearRoar(); toast(ev.message, 'good'); break;
      case 'wolf_bite': audio.wolfHowl(); toast(ev.message, 'bad'); break;
      case 'lion_snatch': audio.lionRoar(); toast(ev.message, 'bad'); break;
      case 'beast_wake': (ev.kind === 'wolf' ? audio.wolfHowl() : audio.lionRoar()); toast(ev.message, 'bad'); break;
      case 'beast_distracted': toast(ev.message, 'good'); break;
      case 'support': toast(ev.message, 'good'); break;
      case 'boost': toast(ev.message, 'good'); break;
      case 'round': audio.roundStart(); break;
      case 'win': audio.victory(); break;
      case 'lose': audio.timeUp(); break;
      case 'carry_full': toast(ev.message); break;
      default: break;
    }
  }
}

// ———————————————————— 入场 ————————————————————

const urlParams = new URLSearchParams(window.location.search);
const dualParam = urlParams.get('dual') || urlParams.get('mode') === 'dual';
const soloParam = urlParams.get('solo') || urlParams.get('mode') === 'solo';
const localParam = urlParams.get('local') || urlParams.get('mode') === 'local';
const roleParam = urlParams.get('role');

function enter(pref) {
  joinModal.style.display = 'none';
  audio.unlock(); // 必须在用户手势里，iOS Safari 才肯出声
  net.start(pref);
}

if (dualParam === '1' || dualParam === true || dualParam === 'true') {
  isDual = true;
  isSolo = true;
  enter({ dual: true, local: true, role: ROLES.BUNNY });
} else if (soloParam === '1' || soloParam === 'true') {
  isSolo = true;
  enter({ solo: true, local: Boolean(localParam), role: 'auto' });
} else if (roleParam) {
  net.start({ solo: false, role: roleParam });
} else {
  joinModal.style.display = 'flex';
}

document.getElementById('choose-dual')?.addEventListener('click', () => {
  isDual = true;
  isSolo = true;
  enter({ dual: true, local: true, role: ROLES.BUNNY });
});

document.getElementById('choose-solo')?.addEventListener('click', () => {
  isSolo = true;
  isDual = false;
  enter({ solo: true, local: true, role: 'auto' });
});

document.getElementById('choose-bunny')?.addEventListener('click', () => enter({ solo: false, role: ROLES.BUNNY }));
document.getElementById('choose-bear')?.addEventListener('click', () => enter({ solo: false, role: ROLES.BEAR }));

// 二维码弹窗
document.getElementById('qr-btn').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/info');
    const info = await res.json();
    document.getElementById('qr-url-text').textContent = info.url || window.location.href;
  } catch { /* 离线也无所谓，二维码图本身是服务端画的 */ }
  qrModal.style.display = 'flex';
});
document.getElementById('close-qr-btn').addEventListener('click', () => { qrModal.style.display = 'none'; });

// 声音开关
const soundBtn = document.getElementById('sound-btn');
soundBtn.addEventListener('click', () => {
  if (!audio.ready) {
    audio.unlock();
    soundBtn.textContent = '🔊';
    return;
  }
  soundBtn.textContent = audio.toggleMusic() ? '🔊' : '🔇';
});

// 小地图收起 / 展开
const minimapWrap = document.getElementById('minimap-wrap');
document.getElementById('minimap-toggle').addEventListener('click', () => {
  const collapsed = minimapWrap.classList.toggle('collapsed');
  document.getElementById('minimap-toggle').textContent = collapsed ? '▸' : '▾';
  if (!collapsed) { minimap.resize(); minimap.draw(); }
});

// 重开对局
document.getElementById('btn-restart').addEventListener('click', () => {
  gameoverModal.style.display = 'none';
  lastSeenSeq = 0;
  net.reset();
});

// ———————————————————— 网络事件 ————————————————————

net.addEventListener('status', (e) => {
  const { status, isLocal, mode } = e.detail;
  if (status === 'open') {
    if (isLocal) {
      netBadge.textContent = (mode === 'dual' || isDual) ? '● 单机双人合作' : '● 单机单人模式';
    } else {
      netBadge.textContent = '● 已联机';
    }
    netBadge.className = 'status-badge live';
  } else if (status === 'connecting') {
    netBadge.textContent = '连接中...';
    netBadge.className = 'status-badge';
  } else if (status === 'retrying') {
    netBadge.textContent = `重连中(${e.detail.attempt})...`;
    netBadge.className = 'status-badge storm';
  } else {
    netBadge.textContent = '离线';
    netBadge.className = 'status-badge storm';
  }
});

net.addEventListener('welcome', (e) => {
  const msg = e.detail;
  myRole = msg.role || ROLES.BUNNY;
  isSolo = Boolean(msg.solo);
  if (msg.dual) isDual = true;
  activeControlRole = myRole;
  if (isSolo) soloBar.style.display = 'flex';
  if (isDual) {
    const swBtn = document.getElementById('btn-solo-switch');
    if (swBtn) swBtn.textContent = '🔄 换人行动 (小兔 / 小熊)';
  }
  if (msg.snapshot) {
    lastSeenSeq = Math.max(...(msg.snapshot.log ?? []).map((l) => l.seq ?? 0), 0);
    applySnapshot(msg.snapshot);
  }
});

net.addEventListener('state', (e) => {
  const { snapshot, events } = e.detail;
  applySnapshot(snapshot);
  handleEvents(events);
});

net.addEventListener('rejected', (e) => {
  const { hint, message } = e.detail;
  if (hint) showBlockedHint(hint);
  else if (message) toast(message);
});

net.addEventListener('peers', (e) => {
  const { roles } = e.detail;
  const partner = activeControlRole === ROLES.BEAR ? ROLES.BUNNY : ROLES.BEAR;
  if (!isSolo && roles && !roles[partner]) toast('等队友连上来…', '');
});

// ———————————————————— 渲染快照 ————————————————————

function applySnapshot(snapshot) {
  currentSnapshot = snapshot;
  renderer.setViewRole(activeControlRole);
  renderer.update(snapshot);
  minimap.update(snapshot, activeControlRole);

  const roleTitle = activeControlRole === ROLES.BUNNY ? '🐰 Naomi 小兔' : '🐻 小熊';
  if (isDual) {
    roundInd.textContent = `第 ${snapshot.round}/${snapshot.maxRounds} 回合 · 轮到 ${roleTitle}`;
  } else {
    roundInd.textContent = `回合 ${snapshot.round}/${snapshot.maxRounds}`;
  }

  if (snapshot.weather === 'storm') {
    weatherBadge.textContent = '⛈️ 雷雨';
    weatherBadge.className = 'status-badge storm';
  } else {
    weatherBadge.textContent = '☀️ 晴朗';
    weatherBadge.className = 'status-badge live';
  }

  shelterVal.textContent = snapshot.team.shelter;
  courageVal.textContent = snapshot.team.courage;
  rescuedVal.textContent = snapshot.team.rescuedCount ?? snapshot.team.rescued.length;

  const me = snapshot.players[activeControlRole];
  if (me) {
    // 🫳 只在脚下真有东西可捡、而且抱得下的时候才亮
    btnPickup.hidden = !(me.animalsHere?.length > 0 && me.carrying.length < me.carryLimit);
    // 🐻💢 只有小熊、而且旁边真有狼的时候才亮
    btnScare.hidden = !(me.canScareWolf && me.wolfAdjacent);

    if (me.ready) {
      btnReady.textContent = isDual ? `⏳ ${roleTitle} 已就绪 (等待对方)` : '⏳ 已就绪 · 点一下继续行动';
      btnReady.className = 'btn-act ready is-ready';
    } else {
      btnReady.textContent = isDual ? `🏁 ${roleTitle} 结束回合（还剩 ${me.ap} 步）` : `🏁 结束本回合（还有 ${me.ap} 步）`;
      btnReady.className = 'btn-act ready';
    }
  }

  if (snapshot.status === STATUS.WON) {
    document.getElementById('gameover-title').textContent = '🎉 胜利！小动物们全部回家啦！';
    document.getElementById('gameover-desc').textContent = `全队在第 ${snapshot.round} 回合成功营救了所有小动物！太棒了！`;
    gameoverModal.style.display = 'flex';
  } else if (snapshot.status === STATUS.LOST) {
    const saved = snapshot.team.rescuedCount ?? snapshot.team.rescued.length;
    document.getElementById('gameover-title').textContent = '🌙 天黑啦，今天就到这儿';
    document.getElementById('gameover-desc').textContent = `你们一共救回了 ${saved} 只小动物！剩下的明天再来接它们回家吧。`;
    gameoverModal.style.display = 'flex';
  } else {
    gameoverModal.style.display = 'none';
  }
}

// ———————————————————— 控制 ————————————————————

function triggerAction(actionType, extra = {}) {
  audio.unlock();
  const role = isSolo ? activeControlRole : null;
  net.action(actionType, role, extra);
}

const bind = (id, action) => document.getElementById(id).addEventListener('click', () => triggerAction(action));
bind('btn-forward', ACTION.FORWARD);
bind('btn-backward', ACTION.BACKWARD);
bind('btn-turn-left', ACTION.TURN_LEFT);
bind('btn-turn-right', ACTION.TURN_RIGHT);
bind('btn-give', ACTION.GIVE);
bind('btn-support', ACTION.SUPPORT);
bind('btn-boost', ACTION.BOOST);
bind('btn-pickup', ACTION.PICKUP);
bind('btn-scare', ACTION.SCARE);

btnReady.addEventListener('click', () => {
  if (!currentSnapshot) return;
  audio.unlock();
  const pl = currentSnapshot.players[activeControlRole];
  const role = isSolo ? activeControlRole : null;
  const nextReady = !pl.ready;
  net.ready(nextReady, role);

  if (isDual && nextReady) {
    const otherRole = activeControlRole === ROLES.BUNNY ? ROLES.BEAR : ROLES.BUNNY;
    const otherPl = currentSnapshot.players[otherRole];
    if (otherPl && !otherPl.ready) {
      setTimeout(() => {
        doSwitchRole();
        toast(activeControlRole === ROLES.BUNNY ? '🐰 轮到 Naomi 小兔行动啦！' : '🐻 轮到 小熊行动啦！', 'good');
      }, 350);
    }
  }
});

// 单人模式专属
function doSwitchRole() {
  activeControlRole = activeControlRole === ROLES.BUNNY ? ROLES.BEAR : ROLES.BUNNY;
  renderer.setViewRole(activeControlRole);
  if (currentSnapshot) applySnapshot(currentSnapshot);
  net.switchRole(activeControlRole);
}
document.getElementById('btn-solo-switch').addEventListener('click', doSwitchRole);
document.getElementById('btn-solo-readyall').addEventListener('click', () => net.readyAll());

// 键盘（仅作开发辅助，iPad 上用不到）
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key) {
    case 'w': case 'W': case 'ArrowUp': e.preventDefault(); triggerAction(ACTION.FORWARD); break;
    case 's': case 'S': case 'ArrowDown': e.preventDefault(); triggerAction(ACTION.BACKWARD); break;
    case 'a': case 'A': case 'ArrowLeft': e.preventDefault(); triggerAction(ACTION.TURN_LEFT); break;
    case 'd': case 'D': case 'ArrowRight': e.preventDefault(); triggerAction(ACTION.TURN_RIGHT); break;
    case 'e': case 'E': e.preventDefault(); triggerAction(ACTION.PICKUP); break;
    case 'q': case 'Q': e.preventDefault(); triggerAction(ACTION.SCARE); break;
    case 'g': case 'G': e.preventDefault(); triggerAction(ACTION.GIVE); break;
    case 'Tab': if (isSolo) { e.preventDefault(); doSwitchRole(); } break;
    case ' ': e.preventDefault(); btnReady.click(); break;
    default: break;
  }
});
