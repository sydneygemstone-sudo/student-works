// 单人测试模式测试 — Codex (GLM 5.3 Max)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const WebSocket = require('ws');
const { start } = require('../server/index');

function once(ws, predicate) {
  return new Promise((resolve) => {
    const h = (ev) => {
      const m = JSON.parse(ev.data);
      if (predicate(m)) { ws.removeEventListener('message', h); resolve(m); }
    };
    ws.addEventListener('message', h);
  });
}

test('solo=1 独立房间，可交替控制两角色并一键双方就绪', async () => {
  const { server } = await start({ port: 8895 });
  try {
    const ws = new WebSocket('ws://127.0.0.1:8895/?solo=1&role=bear');
    const w = await once(ws, (m) => m.type === 'welcome');
    assert.equal(w.solo, true);
    assert.ok(w.state.solo);

    // 以 bunny 身份行动
    ws.send(JSON.stringify({ type: 'action', action: { type: 'turn', side: 'left' }, role: 'bunny' }));
    const r = await once(ws, (m) => m.type === 'result');
    assert.ok(r.result.ok);

    // 一键双方就绪 → 回合推进
    ws.send(JSON.stringify({ type: 'action', action: { type: 'ready', value: true }, role: 'bear' }));
    ws.send(JSON.stringify({ type: 'action', action: { type: 'ready', value: true }, role: 'bunny' }));
    const st = await once(ws, (m) => m.type === 'state' && m.state.round === 2);
    assert.equal(st.state.players.bunny.dir, 'W');
    ws.close();
  } finally {
    await new Promise(r => server.close(r));
  }
});
