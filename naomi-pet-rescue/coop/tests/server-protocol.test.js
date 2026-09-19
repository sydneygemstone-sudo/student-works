const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { WebSocket } = require('ws');
const http = require('http');
const { server, wss, rooms } = require('../server/index.js');

let testPort = 0;
let wsBaseUrl = '';
let httpBaseUrl = '';

function connectWs() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsBaseUrl}/ws`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function sendAndAwait(ws, sendMsg, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error(`Timeout waiting for message matching predicate: ${JSON.stringify(sendMsg)}`));
    }, 4000);

    function onMessage(data) {
      try {
        const parsed = JSON.parse(data.toString());
        if (predicate(parsed)) {
          clearTimeout(timer);
          ws.off('message', onMessage);
          resolve(parsed);
        }
      } catch (e) {
        // ignore
      }
    }

    ws.on('message', onMessage);
    ws.send(JSON.stringify(sendMsg));
  });
}

describe('Naomi 联机合作版 —— 双端 WebSocket 网络协议集成测试', () => {
  before(async () => {
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        testPort = server.address().port;
        wsBaseUrl = `ws://127.0.0.1:${testPort}`;
        httpBaseUrl = `http://127.0.0.1:${testPort}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      wss.close(() => {
        server.close(resolve);
      });
    });
  });

  test('1. HTTP 健康检查 /health 正常返回', async () => {
    const res = await fetch(`${httpBaseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(Array.isArray(body.lanIps));
  });

  test('2. 创房与加入：小熊创房，小兔加入，满员拒绝第三人', async () => {
    const ws1 = await connectWs();
    const ws2 = await connectWs();
    const ws3 = await connectWs();

    // 1. 小熊创房
    const createdMsg = await sendAndAwait(
      ws1,
      { type: 'CREATE_ROOM', roleKey: 'BEAR', playerName: '大熊哥' },
      (m) => m.type === 'ROOM_CREATED'
    );
    assert.ok(createdMsg.roomCode);
    assert.equal(createdMsg.playerId, 0);
    assert.equal(createdMsg.roleKey, 'BEAR');
    assert.ok(createdMsg.sessionToken);

    const roomCode = createdMsg.roomCode;

    // 2. 小兔加入
    const joinedMsg = await sendAndAwait(
      ws2,
      { type: 'JOIN_ROOM', roomCode, roleKey: 'BUNNY', playerName: 'Naomi' },
      (m) => m.type === 'ROOM_JOINED'
    );
    assert.equal(joinedMsg.roomCode, roomCode);
    assert.equal(joinedMsg.playerId, 1);
    assert.equal(joinedMsg.roleKey, 'BUNNY');
    assert.ok(joinedMsg.sessionToken);

    // 3. 第三人尝试加入满员房间
    const rejectMsg = await sendAndAwait(
      ws3,
      { type: 'JOIN_ROOM', roomCode, roleKey: 'BEAR' },
      (m) => m.type === 'ERROR'
    );
    assert.match(rejectMsg.error, /两人已满|已被占用/);

    ws1.close();
    ws2.close();
    ws3.close();
  });

  test('3. 动作同步、去重、过期回合拒绝与双方确认推进', async () => {
    const ws1 = await connectWs();
    const ws2 = await connectWs();

    // 创房
    const rCreate = await sendAndAwait(
      ws1,
      { type: 'CREATE_ROOM', roleKey: 'BEAR', playerName: '测试熊' },
      (m) => m.type === 'ROOM_CREATED'
    );
    const roomCode = rCreate.roomCode;
    const token1 = rCreate.sessionToken;

    // 加入
    const rJoin = await sendAndAwait(
      ws2,
      { type: 'JOIN_ROOM', roomCode, roleKey: 'BUNNY', playerName: '测试兔' },
      (m) => m.type === 'ROOM_JOINED'
    );
    const token2 = rJoin.sessionToken;

    // 监听 ws2 收到的动作广播
    let ws2ReceivedBroadcast = null;
    ws2.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === 'ACTION_RESULT' && parsed.action === 'TURN_LEFT') {
        ws2ReceivedBroadcast = parsed;
      }
    });

    // ws1 执行转向
    const actionRes = await sendAndAwait(
      ws1,
      {
        type: 'ACTION',
        roomCode,
        sessionToken: token1,
        requestId: 'req-001',
        roundId: 1,
        action: 'TURN_LEFT',
      },
      (m) => m.type === 'ACTION_RESULT' && m.requestId === 'req-001'
    );
    assert.ok(actionRes.success);
    assert.equal(actionRes.action, 'TURN_LEFT');

    // 验证 ws2 确实收到了广播
    await new Promise((r) => setTimeout(r, 100));
    assert.ok(ws2ReceivedBroadcast, '队友客户端必须收到动作广播');

    // 验证 requestId 重复幂等
    const dupRes = await sendAndAwait(
      ws1,
      {
        type: 'ACTION',
        roomCode,
        sessionToken: token1,
        requestId: 'req-001',
        roundId: 1,
        action: 'TURN_LEFT',
      },
      (m) => m.type === 'ACTION_RESULT' && m.requestId === 'req-001'
    );
    assert.equal(dupRes.replayed, true, '重发请求必须返回缓存去重结果');

    // ws1 结束本回合
    const rReady1 = await sendAndAwait(
      ws1,
      {
        type: 'ACTION',
        roomCode,
        sessionToken: token1,
        requestId: 'req-002',
        roundId: 1,
        action: 'READY',
      },
      (m) => m.type === 'ACTION_RESULT' && m.requestId === 'req-002'
    );
    assert.ok(rReady1.success);
    assert.equal(rReady1.roundResolved, false, '单人 ready 不推进回合');

    // ws2 结束本回合 -> 共同推进
    const rReady2 = await sendAndAwait(
      ws2,
      {
        type: 'ACTION',
        roomCode,
        sessionToken: token2,
        requestId: 'req-003',
        roundId: 1,
        action: 'READY',
      },
      (m) => m.type === 'ACTION_RESULT' && m.requestId === 'req-003'
    );
    assert.ok(rReady2.success);
    assert.equal(rReady2.roundResolved, true, '双方 ready 共同推进');
    assert.equal(rReady2.state.teamRound, 2);

    // 过期回合指令测试：用 roundId: 1 发送动作，服务端拒绝
    const expiredRes = await sendAndAwait(
      ws1,
      {
        type: 'ACTION',
        roomCode,
        sessionToken: token1,
        requestId: 'req-004',
        roundId: 1,
        action: 'FORWARD',
      },
      (m) => m.type === 'ACTION_RESULT' && m.requestId === 'req-004'
    );
    assert.equal(expiredRes.success, false);
    assert.match(expiredRes.error, /指令回合已过期/);

    ws1.close();
    ws2.close();
  });

  test('4. 断线与恢复：掉线暂停主动操作，重连清除旧 ready，恢复原角色', async () => {
    const ws1 = await connectWs();
    const ws2 = await connectWs();

    const rCreate = await sendAndAwait(
      ws1,
      { type: 'CREATE_ROOM', roleKey: 'BEAR', playerName: '恢复熊' },
      (m) => m.type === 'ROOM_CREATED'
    );
    const roomCode = rCreate.roomCode;
    const token1 = rCreate.sessionToken;

    const rJoin = await sendAndAwait(
      ws2,
      { type: 'JOIN_ROOM', roomCode, roleKey: 'BUNNY', playerName: '恢复兔' },
      (m) => m.type === 'ROOM_JOINED'
    );
    const token2 = rJoin.sessionToken;

    // 监听 ws2 的掉线通知
    let disconnectNotified = false;
    ws2.on('message', (d) => {
      const m = JSON.parse(d.toString());
      if (m.type === 'PLAYER_DISCONNECTED' && m.playerId === 0) {
        disconnectNotified = true;
      }
    });

    // ws1 突然断线
    ws1.close();
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(disconnectNotified, true, '队友应收到掉线通知');

    // 队友在对方掉线时尝试移动，应被拦截暂停
    const rPause = await sendAndAwait(
      ws2,
      {
        type: 'ACTION',
        roomCode,
        sessionToken: token2,
        requestId: 'req-dis-1',
        roundId: 1,
        action: 'FORWARD',
      },
      (m) => m.type === 'ACTION_RESULT' && m.requestId === 'req-dis-1'
    );
    assert.equal(rPause.success, false);
    assert.match(rPause.error, /暂时离线|已暂停主动操作/);

    // ws1 凭 sessionToken 重新连入
    const ws1New = await connectWs();
    const reconnectMsg = await sendAndAwait(
      ws1New,
      {
        type: 'JOIN_ROOM',
        roomCode,
        sessionToken: token1,
      },
      (m) => m.type === 'ROOM_JOINED'
    );
    assert.ok(reconnectMsg.reconnected, '必须标明已成功重连');
    assert.equal(reconnectMsg.playerId, 0);
    assert.equal(reconnectMsg.roleKey, 'BEAR');

    // 重新连接后双方 ready 均被重置为 false
    assert.equal(reconnectMsg.state.players[0].ready, false);
    assert.equal(reconnectMsg.state.players[1].ready, false);

    ws1New.close();
    ws2.close();
  });
});
