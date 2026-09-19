/**
 * server/index.js — 局域网 HTTP + WebSocket 服务（默认端口 8791）。
 *
 *  - 静态托管 client/ 与 core/（core 直接被浏览器 ESM 复用，前后端同一套规则）
 *  - /vendor/* 映射到本地 node_modules/three/build/，iPad 无需联外网即可加载 Three.js
 *  - /qr.svg 网页二维码；启动时在终端打印 ASCII 二维码
 *  - 严格挑选物理 Wi-Fi (en0) 地址，过滤 Tailscale / CGNAT
 *  - 会话令牌支持断线重连恢复
 *
 * Author: Claude Code (Claude Opus)
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';

import { GameRoom } from './room.js';
import { buildLanUrl, diagnoseInterfaces } from './net.js';
import { decode, encode, validateClientMessage, C2S, S2C, ERROR_CODE, DEFAULT_ROOM } from '../core/protocol.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const DEFAULT_PORT = 8791;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

/** 允许被静态托管的目录前缀 → 真实磁盘目录。 */
function staticRoots() {
  return [
    { prefix: '/core/', dir: path.join(PROJECT_ROOT, 'core') },
    { prefix: '/client/', dir: path.join(PROJECT_ROOT, 'client') },
    { prefix: '/vendor/', dir: path.join(PROJECT_ROOT, 'node_modules', 'three', 'build') },
    { prefix: '/', dir: path.join(PROJECT_ROOT, 'client') },
  ];
}

/** 把 URL 路径安全地解析为磁盘路径，杜绝 ../ 目录穿越。 */
export function resolveStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const clean = decoded === '/' ? '/index.html' : decoded;
  for (const { prefix, dir } of staticRoots()) {
    if (!clean.startsWith(prefix)) continue;
    const relative = clean.slice(prefix.length);
    const target = path.resolve(dir, relative);
    const rootWithSep = dir.endsWith(path.sep) ? dir : dir + path.sep;
    if (target !== dir && !target.startsWith(rootWithSep)) continue; // 目录穿越，拒绝
    if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  }
  return null;
}

