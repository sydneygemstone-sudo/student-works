/**
 * tests/net-protocol.test.js — 局域网探测、协议校验、房间会话与真实 HTTP/WebSocket 联机测试。
 * Author: Claude Code (Claude Opus)
 */

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';

import {
  pickLanAddress, listLanCandidates, buildLanUrl, diagnoseInterfaces,
  isVirtualInterface, isExcludedAddress,
} from '../server/net.js';
import { GameRoom, RECLAIM_GRACE_MS } from '../server/room.js';
import { createServer, DEFAULT_PORT, resolveStaticPath } from '../server/index.js';
import { validateClientMessage, C2S, S2C, ERROR_CODE, encode, decode } from '../core/protocol.js';
import { ACTION, DIR_VECTOR, DIRECTIONS, ROLES, ROLE_CONFIG, STATUS } from '../core/constants.js';

/** 转一格 —— 测试里用它算「转完之后应该朝哪」，不写死方向。 */
const rightOf = (dir) => DIRECTIONS[(DIRECTIONS.indexOf(dir) + 1) % 4];
const leftOf = (dir) => DIRECTIONS[(DIRECTIONS.indexOf(dir) + 3) % 4];

// ———————————————————— 局域网地址探测 ————————————————————

/** 一台同时开着 Tailscale 的 Mac 的典型接口表。 */
const FAKE_INTERFACES = {
  lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
  en0: [
    { address: 'fe80::1', family: 'IPv6', internal: false },
    { address: '192.168.1.120', family: 'IPv4', netmask: '255.255.255.0', internal: false },
  ],
  en1: [{ address: '10.0.0.8', family: 'IPv4', internal: false }],
  utun4: [{ address: '100.74.87.20', family: 'IPv4', internal: false }],
  utun8: [{ address: '100.106.59.105', family: 'IPv4', internal: false }],
  tailscale0: [{ address: '100.64.1.2', family: 'IPv4', internal: false }],
  awdl0: [{ address: '169.254.12.9', family: 'IPv4', internal: false }],
  bridge0: [{ address: '192.168.64.1', family: 'IPv4', internal: false }],
};

test('严格过滤 Tailscale / CGNAT / 虚拟接口，优先选 en0 物理 Wi-Fi', () => {
  const picked = pickLanAddress(FAKE_INTERFACES);
  assert.deepEqual({ name: picked.name, address: picked.address }, { name: 'en0', address: '192.168.1.120' });

  const candidates = listLanCandidates(FAKE_INTERFACES);
  assert.deepEqual(candidates.map((c) => c.name), ['en0', 'en1'], '只保留物理以太/Wi-Fi 接口');
  for (const c of candidates) {
    assert.ok(!c.address.startsWith('100.'), '不得出现 100.* CGNAT 地址');
    assert.ok(!c.address.startsWith('169.254.'), '不得出现链路本地地址');
  }
});

test('虚拟接口与保留网段的判定规则', () => {
  for (const name of ['utun0', 'utun8', 'tun3', 'tap0', 'tailscale0', 'awdl0', 'llw0', 'bridge100', 'lo0', 'ppp0', 'vmnet1']) {
    assert.equal(isVirtualInterface(name), true, `${name} 应当被判为虚拟接口`);
  }
  for (const name of ['en0', 'en1', 'eth0']) {
    assert.equal(isVirtualInterface(name), false, `${name} 是物理接口`);
  }
  for (const address of ['100.64.1.2', '100.106.59.105', '169.254.1.1', '127.0.0.1', '0.0.0.0']) {
    assert.equal(isExcludedAddress(address), true);
  }
  for (const address of ['192.168.1.120', '10.0.0.8', '172.16.5.4']) {
    assert.equal(isExcludedAddress(address), false);
  }
});

test('只有 Tailscale 时不会误把 100.* 当成局域网地址', () => {
  const onlyTailscale = {
    lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
    utun4: [{ address: '100.74.87.20', family: 'IPv4', internal: false }],
  };
  assert.equal(pickLanAddress(onlyTailscale), null);
  const lan = buildLanUrl(8791, onlyTailscale);
  assert.equal(lan.host, '127.0.0.1');
  assert.equal(lan.lan, null);
});

