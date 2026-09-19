const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');
const QRCode = require('qrcode');
const CoopEngine = require('../core/coop-engine.js');

const PORT = parseInt(process.env.PORT || '8787', 10);
const HOST = '0.0.0.0';

// 局域网 IPv4 探测（严格排除 Tailscale / VPN / 虚拟网卡，只走真实物理局域网）
function getLanIps() {
  const ips = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    // 明确排除 Tailscale, utun, tun, tap, wg, awdl 等虚拟网络接口
    if (/^(utun|tun|tap|tailscale|wg|awdl|llw|bridge|vbox|docker)/i.test(name)) continue;
    for (const net of ifaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        // 明确排除 100.64.0.0/10 及 100.* Tailscale/CGNAT 网段
        if (net.address.startsWith('100.')) continue;
        ips.push({ name, address: net.address });
      }
    }
  }
  // 优先排在前面的物理 Wi-Fi 接口 (如 en0)
  ips.sort((a, b) => (a.name === 'en0' ? -1 : 1));
  return ips;
}

// 房间状态存储
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * 房间数据结构
 */
function createRoom(code, creatorRoleKey, creatorName) {
  const game = CoopEngine.createGame({
    bearName: creatorRoleKey === 'BEAR' ? creatorName : '小熊',
    bunnyName: creatorRoleKey === 'BUNNY' ? creatorName : 'Naomi',
  });

  const room = {
    code,
    game,
    createdAt: Date.now(),
    players: [
      {
        id: 0,
        roleKey: 'BEAR',
        name: creatorRoleKey === 'BEAR' ? creatorName || '小熊' : '小熊',
        token: null,
        ws: null,
        connected: false,
        processedRequests: new Map(), // requestId -> result
      },
      {
        id: 1,
        roleKey: 'BUNNY',
        name: creatorRoleKey === 'BUNNY' ? creatorName || 'Naomi' : 'Naomi',
        token: null,
        ws: null,
        connected: false,
        processedRequests: new Map(),
      },
    ],
  };

  rooms.set(code, room);
  return room;
}

function broadcastRoom(room, message, excludeWs = null) {
  const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
  room.players.forEach((p) => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN && p.ws !== excludeWs) {
      try {
        p.ws.send(msgStr);
      } catch (err) {
        console.error(`[WS broadcast error in room ${room.code}]:`, err);
      }
    }
  });
}

function getSanitizedRoomState(room) {
  const g = room.game;
  return {
    code: room.code,
    teamRound: g.teamRound,
    maxTeamRounds: g.cfg.MAX_TEAM_ROUNDS,
    thunderEvery: g.cfg.THUNDER_EVERY_TEAM_ROUNDS,
    energy: g.energy,
    shield: g.shield,
    status: g.status,
    home: g.home,
    maze: g.maze,
    pets: g.pets,
    gifts: g.gifts,
    terrain: g.terrain,
    log: g.log.slice(-20),
    version: g.version,
    players: room.players.map((rp) => {
      const gp = g.players[rp.id];
      return {
        id: rp.id,
        roleKey: rp.roleKey,
        name: rp.name,
        emoji: gp.emoji,
        x: gp.x,
        y: gp.y,
        heading: gp.heading,
        ap: gp.ap,
        moves: gp.moves,
        carry: gp.carry,
        carriedCount: g.pets.filter((p) => p.carriedBy === rp.id).length,
        ready: gp.ready,
        boosted: gp.boosted,
        supported: gp.supported,
        skipTurns: gp.skipTurns,
        resting: gp.resting,
        connected: rp.connected,
      };
    }),
  };
}

// MIME 映射
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
};