function sendText(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

/**
 * 创建服务（可注入端口，测试里用 0 拿随机端口）。
 * @returns {{server, wss, room, port:()=>number, listen, close}}
 */
export function createServer(options = {}) {
  const room = new GameRoom({ id: options.room ?? DEFAULT_ROOM, seed: options.seed });
  const sockets = new Set();

  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = (req.url || '/').split('?')[0];

      if (urlPath === '/api/info') {
        const lan = buildLanUrl(addressPort(), options.interfaces);
        return sendText(res, 200, JSON.stringify({
          ok: true, port: addressPort(), url: lan.url, host: lan.host, iface: lan.iface,
          room: room.id, players: room.connectedRoles(),
        }), MIME['.json']);
      }

      if (urlPath === '/api/interfaces') {
        return sendText(res, 200, JSON.stringify(diagnoseInterfaces(options.interfaces)), MIME['.json']);
      }

      if (urlPath === '/qr.svg') {
        const lan = buildLanUrl(addressPort(), options.interfaces);
        const svg = await QRCode.toString(lan.url, { type: 'svg', margin: 1, width: 320 });
        res.writeHead(200, { 'Content-Type': MIME['.svg'], 'Cache-Control': 'no-store' });
        return res.end(svg);
      }

      if (urlPath === '/healthz') return sendText(res, 200, 'ok');

      const file = resolveStaticPath(urlPath);
      if (!file) return sendText(res, 404, '404 找不到这个页面');

      const ext = path.extname(file).toLowerCase();
      const body = await fsp.readFile(file);
      res.writeHead(200, {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      return res.end(body);
    } catch (err) {
      return sendText(res, 500, `500 服务端出错：${err.message}`);
    }
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  const addressPort = () => {
    const addr = server.address();
    return addr && typeof addr === 'object' ? addr.port : (options.port ?? DEFAULT_PORT);
  };

  const send = (ws, message) => {
    if (ws.readyState === ws.OPEN) ws.send(encode(message));
  };

  const broadcast = (message) => {
    for (const ws of sockets) send(ws, message);
  };

  wss.on('connection', (ws) => {
    sockets.add(ws);
    ws.isAlive = true;
    ws.session = null;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      const parsed = decode(raw);
      const check = validateClientMessage(parsed);
      if (!check.ok) {
        return send(ws, { type: S2C.ERROR, code: check.code, message: check.message });
      }
      const msg = check.message;

      // ping 不需要先加入房间，iPad 端用它探测连接是否还活着
      if (msg.type === C2S.PING) {
        return send(ws, { type: S2C.PONG, t: msg.t ?? null });
      }

      if (msg.type === C2S.JOIN) {
        if (ws.session) room.disconnect(ws.session.token);
        const result = room.join({ role: msg.role, solo: msg.solo, name: msg.name });
        if (!result.ok) return send(ws, { type: S2C.ERROR, code: result.code, message: result.message });
        ws.session = result.session;
        send(ws, room.welcomeMessage(result.session, false));
        return broadcast(room.peersMessage());
      }

      if (msg.type === C2S.RESUME) {
        const result = room.resume(msg.token);
        if (!result.ok) return send(ws, { type: S2C.ERROR, code: result.code, message: result.message });
        ws.session = result.session;
        send(ws, room.welcomeMessage(result.session, true));
        return broadcast(room.peersMessage());
      }

      if (!ws.session) {
        return send(ws, { type: S2C.ERROR, code: ERROR_CODE.NOT_JOINED, message: '请先加入房间' });
      }

      const { self, broadcast: out } = room.handle(ws.session, msg);
      for (const m of self) send(ws, m);
      for (const m of out) broadcast(m);
    });

    ws.on('close', () => {
      sockets.delete(ws);
      if (ws.session) {
        room.disconnect(ws.session.token);
        broadcast(room.peersMessage());
      }
    });

    ws.on('error', () => { /* iPad 熄屏时的异常断开，交给 close 处理 */ });
  });

  // 心跳：清理掉线但没有正常关闭的连接（iPad 锁屏很常见）
  const heartbeat = setInterval(() => {
    for (const ws of sockets) {
      if (ws.isAlive === false) { ws.terminate(); continue; }
      ws.isAlive = false;
      try { ws.ping(); } catch { /* ignore */ }
    }
  }, 15_000);
  heartbeat.unref?.();

  return {
    server,
    wss,
    room,
    port: addressPort,
    listen(port = options.port ?? DEFAULT_PORT, host = '0.0.0.0') {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => resolve(addressPort()));
      });
    },
    close() {
      clearInterval(heartbeat);
      for (const ws of sockets) { try { ws.terminate(); } catch { /* ignore */ } }
      sockets.clear();
      return new Promise((resolve) => {
        wss.close(() => server.close(() => resolve()));
      });
    },
  };
}

/** 启动器：监听端口 + 打印终端 ASCII 二维码。 */
export async function main() {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const app = createServer({ port });
  await app.listen(port);
  const lan = buildLanUrl(port);

  const qr = await QRCode.toString(lan.url, { type: 'terminal', small: true, errorCorrectionLevel: 'M' });
  const line = '─'.repeat(52);
  console.log(`\n┌${line}┐`);
  console.log('  🐻🐰 Naomi《小动物回家》双 iPad 局域网联机 3D 探索版');
  console.log('        Claude Code (Claude Opus) 对比版本');
  console.log(`└${line}┘`);
  console.log(qr);
  console.log(`  📶 局域网地址（物理 Wi-Fi ${lan.iface}）： ${lan.url}`);
  console.log(`  💻 本机地址：                      http://localhost:${port}/`);
  console.log(`  🧪 单人测试模式：                  ${lan.url}?solo=1`);
  console.log('');
  console.log('  用两台 iPad 的相机扫描上面的二维码，用 Safari 打开即可加入同一局。');
  if (!lan.lan) {
    console.log('  ⚠️  没有找到物理 Wi-Fi 地址，请确认 Mac 已连接 Wi-Fi（Tailscale 100.* 网段已被过滤）。');
    for (const row of diagnoseInterfaces()) console.log(`     - ${row.name.padEnd(10)} ${row.address.padEnd(16)} ${row.verdict}`);
  }
  console.log(`\n  按 Control + C 结束服务。\n`);

  const shutdown = async () => {
    console.log('\n  👋 服务已停止，小动物们先睡啦。');
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  return app;
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  main().catch((err) => {
    console.error('启动失败：', err);
    process.exit(1);
  });
}