test('buildLanUrl 生成 iPad 可扫码直连的地址', () => {
  const lan = buildLanUrl(DEFAULT_PORT, FAKE_INTERFACES);
  assert.equal(lan.url, 'http://192.168.1.120:8791/');
  assert.equal(lan.iface, 'en0');
  assert.equal(DEFAULT_PORT, 8791);
});

test('diagnoseInterfaces 标注每个接口被过滤的原因', () => {
  const rows = diagnoseInterfaces(FAKE_INTERFACES);
  const byName = Object.fromEntries(rows.map((r) => [r.name, r.verdict]));
  assert.equal(byName.en0, 'ok');
  assert.match(byName.utun4, /虚拟接口/);
  assert.match(byName.tailscale0, /虚拟接口/);
  assert.match(byName.lo0, /虚拟接口|内部回环/);
  assert.equal(rows.some((r) => r.address === 'fe80::1'), false, 'IPv6 不参与诊断');
});

// ———————————————————— 协议校验 ————————————————————

test('协议校验放行合法消息、拦截非法消息', () => {
  assert.equal(validateClientMessage({ type: C2S.JOIN, role: 'bear' }).ok, true);
  assert.equal(validateClientMessage({ type: C2S.JOIN, role: 'auto', solo: true }).ok, true);
  assert.equal(validateClientMessage({ type: C2S.ACTION, action: { type: ACTION.FORWARD } }).ok, true);
  assert.equal(validateClientMessage({ type: C2S.ACTION, action: ACTION.BOOST }).ok, true);
  assert.equal(validateClientMessage({ type: C2S.RESUME, token: 'abc' }).ok, true);

  assert.equal(validateClientMessage(null).ok, false);
  assert.equal(validateClientMessage({ type: '不存在' }).ok, false);
  assert.equal(validateClientMessage({ type: C2S.JOIN, role: '恐龙' }).ok, false);
  assert.equal(validateClientMessage({ type: C2S.ACTION, action: { type: 'fly' } }).ok, false);
  assert.equal(validateClientMessage({ type: C2S.RESUME }).code, ERROR_CODE.BAD_TOKEN);
});

test('encode / decode 能容错处理坏数据', () => {
  assert.deepEqual(decode(encode({ type: 'ping' })), { type: 'ping' });
  assert.equal(decode('不是 JSON'), null);
  assert.equal(decode('[1,2,3]'), null);
  assert.equal(decode('"字符串"'), null);
});

// ———————————————————— 房间与会话 ————————————————————

test('自动分配角色：第一位拿 Naomi 小兔，第二位拿小熊，第三位进不来', () => {
  const room = new GameRoom();
  const first = room.join({});
  const second = room.join({});
  assert.equal(first.session.roles[0], ROLES.BUNNY);
  assert.equal(second.session.roles[0], ROLES.BEAR);
  const third = room.join({});
  assert.equal(third.ok, false);
  assert.equal(third.code, ERROR_CODE.ROOM_FULL);
});

test('指定角色：被占用时拒绝', () => {
  const room = new GameRoom();
  room.join({ role: ROLES.BEAR });
  const clash = room.join({ role: ROLES.BEAR });
  assert.equal(clash.ok, false);
  assert.equal(clash.code, ERROR_CODE.ROLE_TAKEN);
  assert.equal(room.join({ role: ROLES.BUNNY }).ok, true);
});

