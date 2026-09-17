import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, stat, realpath } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';
import { createGame, step, handleAction, snapshot, setInput, teacherControl, submitIdea } from './simulation.mjs';

const DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const equalToken = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function getLanAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, address: net.address });
      }
    }
  }
  return addresses;
}

export function createServer({ port = Number(process.env.PORT || 18888), host = process.env.HOST || '0.0.0.0', graceMs = 15000, teacherCodes = { CORAL: process.env.TEACHER_CODE } } = {}) {
  const rooms = new Map();
  const send = (ws, data) => { if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 1024 * 1024) ws.send(JSON.stringify(data)); };
  const fail = (ws, message) => send(ws, { type: 'error', message });
  function state(room) { return { type: 'state', state: snapshot(room.game) }; }
  function broadcast(room) { const data = state(room); for (const slot of Object.values(room.slots)) if (slot?.ws) send(slot.ws, data); }
  function disconnect(ws) {
    const { room, role } = ws.session || {};
    if (!room || room.slots[role]?.ws !== ws) return;
    room.slots[role].ws = null; room.slots[role].expires = Date.now() + graceMs;
    room.game.players[role].online = false; setInput(room.game, role, { x: 0, z: 0 });
    room.lastActive = Date.now(); broadcast(room);
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache');
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const rawPath = req.url.split('?')[0];
    if (rawPath === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, instance: 'coral-crew', port: server.address()?.port ?? port, rooms: rooms.size })); return;
    }
    if (rawPath === '/api/lan') {
      const currentPort = server.address()?.port ?? port;
      const lanList = getLanAddresses();
      const primaryLan = lanList.find(a => a.address.startsWith('192.168.') || a.address.startsWith('10.')) || lanList[0] || { address: '127.0.0.1' };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        lanIp: primaryLan.address,
        port: currentPort,
        lanUrl: `http://${primaryLan.address}:${currentPort}`,
        allIps: lanList.map(l => l.address),
        rooms: Array.from(rooms.keys())
      }));
      return;
    }
    if (rawPath === '/api/qr') {
      const currentPort = server.address()?.port ?? port;
      const lanList = getLanAddresses();
      const primaryLan = lanList.find(a => a.address.startsWith('192.168.') || a.address.startsWith('10.')) || lanList[0] || { address: '127.0.0.1' };
      const targetUrl = `http://${primaryLan.address}:${currentPort}/`;
      try {
        const svg = await QRCode.toString(targetUrl, { type: 'svg', margin: 1, width: 260 });
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        res.end(svg);
      } catch (err) {
        res.writeHead(500); res.end('Error generating QR code');
      }
      return;
    }
    try {
      const pathname = decodeURIComponent(rawPath);
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(p => p === '..')) { res.writeHead(403); res.end('Forbidden'); return; }
      const vendor = pathname.startsWith('/vendor/');
      const base = path.join(DIRECTORY, vendor ? 'node_modules/three/build' : 'public');
      const name = vendor ? pathname.slice('/vendor/'.length) : pathname === '/' ? 'index.html' : pathname.slice(1);
      const resolved = path.resolve(base, name), baseReal = await realpath(base);
      if (!resolved.startsWith(path.resolve(base) + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
      const targetReal = await realpath(resolved);
      if (!targetReal.startsWith(baseReal + path.sep) || !(await stat(targetReal)).isFile()) { res.writeHead(403); res.end('Forbidden'); return; }
      const body = await readFile(targetReal);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(targetReal)] || 'application/octet-stream', 'Content-Length': body.length });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) { res.writeHead(error instanceof URIError ? 400 : 404); res.end('Not found'); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048, perMessageDeflate: false });
  server.on('upgrade', (req, socket, head) => {
    if (req.url?.split('?')[0] !== '/ws' || wss.clients.size >= 64) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  wss.on('connection', ws => {
    ws.alive = true; ws.rate = { at: Date.now(), count: 0 }; ws.lastInput = 0; ws.inputRate = { at: Date.now(), count: 0 };
    ws.on('pong', () => { ws.alive = true; });
    ws.on('error', () => {});
    ws.on('close', () => disconnect(ws));
    ws.on('message', (buffer, binary) => {
      if (binary) { fail(ws, '只支持游戏消息'); return; }
      const now = Date.now();
      if (now - ws.rate.at >= 1000) ws.rate = { at: now, count: 0 };
      if (++ws.rate.count > 45) { ws.close(1008, 'Message rate exceeded'); return; }
      let data; try { data = JSON.parse(buffer.toString()); } catch { fail(ws, '消息格式不正确'); return; }
      if (!data || typeof data !== 'object' || Array.isArray(data)) { fail(ws, '消息格式不正确'); return; }
      if (data.type === 'teacher') {
        const room = rooms.get(data.room);
        const expected = teacherCodes[data.room] ?? (teacherCodes.CORAL || process.env.TEACHER_CODE || 'CORAL');
        if (!room || !expected || typeof data.code !== 'string' || !equalToken(expected, data.code)) { fail(ws, '房间或教师口令不正确'); return; }
        if (teacherControl(room.game, data.action, data.payload)) { broadcast(room); send(ws,{type:'teacher',paused:room.game.teacherPaused,state:snapshot(room.game)}); }
        return;
      }
      if (data.type === 'join') {
        if (ws.session) { fail(ws, '已加入，请先断开再换角色'); return; }
        const roomName = typeof data.room === 'string' ? data.room.toUpperCase() : 'CORAL';
        if (!/^[A-Z0-9-]{1,16}$/.test(roomName) || !['pirate', 'diver'].includes(data.role)) { fail(ws, '请选择有效房间和角色'); return; }
        if (data.token !== undefined && (typeof data.token !== 'string' || !/^[a-f0-9]{48}$/.test(data.token))) { fail(ws, '重连凭证无效，请重新加入'); return; }
        let room = rooms.get(roomName);
        if (!room) {
          if (rooms.size >= 32) { fail(ws, '房间已满，请稍后再试'); return; }
          room = { name: roomName, game: createGame(), slots: { pirate: null, diver: null }, lastActive: now }; rooms.set(roomName, room);
        }
        const role = data.role;
        for (const r of ['pirate', 'diver']) if (room.slots[r] && !room.slots[r].ws && room.slots[r].expires <= now) room.slots[r] = null;
        const previous = room.slots[role];
        if (previous && !equalToken(previous.token, data.token)) { fail(ws, '这个角色已有伙伴，暂时离线会保留 15 秒'); return; }
        if (data.token && Object.entries(room.slots).some(([r, slot]) => r !== role && slot && equalToken(slot.token, data.token))) { fail(ws, '凭证不属于这个角色'); return; }
        const token = previous?.token || randomBytes(24).toString('hex');
        if (previous?.ws) { const old = previous.ws; previous.ws = null; old.close(4001, 'Reconnected on another device'); }
        room.slots[role] = { token, ws, expires: 0 }; ws.session = { room, role };
        room.game.players[role].online = true; setInput(room.game, role, { x: 0, z: 0 }); room.lastActive = now;
        step(room.game, 0.001);
        send(ws, { type: 'welcome', role, room: roomName, token }); broadcast(room);
        console.log(JSON.stringify({ event: 'join', room: roomName, role, online: Object.keys(room.slots).filter(r => room.slots[r]?.ws), at: new Date().toISOString() }));
      } else if (ws.session) {
        const { room, role } = ws.session;
        if (room.slots[role]?.ws !== ws) return;
        if (data.type === 'input') {
          if (now - ws.inputRate.at >= 1000) ws.inputRate = { at: now, count: 0 };
          if (now - ws.lastInput < 40 || ws.inputRate.count >= 20) return;
          ws.inputRate.count++; ws.lastInput = now; setInput(room.game, role, data);
        } else if (data.type === 'action' && typeof data.action === 'string') {
          if (handleAction(room.game, role, data.action, data.payload)) broadcast(room);
        } else if (data.type === 'idea' && typeof data.text === 'string') {
          if (submitIdea(room.game, role, data.text, data.student)) broadcast(room);
        }
      } else { fail(ws, '请先选择角色加入'); }
    });
  });
  let last = performance.now(), ticks = 0;
  const ticker = setInterval(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    for (const [name, room] of rooms) {
      for (const role of ['pirate', 'diver']) if (room.slots[role] && !room.slots[role].ws && room.slots[role].expires <= Date.now()) room.slots[role] = null;
      if (!Object.values(room.slots).some(Boolean) && Date.now() - room.lastActive > 30 * 60 * 1000) { rooms.delete(name); continue; }
      step(room.game, dt); if (ticks % 2 === 0) broadcast(room);
    }
    ticks++;
  }, 50);
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) { if (!ws.alive) { disconnect(ws); ws.terminate(); } else { ws.alive = false; ws.ping(); } }
  }, 5000);
  const listen = () => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => { server.removeListener('error', reject); resolve(server.address()); }); });
  const close = async () => {
    clearInterval(ticker); clearInterval(heartbeat);
    for (const ws of wss.clients) ws.terminate();
    await new Promise(resolve => wss.close(resolve));
    await new Promise(resolve => server.close(resolve));
  };
  return { server, wss, rooms, listen, close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const service = createServer();
  service.listen().then(address => {
    const port = address.port;
    const lanList = getLanAddresses();
    const primaryLan = lanList.find(a => a.address.startsWith('192.168.') || a.address.startsWith('10.')) || lanList[0] || { address: '127.0.0.1' };
    console.log(`\n======================================================`);
    console.log(`⛵ 珊瑚船员 Coral Crew · 局域网3D多人合作游戏已启动！`);
    console.log(`💻 本地访问:    http://localhost:${port}/`);
    console.log(`📱 局域网/iPad:  http://${primaryLan.address}:${port}/`);
    console.log(`🎓 教师主控控制台: http://${primaryLan.address}:${port}/teacher.html`);
    console.log(`======================================================\n`);
  }).catch(error => { console.error(error); process.exit(1); });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => service.close().then(() => process.exit(0)));
}

