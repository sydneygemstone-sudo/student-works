/**
 * client/app.js — 客户端主逻辑与 UI 交互绑定。
 *
 * Author: Claude Code (Claude Opus)
 */

import { NetClient } from './net.js';
import { GardenRenderer } from './render3d.js';
import { ACTION, ROLES, ROLE_CONFIG, STATUS, BLOCKER_BANNER } from '/core/constants.js';

const canvas = document.getElementById('view3d');
const renderer = new GardenRenderer(canvas);
renderer.start();

window.addEventListener('resize', () => renderer.resize());

const net = new NetClient();
let myRole = ROLES.BUNNY;
let isSolo = false;
let currentSnapshot = null;
let activeControlRole = ROLES.BUNNY;

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
const soloBar = document.getElementById('solo-bar');
const joinModal = document.getElementById('join-modal');
const qrModal = document.getElementById('qr-modal');
const gameoverModal = document.getElementById('gameover-modal');

let bannerTimer = null;
function showBlockedHint(hint) {
  if (!hint) return;
  renderer.spawnRetreatArrow(hint);
  const msg = BLOCKER_BANNER[hint.blocker] || '前方挡路！可以后退一步或换条路 🌿';
  blockedText.textContent = msg;
  blockedBanner.style.display = 'flex';
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    blockedBanner.style.display = 'none';
  }, 3200);
}

// 检查 URL 参数
const urlParams = new URLSearchParams(window.location.search);
const soloParam = urlParams.get('solo');
const roleParam = urlParams.get('role');

if (soloParam === '1' || soloParam === 'true') {
  isSolo = true;
  net.start({ solo: true, role: 'auto' });
} else if (roleParam) {
  net.start({ solo: false, role: roleParam });
} else {
  // 弹出选择角色模态窗
  joinModal.style.display = 'flex';
}

document.getElementById('choose-bunny').addEventListener('click', () => {
  joinModal.style.display = 'none';
  net.start({ solo: false, role: ROLES.BUNNY });
});

document.getElementById('choose-bear').addEventListener('click', () => {
  joinModal.style.display = 'none';
  net.start({ solo: false, role: ROLES.BEAR });
});

document.getElementById('choose-solo').addEventListener('click', () => {
  joinModal.style.display = 'none';
  isSolo = true;
  net.start({ solo: true, role: 'auto' });
});

// 二维码弹窗
document.getElementById('qr-btn').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/info');
    const info = await res.json();
    document.getElementById('qr-url-text').textContent = info.url || window.location.href;
  } catch {}
  qrModal.style.display = 'flex';
});

document.getElementById('close-qr-btn').addEventListener('click', () => {
  qrModal.style.display = 'none';
});

// 重开对局
document.getElementById('btn-restart').addEventListener('click', () => {
  gameoverModal.style.display = 'none';
  net.reset();
});

