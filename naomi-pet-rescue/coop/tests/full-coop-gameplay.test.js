const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { WebSocket } = require('ws');
const { server, wss } = require('../server/index.js');

let wsBaseUrl = '';
let reqIndex = 0;

function connectWs() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsBaseUrl}/ws`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function sendAction(ws, roomCode, token, action, roundId) {
  reqIndex++;
  const reqId = `full_sim_${reqIndex}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMsg);
      reject(new Error(`Timeout waiting action response: ${action} (${reqId})`));
    }, 4000);

    function onMsg(data) {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === 'ACTION_RESULT' && parsed.requestId === reqId) {
          clearTimeout(timer);
          ws.off('message', onMsg);
          resolve(parsed);
        }
      } catch (e) {}
    }
    ws.on('message', onMsg);
    ws.send(
      JSON.stringify({
        type: 'ACTION',
        roomCode,
        sessionToken: token,
        requestId: reqId,
        roundId,
        action,
      })
    );
  });
}

describe('Naomi 联机合作版 —— 双客户端真实完整救援闭环测试', () => {
  before(async () => {
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        wsBaseUrl = `ws://127.0.0.1:${port}`;
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

  test('真实走步救援通关：迷宫深入救出小兔宝宝，外场小动物全部平安护送回家', async () => {
    const ws1 = await connectWs();
    const ws2 = await connectWs();

    // 1. 小熊创建房间
    let roomCode = '';
    let tokenBear = '';
    await new Promise((resolve) => {
      ws1.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ROOM_CREATED') {
          roomCode = msg.roomCode;
          tokenBear = msg.sessionToken;
          resolve();
        }
      });
      ws1.send(JSON.stringify({ type: 'CREATE_ROOM', roleKey: 'BEAR', playerName: '小熊' }));
    });

    // 2. 小兔加入房间
    let tokenBunny = '';
    await new Promise((resolve) => {
      ws2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ROOM_JOINED') {
          tokenBunny = msg.sessionToken;
          resolve();
        }
      });
      ws2.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode, roleKey: 'BUNNY', playerName: 'Naomi' }));
    });

    assert.ok(roomCode);
    assert.ok(tokenBear);
    assert.ok(tokenBunny);

    let currentRound = 1;

    // === 回合 1：小兔前往迷宫入口，小熊向南探索 ===
    // 小兔右转朝东
    let res = await sendAction(ws2, roomCode, tokenBunny, 'TURN_RIGHT', currentRound);
    assert.ok(res.success);

    // 小兔步 1: (4,4) -> (5,4)
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 5);
    assert.equal(res.state.players[1].y, 4);

    // 小兔步 2: (5,4) -> (6,4)
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 6);
    assert.equal(res.state.players[1].y, 4);

    // 测试 Naomi 石头阻挡提示：朝东正对着 (7,4) 石头
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.equal(res.success, false);
    assert.equal(res.reason, 'blocked');
    assert.ok(res.hint);
    assert.equal(res.hint.blocked, true);

    // 小兔左转朝北，步 3 迈入 (6,3) 迷宫入口花廊！
    await sendAction(ws2, roomCode, tokenBunny, 'TURN_LEFT', currentRound);
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 6);
    assert.equal(res.state.players[1].y, 3);
    assert.equal(res.state.players[1].ap, 0);

    // 小熊同时朝南走2步：(4,4) -> (4,5) -> (4,6)
    res = await sendAction(ws1, roomCode, tokenBear, 'FORWARD', currentRound);
    assert.ok(res.success);
    res = await sendAction(ws1, roomCode, tokenBear, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[0].x, 4);
    assert.equal(res.state.players[0].y, 6);

    // 双方准备，推进共同回合
    await sendAction(ws1, roomCode, tokenBear, 'READY', currentRound);
    res = await sendAction(ws2, roomCode, tokenBunny, 'READY', currentRound);
    assert.ok(res.roundResolved);
    currentRound = res.state.teamRound;
    assert.equal(currentRound, 2);

    // === 回合 2：小兔深入树篱迷宫，避开死胡同 ===
    // 小兔在 (6,3) 朝北，步 1 走进走廊 (6,2)
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 6);
    assert.equal(res.state.players[1].y, 2);

    // 右转朝东，步 2 走向 (7,2)
    await sendAction(ws2, roomCode, tokenBunny, 'TURN_RIGHT', currentRound);
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 7);
    assert.equal(res.state.players[1].y, 2);

    // 左转朝北，步 3 走向 (7,1)
    await sendAction(ws2, roomCode, tokenBunny, 'TURN_LEFT', currentRound);
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 7);
    assert.equal(res.state.players[1].y, 1);

    // 小熊在南区继续前进：(4,6) -> (4,7) -> (4,8)，抱起小动物
    res = await sendAction(ws1, roomCode, tokenBear, 'FORWARD', currentRound);
    assert.ok(res.success);
    res = await sendAction(ws1, roomCode, tokenBear, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[0].x, 4);
    assert.equal(res.state.players[0].y, 8);

    // 双方准备，推进共同回合
    await sendAction(ws1, roomCode, tokenBear, 'READY', currentRound);
    res = await sendAction(ws2, roomCode, tokenBunny, 'READY', currentRound);
    currentRound = res.state.teamRound;
    assert.equal(currentRound, 3);

    // === 回合 3：小兔抵达迷宫核心花亭，救起小兔宝宝，经出口拱门出来 ===
    // 小兔在 (7,1) 朝北，步 1 走到 (7,0)
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 7);
    assert.equal(res.state.players[1].y, 0);

    // 左转朝西，步 2 进入 (6,0) 迷宫花亭！
    await sendAction(ws2, roomCode, tokenBunny, 'TURN_LEFT', currentRound);
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 6);
    assert.equal(res.state.players[1].y, 0);

    // 验证小兔已抱起小兔宝宝
    const mazePet = res.state.pets.find((p) => p.name === '小兔宝宝');
    assert.equal(mazePet.carriedBy, 1, '小兔成功在迷宫核心抱起小兔宝宝！');

    // 步 3 穿过出口拱门 (5,0)！
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 5);
    assert.equal(res.state.players[1].y, 0);

    // 小熊转身朝北回防
    await sendAction(ws1, roomCode, tokenBear, 'TURN_LEFT', currentRound);
    await sendAction(ws1, roomCode, tokenBear, 'TURN_LEFT', currentRound);
    res = await sendAction(ws1, roomCode, tokenBear, 'FORWARD', currentRound);
    assert.ok(res.success);

    // 双方准备，推进共同回合
    await sendAction(ws1, roomCode, tokenBear, 'READY', currentRound);
    res = await sendAction(ws2, roomCode, tokenBunny, 'READY', currentRound);
    currentRound = res.state.teamRound;
    assert.equal(currentRound, 4);

    // === 回合 4：小兔带小兔宝宝沿中央大道南下回防 ===
    // 小兔在 (5,0) 朝西，步 1 进入 (4,0) 中央大道
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 4);
    assert.equal(res.state.players[1].y, 0);

    // 左转朝南，步 2 走向 (4,1)
    await sendAction(ws2, roomCode, tokenBunny, 'TURN_LEFT', currentRound);
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);

    // 步 3 走向 (4,2)
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 4);
    assert.equal(res.state.players[1].y, 2);

    // 小熊北上回防，花费 2 步走到 (4,5)！
    res = await sendAction(ws1, roomCode, tokenBear, 'FORWARD', currentRound);
    assert.ok(res.success);
    res = await sendAction(ws1, roomCode, tokenBear, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[0].x, 4);
    assert.equal(res.state.players[0].y, 5);

    // 双方准备，推进共同回合
    await sendAction(ws1, roomCode, tokenBear, 'READY', currentRound);
    res = await sendAction(ws2, roomCode, tokenBunny, 'READY', currentRound);
    currentRound = res.state.teamRound;
    assert.equal(currentRound, 5);

    // === 回合 5：小熊与小兔携手带着小动物平安回到家园 ===
    // 小熊 1 步跨进家园 (4,4)！送回携带的小动物！
    res = await sendAction(ws1, roomCode, tokenBear, 'FORWARD', currentRound);
    assert.ok(res.success);
    assert.equal(res.state.players[0].x, 4);
    assert.equal(res.state.players[0].y, 4);

    // 小兔 2 步跨进家园 (4,4)！送回迷宫小兔宝宝！
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound); // (4,3)
    assert.ok(res.success);
    res = await sendAction(ws2, roomCode, tokenBunny, 'FORWARD', currentRound); // (4,4)
    assert.ok(res.success);
    assert.equal(res.state.players[1].x, 4);
    assert.equal(res.state.players[1].y, 4);

    // 验证迷宫小动物到家，团队勇气增加
    const finalMazePet = res.state.pets.find((p) => p.name === '小兔宝宝');
    assert.equal(finalMazePet.home, true, '迷宫小兔宝宝已平安在家！');
    assert.ok(res.state.energy >= 2, '团队勇气已增加');
    assert.ok(currentRound <= 14, '在14回合共同预算之内');

    ws1.close();
    ws2.close();
  });
});
