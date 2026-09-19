// HTTP + WebSocket 联机服务 — 作者: Codex (GLM 5.3 Max)
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const game = require('../core/game');

const PORT = Number(process.env.PORT || 8789);
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// ---------- 物理局域网 IP 探测（排除 Tailscale/CGNAT/虚拟网卡） ----------
function detectLanIPs() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (/^(utun|tun|tailscale|tap|bridge|veth|awdl|llw|anpi|lo)/i.test(name)) continue;
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (/^100\.(64|6[5-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(a.address)) continue;
      out.push({ name, address: a.address });
    }
  }
  // 优先物理 Wi-Fi（en0）
  out.sort((a, b) => (a.name === 'en0' ? -1 : 0) - (b.name === 'en0' ? -1 : 0));
  return out;
}

async function qrTerminal(url) {
  return QRCode.toString(url, { type: 'terminal', small: true, margin: 1 });
}
async function qrSVG(url) {
  return QRCode.toString(url, { type: 'svg', margin: 1 });
}

// ---------- 房间 ----------
function createRoom(id) {
  const g = game.createGame(false);
  return {
    id,
    game: g,
    clients: new Map(), // token -> {ws, role, name}
    roleTaken: { bear: false, bunny: false },
  };
}

const rooms = new Map();

function newToken() { return crypto.randomBytes(16).toString('hex'); }

function send(ws, type, payload = {}) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type, ...payload }));
}

function broadcast(room, type, payload) {
  const state = game.publicState(room.game);
  for (const c of room.clients.values()) {
    send(c.ws, type, { state, ...(payload || {}), you: c.role });
  }
}

function applyAction(room, action, role) {
  const g = room.game;
  switch (action.type) {
    case 'turn': return game.turn(g, role, action.side);
    case 'move': return game.move(g, role, action.forward !== false);
    case 'give': return game.give(g, role, role === 'bear' ? 'bunny' : 'bear', action.animalId);
    case 'support': return game.support(g, role);
    case 'boost': return game.boost(g);
    case 'ready': return game.setReady(g, role, action.value !== false);
    default: return { ok: false, message: '未知指令' };
  }
}

function setupWS(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    let room = null, token = url.searchParams.get('token');
    const solo = url.searchParams.get('solo') === '1';
    let role = url.searchParams.get('role');

    if (solo) {
      room = createRoom('solo-' + newToken().slice(0, 8));
      room.game.solo = true;
      room.roleTaken = { bear: true, bunny: true };
      role = role || 'bear';
      rooms.set(room.id, room);
    } else {
      const roomId = url.searchParams.get('roomId');
      room = (token && [...rooms.values()].find((r) => r.clients.has(token))) || null;
      if (!room && roomId) room = rooms.get(roomId) || null;
      if (!room) {
        // 加入第一个未满员的公共房间；否则新建
        room = [...rooms.values()].find((r) => !r.game.solo && !(r.roleTaken.bear && r.roleTaken.bunny)) || null;
      }
      if (!room) {
        room = createRoom('room-' + newToken().slice(0, 8));
        rooms.set(room.id, room);
      }
    }

    if (!solo) {
      if (!role || (role !== 'bear' && role !== 'bunny')) role = !room.roleTaken.bear ? 'bear' : 'bunny';
      if (room.roleTaken[role]) {
        const free = !room.roleTaken.bear ? 'bear' : 'bunny';
        if (!free || (room.roleTaken.bear && room.roleTaken.bunny)) {
          send(ws, 'error', { message: '该房间已满' });
          ws.close();
          return;
        }
        role = free;
      }
      room.roleTaken[role] = true;
    }

    if (token && room.clients.has(token)) {
      // 重连恢复
      const c = room.clients.get(token);
      c.ws = ws; c.role = role;
    } else {
      token = newToken();
      room.clients.set(token, { ws, role });
    }

    send(ws, 'welcome', {
      token, role, roomId: room.id, solo,
      state: game.publicState(room.game),
      roles: game.ROLES,
    });
    broadcast(room, 'state');

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return send(ws, 'error', { message: '无效 JSON' }); }
      const c = room.clients.get(token);
      const actingRole = room.game.solo ? (msg.role || c.role) : c.role;
      if (msg.type === 'action') {
        const result = applyAction(room, msg.action, actingRole);
        send(ws, 'result', { result, action: msg.action });
        broadcast(room, 'state');
        if (room.game.phase !== 'playing') {
          broadcast(room, 'gameover', { phase: room.game.phase });
        }
      } else if (msg.type === 'ping') {
        send(ws, 'pong', { t: msg.t });
      }
    });

    ws.on('close', () => {
      const c = room.clients.get(token);
      if (c && c.ws === ws) {
        c.ws = null; // 保留会话，令牌可重连
        if (!room.game.solo) room.roleTaken[c.role] = false;
      }
    });
  });
}

function start(options = {}) {
  const port = options.port || PORT;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/info') {
      const ips = detectLanIPs();
      const primary = ips[0]?.address || '127.0.0.1';
      const urlStr = `http://${primary}:${port}`;
      try {
        const qr = await qrSVG(urlStr);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ port, ips, primary, url: urlStr, qr }));
      } catch (e) {
        res.writeHead(500); res.end(String(e));
      }
      return;
    }
    let p = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = path.normalize(path.join(CLIENT_DIR, p));
    if (!file.startsWith(CLIENT_DIR)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not Found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });

  setupWS(server);

  return new Promise((resolve) => {
    server.listen(port, () => {
      const ips = detectLanIPs();
      const primary = ips[0]?.address || '127.0.0.1';
      const urlStr = `http://${primary}:${port}`;
      resolve({ server, port, ips, url: urlStr });
    });
  });
}

if (require.main === module) {
  start().then(async ({ server, url: u, ips }) => {
    console.log('🐾 Naomi《小动物回家》联机服务已启动 — Codex (GLM 5.3 Max)');
    console.log(`   本机:  http://localhost:${server.address().port}`);
    console.log(`   局域网: ${u}  (${ips.map(i => i.name).join(', ') || '未检测到物理网卡'})`);
    console.log('   iPad Safari 扫描下方二维码加入（同一 Wi-Fi，不走 Tailscale）：\n');
    console.log(await qrTerminal(u));
    console.log(`   单人测试模式: ${u}?solo=1 （按 Tab 切换角色）`);
  });
}

module.exports = { start, detectLanIPs, qrSVG, qrTerminal, rooms, createRoom };
