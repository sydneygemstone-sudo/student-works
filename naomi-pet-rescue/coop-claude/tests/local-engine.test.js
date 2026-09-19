/**
 * tests/local-engine.test.js — 本地单机离线双人/单人模式测试。
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameClient } from '../client/local-engine.js';
import { ACTION, ROLES, STATUS } from '../core/constants.js';

test('LocalGameClient: 单机双人合作模式初始化与轮流行动', () => {
  const client = new LocalGameClient();
  let welcomeReceived = false;
  let lastState = null;

  client.addEventListener('welcome', (e) => {
    welcomeReceived = true;
    assert.equal(e.detail.role, ROLES.BUNNY);
    assert.equal(e.detail.isLocal, true);
    assert.equal(e.detail.dual, true);
  });

  client.addEventListener('state', (e) => {
    lastState = e.detail.snapshot;
  });

  client.start({ dual: true, local: true, role: ROLES.BUNNY });
  assert.equal(welcomeReceived, true);
  assert.ok(lastState);
  assert.equal(lastState.round, 1);
  assert.equal(lastState.players[ROLES.BUNNY].ap, 3);
  assert.equal(lastState.players[ROLES.BEAR].ap, 2);

  // 小兔行动：原地右转 (0步)
  client.action(ACTION.TURN_RIGHT, ROLES.BUNNY);
  assert.equal(lastState.players[ROLES.BUNNY].ap, 3);

  // 小兔就绪
  client.ready(true, ROLES.BUNNY);
  assert.equal(lastState.players[ROLES.BUNNY].ready, true);
  // 单机双人模式在小兔就绪后自动切换活跃角色到小熊
  assert.equal(client.activeRole, ROLES.BEAR);

  // 小熊就绪 -> 双方均就绪，原子推进回合
  client.ready(true, ROLES.BEAR);
  assert.equal(lastState.round, 2);
  assert.equal(lastState.players[ROLES.BUNNY].ap, 3);
  assert.equal(lastState.players[ROLES.BEAR].ap, 2);
  assert.equal(lastState.players[ROLES.BUNNY].ready, false);
  assert.equal(lastState.players[ROLES.BEAR].ready, false);
});

test('LocalGameClient: 双方一键就绪与重置', () => {
  const client = new LocalGameClient();
  let state = null;
  client.addEventListener('state', (e) => { state = e.detail.snapshot; });

  client.start({ solo: true, local: true });
  assert.equal(state.round, 1);

  client.readyAll();
  assert.equal(state.round, 2);

  client.reset();
  assert.equal(state.round, 1);
});