test('断线重连：凭令牌找回原角色与完整对局状态', () => {
  const room = new GameRoom();
  const joined = room.join({ role: ROLES.BUNNY });
  const token = joined.session.token;
  room.handle(joined.session, { type: C2S.ACTION, action: { type: ACTION.TURN_RIGHT } });
  room.handle(joined.session, { type: C2S.READY, ready: true });

  room.disconnect(token);
  assert.equal(room.connectedRoles()[ROLES.BUNNY], false);
  assert.equal(room.slots[ROLES.BUNNY], token, '掉线期间位置仍然保留');

  const resumed = room.resume(token);
  assert.equal(resumed.ok, true);
  assert.equal(resumed.session.roles[0], ROLES.BUNNY);
  assert.equal(room.engine.players[ROLES.BUNNY].ready, true, '状态没有丢失');
  assert.equal(room.engine.players[ROLES.BUNNY].facing, rightOf(ROLE_CONFIG[ROLES.BUNNY].start.facing), '右转后的朝向也一并恢复');
});

test('无效令牌被拒绝', () => {
  const room = new GameRoom();
  const bad = room.resume('deadbeef');
  assert.equal(bad.ok, false);
  assert.equal(bad.code, ERROR_CODE.BAD_TOKEN);
});

test('掉线超过保护期后，位置可以被新玩家接手', () => {
  let clock = 1_000_000;
  const room = new GameRoom({ now: () => clock });
  const first = room.join({ role: ROLES.BEAR });
  room.disconnect(first.session.token);

  const tooSoon = room.join({ role: ROLES.BEAR });
  assert.equal(tooSoon.ok, false, '保护期内不能顶掉');

  clock += RECLAIM_GRACE_MS + 1;
  const taken = room.join({ role: ROLES.BEAR });
  assert.equal(taken.ok, true);
  assert.equal(room.resume(first.session.token).ok, false, '原令牌失效');
});

test('房间里已经有人时无法开启单人测试模式', () => {
  const room = new GameRoom();
  room.join({ role: ROLES.BEAR });
  const solo = room.join({ solo: true });
  assert.equal(solo.ok, false);
  assert.equal(solo.code, ERROR_CODE.ROOM_FULL);
});

test('未加入房间的会话不能操控角色', () => {
  const room = new GameRoom();
  const bear = room.join({ role: ROLES.BEAR }).session;
  const out = room.handle(bear, { type: C2S.ACTION, role: ROLES.BUNNY, action: { type: ACTION.FORWARD } });
  assert.equal(out.self[0].type, S2C.ERROR);
  assert.equal(out.self[0].code, ERROR_CODE.FORBIDDEN_ROLE);
});

test('撞墙提示会随状态一起广播给双方（两台 iPad 都能看到退路箭头）', () => {
  const room = new GameRoom();
  const bunny = room.join({ role: ROLES.BUNNY }).session;
  // 站在玫瑰迷宫西侧周界树篱外，朝东撞墙
  room.engine.players[ROLES.BUNNY].x = 8;
  room.engine.players[ROLES.BUNNY].y = 3;
  room.engine.players[ROLES.BUNNY].facing = 'E';
  const out = room.handle(bunny, { type: C2S.ACTION, action: { type: ACTION.FORWARD } });
  assert.equal(out.self[0].type, S2C.REJECTED);
  assert.equal(out.self[0].hint.retreatDir, 'W');
  assert.equal(out.broadcast[0].type, S2C.STATE);
  assert.equal(out.broadcast[0].events.at(-1).type, 'blocked');
});

// ———————————————————— 真实 HTTP + WebSocket ————————————————————

let app;
let port;

before(async () => {
  app = createServer({ port: 0 });
  port = await app.listen(0, '127.0.0.1');
});

after(async () => {
  await app.close();
});

const base = () => `http://127.0.0.1:${port}`;

class TestClient {
  constructor(ws) {
    this.ws = ws;
    this.queue = [];
    this.pending = [];
    ws.on('message', (raw) => {
      this.queue.push(JSON.parse(raw.toString()));
      this.pump();
    });
  }