// 网络事件处理
net.addEventListener('status', (e) => {
  const { status } = e.detail;
  if (status === 'open') {
    netBadge.textContent = '● 已联机';
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
  activeControlRole = myRole;

  if (isSolo) {
    soloBar.style.display = 'flex';
  }

  if (msg.snapshot) {
    applySnapshot(msg.snapshot);
  }
});

net.addEventListener('state', (e) => {
  const { snapshot, events } = e.detail;
  applySnapshot(snapshot);

  if (events) {
    for (const ev of events) {
      if (ev.type === 'blocked' && ev.hint) {
        showBlockedHint(ev.hint);
      }
    }
  }
});

net.addEventListener('rejected', (e) => {
  const { hint, message } = e.detail;
  if (hint) {
    showBlockedHint(hint);
  }
});

function applySnapshot(snapshot) {
  currentSnapshot = snapshot;
  renderer.buildStatic(snapshot);
  renderer.setViewRole(activeControlRole);
  renderer.update(snapshot, activeControlRole);

  // 更新 HUD
  roundInd.textContent = `回合: ${snapshot.round}/${snapshot.maxRounds}`;
  if (snapshot.weather === 'storm') {
    weatherBadge.textContent = '⛈️ 雷雨风暴';
    weatherBadge.className = 'status-badge storm';
  } else {
    weatherBadge.textContent = '☀️ 晴朗';
    weatherBadge.className = 'status-badge live';
  }

  shelterVal.textContent = snapshot.team.shelter;
  courageVal.textContent = snapshot.team.courage;
  rescuedVal.textContent = snapshot.team.rescued.length;

  const currentPl = snapshot.players[activeControlRole];
  if (currentPl) {
    if (currentPl.ready) {
      btnReady.textContent = '⏳ 已就绪 (等待推进)';
      btnReady.className = 'btn-act ready is-ready';
    } else {
      btnReady.textContent = `🏁 结束本回合 (${currentPl.ap} 步可用)`;
      btnReady.className = 'btn-act ready';
    }
  }

  if (snapshot.status === STATUS.WON) {
    document.getElementById('gameover-title').textContent = '🎉 胜利！小动物们全部回家啦！';
    document.getElementById('gameover-desc').textContent = `全队在第 ${snapshot.round} 回合成功营救了所有小动物！太棒了！`;
    gameoverModal.style.display = 'flex';
  } else if (snapshot.status === STATUS.LOST) {
    document.getElementById('gameover-title').textContent = '😢 回合用尽，天黑啦...';
    document.getElementById('gameover-desc').textContent = `本局共营救了 ${snapshot.team.rescued.length} 只小动物，点击重新开始再试一次！`;
    gameoverModal.style.display = 'flex';
  }
}

// 控制操作
function triggerAction(actionType, extra = {}) {
  const role = isSolo ? activeControlRole : null;
  net.action(actionType, role, extra);
}

document.getElementById('btn-forward').addEventListener('click', () => triggerAction(ACTION.FORWARD));
document.getElementById('btn-backward').addEventListener('click', () => triggerAction(ACTION.BACKWARD));
document.getElementById('btn-turn-left').addEventListener('click', () => triggerAction(ACTION.TURN_LEFT));
document.getElementById('btn-turn-right').addEventListener('click', () => triggerAction(ACTION.TURN_RIGHT));
document.getElementById('btn-give').addEventListener('click', () => triggerAction(ACTION.GIVE));
document.getElementById('btn-support').addEventListener('click', () => triggerAction(ACTION.SUPPORT));
document.getElementById('btn-boost').addEventListener('click', () => triggerAction(ACTION.BOOST));

btnReady.addEventListener('click', () => {
  if (!currentSnapshot) return;
  const pl = currentSnapshot.players[activeControlRole];
  const role = isSolo ? activeControlRole : null;
  net.ready(!pl.ready, role);
});

// 单人模式专属操作
function doSwitchRole() {
  activeControlRole = activeControlRole === ROLES.BUNNY ? ROLES.BEAR : ROLES.BUNNY;
  renderer.setViewRole(activeControlRole);
  if (currentSnapshot) {
    applySnapshot(currentSnapshot);
  }
  net.switchRole(activeControlRole);
}

document.getElementById('btn-solo-switch').addEventListener('click', doSwitchRole);
document.getElementById('btn-solo-readyall').addEventListener('click', () => {
  net.readyAll();
});

// 键盘控制映射
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      e.preventDefault();
      triggerAction(ACTION.FORWARD);
      break;
    case 's':
    case 'S':
    case 'ArrowDown':
      e.preventDefault();
      triggerAction(ACTION.BACKWARD);
      break;
    case 'a':
    case 'A':
    case 'ArrowLeft':
      e.preventDefault();
      triggerAction(ACTION.TURN_LEFT);
      break;
    case 'd':
    case 'D':
    case 'ArrowRight':
      e.preventDefault();
      triggerAction(ACTION.TURN_RIGHT);
      break;
    case 'Tab':
      if (isSolo) {
        e.preventDefault();
        doSwitchRole();
      }
      break;
    case ' ':
      e.preventDefault();
      btnReady.click();
      break;
  }
});