// 创建 HTTP 服务
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. 健康检查
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    let totalConn = 0;
    rooms.forEach((r) => r.players.forEach((p) => { if (p.connected) totalConn++; }));
    res.end(
      JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        rooms: rooms.size,
        connections: totalConn,
        lanIps: getLanIps(),
      })
    );
    return;
  }

  // 2. 房间列表 API
  if (pathname === '/api/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const roomList = Array.from(rooms.values()).map((r) => ({
      code: r.code,
      createdAt: r.createdAt,
      players: r.players.map((p) => ({
        id: p.id,
        roleKey: p.roleKey,
        name: p.name,
        connected: p.connected,
      })),
      status: r.game.status,
    }));
    res.end(JSON.stringify(roomList));
    return;
  }

  // 2.1 动态生成二维码 SVG 接口（iPad / 浏览器可直接当作图片展示）
  if (pathname === '/api/qrcode') {
    const text = parsedUrl.query.text || '';
    if (!text) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing text parameter');
      return;
    }
    QRCode.toString(text, { type: 'svg', margin: 1 }, (err, svg) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error generating QR code');
      } else {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' });
        res.end(svg);
      }
    });
    return;
  }

  // 3. 根路径或 /naomi-pet-rescue/ 重定向到 coop
  if (pathname === '/' || pathname === '/naomi-pet-rescue' || pathname === '/naomi-pet-rescue/') {
    res.writeHead(302, { Location: '/naomi-pet-rescue/coop/' });
    res.end();
    return;
  }

  // 4. 静态文件映射
  // /naomi-pet-rescue/coop/ -> coop/client/
  // /naomi-pet-rescue/coop/core/ -> coop/core/
  // /naomi-pet-rescue/assets/ -> ../assets/
  const coopPrefix = '/naomi-pet-rescue/coop';
  let filePath = null;

  if (pathname.startsWith(coopPrefix)) {
    let subPath = pathname.slice(coopPrefix.length);
    if (subPath === '' || subPath === '/') {
      subPath = '/index.html';
    }

    if (subPath.startsWith('/core/')) {
      filePath = path.join(__dirname, '..', 'core', subPath.slice(6));
    } else if (subPath.startsWith('/assets/')) {
      const localAsset = path.join(__dirname, '..', 'client', 'assets', subPath.slice(8));
      if (fs.existsSync(localAsset)) {
        filePath = localAsset;
      } else {
        filePath = path.join(__dirname, '..', '..', 'assets', subPath.slice(8));
      }
    } else {
      filePath = path.join(__dirname, '..', 'client', subPath);
    }
  } else if (pathname.startsWith('/naomi-pet-rescue/assets/')) {
    filePath = path.join(__dirname, '..', '..', 'assets', pathname.slice('/naomi-pet-rescue/assets/'.length));
  }

  if (filePath && fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
  res.end('404 Not Found - Naomi Pet Rescue Coop');
});