  static open(p) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${p}/ws`);
      ws.once('open', () => resolve(new TestClient(ws)));
      ws.once('error', reject);
    });
  }

  pump() {
    for (const waiter of [...this.pending]) {
      const index = this.queue.findIndex((m) => (!waiter.type || m.type === waiter.type) && (!waiter.predicate || waiter.predicate(m)));
      if (index < 0) continue;
      const [message] = this.queue.splice(index, 1);
      this.pending.splice(this.pending.indexOf(waiter), 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
    }
  }

  waitFor(type, predicate = null, timeout = 4000) {
    return new Promise((resolve, reject) => {
      const waiter = { type, predicate, resolve };
      waiter.timer = setTimeout(() => {
        this.pending.splice(this.pending.indexOf(waiter), 1);
        reject(new Error(`等待 ${type} 消息超时`));
      }, timeout);
      this.pending.push(waiter);
      this.pump();
    });
  }

  send(message) {
    this.ws.send(JSON.stringify(message));
  }

  close() {
    return new Promise((resolve) => {
      this.ws.once('close', resolve);
      this.ws.close();
    });
  }
}

test('HTTP 静态资源与二维码接口全部可用', async () => {
  const page = await fetch(`${base()}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  const html = await page.text();
  assert.match(html, /小动物回家/);

  const app_js = await fetch(`${base()}/client/app.js`);
  assert.equal(app_js.status, 200);
  assert.match(app_js.headers.get('content-type'), /javascript/);

  const core = await fetch(`${base()}/core/game.js`);
  assert.equal(core.status, 200);
  assert.match(core.headers.get('content-type'), /javascript/);

  const three = await fetch(`${base()}/vendor/three.module.js`);
  assert.equal(three.status, 200, 'Three.js 必须本地托管，iPad 无需外网');
  assert.match(three.headers.get('content-type'), /javascript/);

  const qr = await fetch(`${base()}/qr.svg`);
  assert.equal(qr.status, 200);
  assert.match(qr.headers.get('content-type'), /svg/);
  assert.match(await qr.text(), /<svg/);

  const info = await (await fetch(`${base()}/api/info`)).json();
  assert.equal(info.ok, true);
  assert.equal(info.port, port);
  assert.match(info.url, /^http:\/\//);

  assert.equal((await fetch(`${base()}/健康`)).status, 404);
});

test('静态服务拒绝目录穿越', async () => {
  assert.equal(resolveStaticPath('/core/%2e%2e/package.json'), null);
  assert.equal(resolveStaticPath('/../package.json'), null);
  assert.ok(resolveStaticPath('/core/game.js'), '正常文件仍可访问');
  const res = await fetch(`${base()}/core/%2e%2e/package.json`);
  assert.equal(res.status, 404);
});

test('两台设备加入同一局，动作与状态实时同步', async () => {
  const ipadA = await TestClient.open(port);
  ipadA.send({ type: C2S.JOIN, role: 'auto', name: 'Naomi' });
  const welcomeA = await ipadA.waitFor(S2C.WELCOME);
  assert.equal(welcomeA.role, ROLES.BUNNY);
  assert.equal(welcomeA.solo, false);
  assert.ok(welcomeA.token);
  assert.equal(welcomeA.snapshot.round, 1);

  const ipadB = await TestClient.open(port);
  ipadB.send({ type: C2S.JOIN, role: 'auto', name: '爸爸' });
  const welcomeB = await ipadB.waitFor(S2C.WELCOME);
  assert.equal(welcomeB.role, ROLES.BEAR);

  const peers = await ipadA.waitFor(S2C.PEERS, (m) => m.roles.bear && m.roles.bunny);
  assert.deepEqual(peers.roles, { bear: true, bunny: true });

  // A 前进一步 → 两台设备都收到新状态
  ipadA.send({ type: C2S.ACTION, action: { type: ACTION.FORWARD } });
  const stateA = await ipadA.waitFor(S2C.STATE);
  const stateB = await ipadB.waitFor(S2C.STATE);
  assert.deepEqual(stateA.snapshot.players.bunny, stateB.snapshot.players.bunny, '两端状态一致');
  const bunnyStart = ROLE_CONFIG[ROLES.BUNNY].start;
  const step = DIR_VECTOR[bunnyStart.facing];
  assert.deepEqual(
    { x: stateA.snapshot.players.bunny.x, y: stateA.snapshot.players.bunny.y },
    { x: bunnyStart.x + step.dx, y: bunnyStart.y + step.dy },
    '小兔朝着起始朝向前进了一格',
  );
  assert.equal(stateA.snapshot.players.bunny.ap, 2);

  // 第三台设备进不来
  const ipadC = await TestClient.open(port);
  ipadC.send({ type: C2S.JOIN, role: 'auto' });
  const err = await ipadC.waitFor(S2C.ERROR);
  assert.equal(err.code, ERROR_CODE.ROOM_FULL);
  await ipadC.close();

  // 单方就绪不推进，双方就绪才原子推进
  ipadA.send({ type: C2S.READY, ready: true });
  const half = await ipadB.waitFor(S2C.STATE, (m) => m.snapshot.players.bunny.ready);
  assert.equal(half.snapshot.round, 1, '单方就绪不推进世界');
  assert.equal(half.snapshot.players.bunny.ready, true);
  assert.equal(half.snapshot.players.bear.ready, false);

  ipadB.send({ type: C2S.READY, ready: true });
  const advanced = await ipadA.waitFor(S2C.STATE, (m) => m.snapshot.round === 2);
  assert.equal(advanced.snapshot.round, 2, '双方就绪才原子推进');
  assert.equal(advanced.snapshot.players.bunny.ap, 3, '行动点已刷新');
  assert.equal(advanced.snapshot.players.bunny.ready, false);

  await ipadA.close();
  await ipadB.close();
});

