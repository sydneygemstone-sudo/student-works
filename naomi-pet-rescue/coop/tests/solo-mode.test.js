/**
 * Naomi《小动物回家》—— 单人测试模式 (Solo Test Mode) 专项测试
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const CoopEngine = require('../core/coop-engine.js');

test('Naomi 单人测试模式专项测试', async (t) => {
  await t.test('1. 单人模式游戏初始化与角色切换', () => {
    const game = CoopEngine.createGame({
      bearName: '小熊',
      bunnyName: 'Naomi小兔',
    });

    assert.equal(game.status, 'playing');
    assert.equal(game.teamRound, 1);
    assert.equal(game.players[0].name, '小熊');
    assert.equal(game.players[0].ap, 2);
    assert.equal(game.players[0].carry, 2);

    assert.equal(game.players[1].name, 'Naomi小兔');
    assert.equal(game.players[1].ap, 3);
    assert.equal(game.players[1].carry, 1);

    // 模拟单人模式分饰两角：当前控制小熊 (id: 0)
    let activeId = 0;
    assert.equal(activeId, 0);

    // 切换至小兔 (id: 1)
    activeId = activeId === 0 ? 1 : 0;
    assert.equal(activeId, 1);
  });

  await t.test('2. 单人分饰两角走步与行动点独立结算', () => {
    const game = CoopEngine.createGame({
      bearName: '小熊',
      bunnyName: 'Naomi小兔',
      seed: 8888,
    });

    // 1) 小熊行动 (id: 0)
    const bearInitX = game.players[0].x;
    const bearInitY = game.players[0].y;
    assert.equal(game.players[0].ap, 2);

    // 转向不扣步数
    const rTurn = CoopEngine.applyAction(game, 0, 'TURN_RIGHT');
    assert.equal(rTurn.success, true);
    assert.equal(game.players[0].ap, 2);

    // 前进 1 格
    const rFwd = CoopEngine.applyAction(game, 0, 'FORWARD');
    assert.equal(rFwd.success, true);
    assert.equal(game.players[0].ap, 1);

    // 2) 切换至小兔行动 (id: 1)
    assert.equal(game.players[1].ap, 3);

    // 小兔前进
    const rBunnyFwd = CoopEngine.applyAction(game, 1, 'FORWARD');
    assert.equal(rBunnyFwd.success, true);
    assert.equal(game.players[1].ap < 3, true);

    // 小熊的 AP 保持独立不受影响
    assert.equal(game.players[0].ap, 1);
  });

  await t.test('3. 单人模式一键双方就绪或依次就绪推进共同回合', () => {
    const game = CoopEngine.createGame({
      bearName: '小熊',
      bunnyName: 'Naomi小兔',
      seed: 6666,
    });

    assert.equal(game.teamRound, 1);

    // 小熊就绪
    const r1 = CoopEngine.applyAction(game, 0, 'READY');
    assert.equal(r1.success, true);
    assert.equal(game.players[0].ready, true);
    assert.equal(game.teamRound, 1); // 仅单方就绪不推进

    // 小兔就绪 -> 双方均就绪，自动推进回合！
    const r2 = CoopEngine.applyAction(game, 1, 'READY');
    assert.equal(r2.success, true);
    assert.equal(r2.roundResolved, true);
    assert.equal(game.teamRound, 2); // 成功推进至第2回合
    assert.equal(game.players[0].ready, false); // 准备状态复位
    assert.equal(game.players[1].ready, false);
    assert.equal(game.players[0].ap, 2); // AP 重新刷满
    assert.equal(game.players[1].ap, 3);
  });

  await t.test('4. 前端 HTML 模板与客户端脚本单人模式元素完整性', () => {
    const html = fs.readFileSync(path.join(__dirname, '../client/index.html'), 'utf-8');
    const appJs = fs.readFileSync(path.join(__dirname, '../client/app.js'), 'utf-8');

    // HTML 元素存在性验证
    assert.match(html, /id="tabBtnSolo"/);
    assert.match(html, /id="panelSolo"/);
    assert.match(html, /id="btnStartSoloSubmit"/);
    assert.match(html, /id="soloControlBar"/);
    assert.match(html, /id="btnSwitchSoloPlayer"/);
    assert.match(html, /id="btnSoloAdvanceRound"/);

    // JS 单人模式逻辑验证
    assert.match(appJs, /let isSoloMode = false;/);
    assert.match(appJs, /function startSoloMode\(\)/);
    assert.match(appJs, /function switchSoloPlayer\(\)/);
    assert.match(appJs, /function advanceSoloRoundDirectly\(\)/);
    assert.match(appJs, /function handleSoloAction\(action\)/);
    assert.match(appJs, /urlParams\.get\('solo'\)/);
  });
});