// 创建 WebSocket 服务
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  let currentRoom = null;
  let currentPlayerId = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleClientMessage(ws, msg);
    } catch (err) {
      console.error('[WS Parse Error]:', err);
      ws.send(JSON.stringify({ type: 'ERROR', error: '无效的 JSON 消息格式' }));
    }
  });

  function handleClientMessage(ws, msg) {
    switch (msg.type) {
      case 'PING': {
        ws.send(JSON.stringify({ type: 'PONG' }));
        break;
      }

      case 'CREATE_ROOM': {
        const creatorRoleKey = (msg.roleKey || 'BEAR').toUpperCase();
        const creatorName = (msg.playerName || '').trim() || (creatorRoleKey === 'BEAR' ? '小熊' : 'Naomi');
        const code = generateRoomCode();
        const room = createRoom(code, creatorRoleKey, creatorName);

        const playerId = creatorRoleKey === 'BEAR' ? 0 : 1;
        const token = generateToken();
        const player = room.players[playerId];
        player.token = token;
        player.ws = ws;
        player.connected = true;
        player.name = creatorName;
        room.game.players[playerId].name = creatorName;

        currentRoom = room;
        currentPlayerId = playerId;

        ws.send(
          JSON.stringify({
            type: 'ROOM_CREATED',
            roomCode: code,
            playerId,
            roleKey: creatorRoleKey,
            sessionToken: token,
            state: getSanitizedRoomState(room),
          })
        );
        break;
      }

      case 'JOIN_ROOM': {
        const code = (msg.roomCode || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', error: `房间号 ${code} 不存在` }));
          return;
        }

        // 1. 凭 sessionToken 重连恢复
        if (msg.sessionToken) {
          const matchingPlayer = room.players.find((p) => p.token === msg.sessionToken);
          if (matchingPlayer) {
            // 替换旧连接
            if (matchingPlayer.ws && matchingPlayer.ws !== ws && matchingPlayer.ws.readyState === WebSocket.OPEN) {
              try {
                matchingPlayer.ws.send(JSON.stringify({ type: 'KICKED', reason: '同一角色在其他窗口重新连入' }));
                matchingPlayer.ws.close();
              } catch {}
            }
            matchingPlayer.ws = ws;
            matchingPlayer.connected = true;
            currentRoom = room;
            currentPlayerId = matchingPlayer.id;

            // 规则第 7.5 节：重连后清除双方旧 ready，由双方重新确认，避免跳回合
            room.game.players[0].ready = false;
            room.game.players[1].ready = false;

            ws.send(
              JSON.stringify({
                type: 'ROOM_JOINED',
                roomCode: code,
                playerId: matchingPlayer.id,
                roleKey: matchingPlayer.roleKey,
                sessionToken: matchingPlayer.token,
                reconnected: true,
                state: getSanitizedRoomState(room),
              })
            );

            broadcastRoom(room, {
              type: 'PLAYER_RECONNECTED',
              playerId: matchingPlayer.id,
              state: getSanitizedRoomState(room),
            });
            return;
          }
        }

        // 2. 新玩家加入未满房间
        // 查找空位角色
        let chosenRoleKey = msg.roleKey ? msg.roleKey.toUpperCase() : null;
        let targetSlot = null;

        if (chosenRoleKey) {
          targetSlot = room.players.find((p) => p.roleKey === chosenRoleKey && !p.connected && !p.token);
        }
        if (!targetSlot) {
          targetSlot = room.players.find((p) => !p.connected && !p.token);
        }

        if (!targetSlot) {
          ws.send(JSON.stringify({ type: 'ERROR', error: '该房间两人已满或所选角色已被占用' }));
          return;
        }

        const token = generateToken();
        const joinerName = (msg.playerName || '').trim() || (targetSlot.roleKey === 'BEAR' ? '小熊' : 'Naomi');
        targetSlot.token = token;
        targetSlot.ws = ws;
        targetSlot.connected = true;
        targetSlot.name = joinerName;
        room.game.players[targetSlot.id].name = joinerName;

        currentRoom = room;
        currentPlayerId = targetSlot.id;

        ws.send(
          JSON.stringify({
            type: 'ROOM_JOINED',
            roomCode: code,
            playerId: targetSlot.id,
            roleKey: targetSlot.roleKey,
            sessionToken: token,
            reconnected: false,
            state: getSanitizedRoomState(room),
          })
        );

        broadcastRoom(room, {
          type: 'ROOM_STATE',
          event: `${targetSlot.name} 加入了房间！`,
          state: getSanitizedRoomState(room),
        });
        break;
      }

      case 'ACTION': {
        const { roomCode, sessionToken, requestId, roundId, action } = msg;
        const code = (roomCode || '').toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          ws.send(JSON.stringify({ type: 'ACTION_RESULT', requestId, success: false, error: '房间不存在' }));
          return;
        }

        const player = room.players.find((p) => p.token === sessionToken);
        if (!player) {
          ws.send(JSON.stringify({ type: 'ACTION_RESULT', requestId, success: false, error: '非法令牌或身份未授权' }));
          return;
        }

        // 掉线暂停检查：若另一名玩家掉线，暂停主动动作
        const mate = room.players[1 - player.id];
        if (!mate.connected && action !== 'READY' && action !== 'UNREADY') {
          ws.send(
            JSON.stringify({
              type: 'ACTION_RESULT',
              requestId,
              success: false,
              error: `队友 ${mate.name} 暂时离线，房间已暂停主动操作，等待重连中……`,
            })
          );
          return;
        }

        // 过期回合指令拒绝
        if (roundId != null && roundId !== room.game.teamRound) {
          ws.send(
            JSON.stringify({
              type: 'ACTION_RESULT',
              requestId,
              success: false,
              error: `指令回合已过期（当前第 ${room.game.teamRound} 回合，接收到第 ${roundId} 回合）`,
            })
          );
          return;
        }

        // requestId 幂等去重
        if (requestId && player.processedRequests.has(requestId)) {
          const cached = player.processedRequests.get(requestId);
          ws.send(JSON.stringify({ ...cached, replayed: true }));
          return;
        }

        // 执行权威规则
        const result = CoopEngine.applyAction(room.game, player.id, action);

        const responsePayload = {
          type: 'ACTION_RESULT',
          requestId,
          playerId: player.id,
          action,
          ...result,
          state: getSanitizedRoomState(room),
        };

        if (requestId) {
          player.processedRequests.set(requestId, responsePayload);
          // 保持最近 50 条去重缓存
          if (player.processedRequests.size > 50) {
            const firstKey = player.processedRequests.keys().next().value;
            player.processedRequests.delete(firstKey);
          }
        }

        // 回合结算事件全房间广播
        broadcastRoom(room, responsePayload);
        break;
      }

      default:
        ws.send(JSON.stringify({ type: 'ERROR', error: `未知消息类型：${msg.type}` }));
    }
  }

  ws.on('close', () => {
    if (currentRoom && currentPlayerId !== null) {
      const p = currentRoom.players[currentPlayerId];
      if (p && p.ws === ws) {
        p.connected = false;
        p.ws = null;
        console.log(`[WS Close]: 玩家 ${p.name} (id: ${currentPlayerId}) 离开了房间 ${currentRoom.code}`);

        // 广播掉线通知，客户端显示等待重连提示
        broadcastRoom(currentRoom, {
          type: 'PLAYER_DISCONNECTED',
          playerId: currentPlayerId,
          playerName: p.name,
          state: getSanitizedRoomState(currentRoom),
        });
      }
    }
  });
});