test('iPad 掉线后用会话令牌重连，角色与进度完好恢复', async () => {
  const app2 = createServer({ port: 0 });
  const p2 = await app2.listen(0, '127.0.0.1');
  try {
    const ipad = await TestClient.open(p2);
    ipad.send({ type: C2S.JOIN, role: ROLES.BEAR });
    const welcome = await ipad.waitFor(S2C.WELCOME);
    ipad.send({ type: C2S.ACTION, action: { type: ACTION.TURN_LEFT } });
    await ipad.waitFor(S2C.STATE);
    await ipad.close();

    const back = await TestClient.open(p2);
    back.send({ type: C2S.RESUME, token: welcome.token });
    const resumed = await back.waitFor(S2C.WELCOME);
    assert.equal(resumed.resumed, true);
    assert.equal(resumed.role, ROLES.BEAR);
    assert.equal(resumed.snapshot.players.bear.facing, leftOf(ROLE_CONFIG[ROLES.BEAR].start.facing), '掉线前转过的朝向还在');
    assert.equal(resumed.token, welcome.token);

    // 令牌无效时给出明确错误
    back.send({ type: C2S.RESUME, token: '0000' });
    const err = await back.waitFor(S2C.ERROR);
    assert.equal(err.code, ERROR_CODE.BAD_TOKEN);
    await back.close();
  } finally {
    await app2.close();
  }
});

test('非法消息与未加入房间的操作被服务端拒绝', async () => {
  const ipad = await TestClient.open(port);
  ipad.send({ type: C2S.ACTION, action: { type: ACTION.FORWARD } });
  const notJoined = await ipad.waitFor(S2C.ERROR);
  assert.equal(notJoined.code, ERROR_CODE.NOT_JOINED);

  ipad.ws.send('这不是 JSON');
  const bad = await ipad.waitFor(S2C.ERROR);
  assert.equal(bad.code, ERROR_CODE.BAD_MESSAGE);

  ipad.send({ type: C2S.PING, t: 7 });
  const pong = await ipad.waitFor(S2C.PONG);
  assert.equal(pong.t, 7);
  await ipad.close();
});

test('服务端房间引擎的胜负状态可以通过 reset 重开', () => {
  const room = new GameRoom();
  room.engine.status = STATUS.LOST;
  const session = room.join({ role: ROLES.BEAR }).session;
  const out = room.handle(session, { type: C2S.RESET });
  assert.equal(room.engine.status, STATUS.PLAYING);
  assert.equal(out.broadcast[0].snapshot.round, 1);
});
