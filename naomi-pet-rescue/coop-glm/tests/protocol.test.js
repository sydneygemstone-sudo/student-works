// 网络协议与联机流程测试 — Codex (GLM 5.3 Max)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const WebSocket = require('ws');
const { start } = require('../server/index');

const PORT = 8891;

test('HTTP 服务与局域网信息接口（过滤 Tailscale）', async () => {
  const { server } = await start({ port: PORT });
  try {
    const info = await fetch(`http://127.0.0.1:${PORT}/api/info`).then(r => r.json());
    assert.equal(info.port, PORT);
    assert.ok(info.url.startsWith('http://'));
    assert.match(info.qr, /<svg/);
    for (const ip of info.ips) {
      assert.ok(!ip.address.startsWith('100.'), '不得返回 CGNAT 100.* 地址');
      assert.match(ip.name, /^(?!utun|tun|tailscale)/i);
    }
    const html = await fetch(`http://127.0.0.1:${PORT}/`).then(r => r.text());
    assert.match(html, /小动物回家/);
    assert.equal(typeof WebSocket, 'function');
  } finally {
    await new Promise(r => server.close(r));
  }
});

function wsSend(ws, obj) { ws.send(JSON.stringify(obj)); }
function once(ws, predicate) {
  return new Promise((resolve) => {
    const h = (ev) => {
      const m = JSON.parse(ev.data);
      if (predicate(m)) { ws.removeEventListener('message', h); resolve(m); }
    };
    ws.addEventListener('message', h);
  });
}

test('双人 WebSocket：分角色加入、行动广播、双方就绪推进', async () => {
  const { server } = await start({ port: PORT + 1 });
  const url = `ws://127.0.0.1:${PORT + 1}`;
  try {
    const a = new WebSocket(url + '?role=bear');
    const w1 = await once(a, (m) => m.type === 'welcome');
    assert.equal(w1.role, 'bear');
    assert.ok(w1.token.length >= 16);

    const b = new WebSocket(url + `?role=bunny&roomId=${w1.roomId}`);
    const w2 = await once(b, (m) => m.type === 'welcome');
    assert.equal(w2.role, 'bunny');
    assert.equal(w2.roomId, w1.roomId);

    // 双方都收到对方加入后的状态
    await once(a, (m) => m.type === 'state' && m.state.players.bunny);
    // bear 转向（0 消耗）
    wsSend(a, { type: 'action', action: { type: 'turn', side: 'right' } });
    const r1 = await once(a, (m) => m.type === 'result');
    assert.ok(r1.result.ok);
    // bunny 也应收到状态广播
    const st = await once(b, (m) => m.type === 'state');
    assert.equal(st.state.players.bear.dir, 'E');

    // 单方就绪不推进
    wsSend(a, { type: 'action', action: { type: 'ready', value: true } });
    const rb = await once(b, (m) => m.type === 'state');
    assert.equal(rb.state.round, 1);
    // 双方就绪 → 原子推进
    wsSend(b, { type: 'action', action: { type: 'ready', value: true } });
    const adv = await once(b, (m) => m.type === 'state' && m.state.round === 2);
    assert.equal(adv.state.players.bear.ready, false);
    a.close(); b.close();
  } finally {
    await new Promise(r => server.close(r));
  }
});

test('令牌掉线重连恢复会话', async () => {
  const { server } = await start({ port: PORT + 2 });
  const url = `ws://127.0.0.1:${PORT + 2}`;
  try {
    const a = new WebSocket(url + '?role=bear');
    const w = await once(a, (m) => m.type === 'welcome');
    a.close();
    await new Promise(r => setTimeout(r, 100));
    const a2 = new WebSocket(`${url}?token=${w.token}&role=bear`);
    const w2 = await once(a2, (m) => m.type === 'welcome');
    assert.equal(w2.token, w.token);
    assert.equal(w2.role, 'bear');
    a2.close();
  } finally {
    await new Promise(r => server.close(r));
  }
});