// 心跳探针：每 25 秒检测一次，避免幽灵连接
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);
if (heartbeatInterval.unref) heartbeatInterval.unref();

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// 导出与启动函数
function startServer(port = PORT, host = HOST) {
  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server Error]: 端口 ${port} 已被占用！`);
      }
      reject(err);
    });

    server.listen(port, host, () => {
      const realPort = server.address().port;
      const lanIps = getLanIps();
      const primaryLan = lanIps.length > 0 ? lanIps[0].address : 'localhost';
      const lanUrl = `http://${primaryLan}:${realPort}/naomi-pet-rescue/coop/`;

      console.log(`\n======================================================`);
      console.log(`🚀 Naomi《小动物回家》双 iPad 局域网联机服务已就绪！`);
      console.log(`🤖 架构与开发：Antigravity (Gemini 3.8 Flash)`);
      console.log(`------------------------------------------------------`);
      console.log(`👉 Mac 本机入口: http://localhost:${realPort}/naomi-pet-rescue/coop/`);
      console.log(`📱 iPad Safari 局域网直连入口 (物理 Wi-Fi, 不走 Tailscale):`);
      console.log(`   ${lanUrl}`);
      console.log(`🩺 健康检查接口: http://localhost:${realPort}/health`);
      console.log(`------------------------------------------------------`);
      console.log(`📷 iPad 拿起系统相机扫描下方二维码直接秒开连接：\n`);

      QRCode.toString(lanUrl, { type: 'terminal', small: true }, (err, qr) => {
        if (!err && qr) {
          console.log(qr);
        }
        console.log(`======================================================\n`);
        resolve({ server, port: realPort, lanIps });
      });
    });
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start LAN server:', err);
    process.exit(1);
  });
}

module.exports = {
  server,
  wss,
  rooms,
  startServer,
  getLanIps,
  createRoom,
  getSanitizedRoomState,
};
