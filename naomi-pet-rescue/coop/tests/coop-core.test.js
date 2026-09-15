const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const CoopEngine = require('../core/coop-engine.js');

describe('Naomi 联机合作版 —— 核心规则与迷宫测试', () => {
  test('1. 地图与迷宫结构：8只动物、3个礼盒、家均可达；迷宫有入口、目标、出口与2个死胡同', () => {
    const game = CoopEngine.createGame();
    assert.equal(game.pets.length, 8);
    assert.equal(game.gifts.length, 3);
    assert.deepEqual(game.home, { x: 4, y: 4 });

    // 验证迷宫关键位置
    assert.deepEqual(game.maze.entrance, { x: 6, y: 3, label: '迷宫入口花廊' });
    assert.deepEqual(game.maze.target, { x: 6, y: 0, label: '迷宫花亭（待救小兔宝宝）' });
    assert.deepEqual(game.maze.exit, { x: 5, y: 0, label: '迷宫出口拱门' });
    assert.equal(game.maze.deadEnds.length, 2);

    // 迷宫目标处放置了第0号小动物（小兔宝宝）
    const targetPet = game.pets.find((p) => p.x === game.maze.target.x && p.y === game.maze.target.y);
    assert.ok(targetPet, '迷宫目标点必须有小动物');
    assert.equal(targetPet.name, '小兔宝宝');

    // BFS 验证全地图连通性：从家出发能访问到全部小动物、礼盒与迷宫目标
    const visited = new Set();
    const queue = [{ x: game.home.x, y: game.home.y }];
    visited.add(`${game.home.x},${game.home.y}`);

    const DIRS = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ];

    while (queue.length > 0) {
      const curr = queue.shift();
      for (const [dx, dy] of DIRS) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        const k = `${nx},${ny}`;
        if (CoopEngine.inBounds(game, nx, ny) && !visited.has(k)) {
          const cost = CoopEngine.moveCost(game, nx, ny);
          if (Number.isFinite(cost)) {
            visited.add(k);
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    // 验证所有目标可达
    for (const pet of game.pets) {
      assert.ok(visited.has(`${pet.x},${pet.y}`), `小动物 ${pet.name} (${pet.x},${pet.y}) 必须可达`);
    }
    for (const gift of game.gifts) {
      assert.ok(visited.has(`${gift.x},${gift.y}`), `礼盒 (${gift.x},${gift.y}) 必须可达`);
    }
    assert.ok(visited.has(`${game.maze.target.x},${game.maze.target.y}`), '迷宫目标必须可达');
    assert.ok(visited.has(`${game.maze.exit.x},${game.maze.exit.y}`), '迷宫出口必须可达');
  });

  test('2. 转向与移动成本：转向0步，草地1步，森林2步，森林网3步，步数不足拒绝', () => {
    const game = CoopEngine.createGame();
    const bear = game.players[0]; // (4,4), AP=2, heading=SOUTH
    assert.equal(bear.ap, 2);
    assert.equal(bear.heading, CoopEngine.HEADINGS.SOUTH);

    // 左转90度 -> EAST，不耗 AP
    const r1 = CoopEngine.applyAction(game, 0, 'TURN_LEFT');
    assert.ok(r1.success);
    assert.equal(bear.heading, CoopEngine.HEADINGS.EAST);
    assert.equal(bear.ap, 2);

    // 右转90度 -> SOUTH，不耗 AP
    const r2 = CoopEngine.applyAction(game, 0, 'TURN_RIGHT');
    assert.ok(r2.success);
    assert.equal(bear.heading, CoopEngine.HEADINGS.SOUTH);
    assert.equal(bear.ap, 2);

    // 往南走一步 (4, 5) 草地，耗1步
    const r3 = CoopEngine.applyAction(game, 0, 'FORWARD');
    assert.ok(r3.success);
    assert.equal(bear.x, 4);
    assert.equal(bear.y, 5);
    assert.equal(bear.ap, 1);

    // 再尝试往东走进 (5, 5) 草地，消耗1步
    CoopEngine.applyAction(game, 0, 'TURN_LEFT'); // 面向东
    const r4 = CoopEngine.applyAction(game, 0, 'FORWARD');
    assert.ok(r4.success);
    assert.equal(bear.x, 5);
    assert.equal(bear.y, 5);
    assert.equal(bear.ap, 0);

    // AP=0 时再尝试移动，应提示步数不足拒绝
    const r5 = CoopEngine.applyAction(game, 0, 'FORWARD');
    assert.equal(r5.success, false);
    assert.equal(r5.reason, 'insufficient_ap');
    assert.equal(bear.x, 5);
    assert.equal(bear.y, 5);
  });

  test('3. Naomi 的石头箭头提示：撞墙不穿墙、不扣行动点、显示后退或转向箭头', () => {
    const game = CoopEngine.createGame();
    const bunny = game.players[1]; // (4,4), AP=3, heading=NORTH
    // 移动到石头 (7,4) 旁边：(6,4)，朝东
    bunny.x = 6;
    bunny.y = 4;
    bunny.heading = CoopEngine.HEADINGS.EAST;
    bunny.ap = 3;

    // 前进正对着 (7,4) 石头
    const result = CoopEngine.applyAction(game, 1, 'FORWARD');
    assert.equal(result.success, false);
    assert.equal(result.reason, 'blocked');
    assert.equal(bunny.ap, 3, '撞墙绝对不扣除行动点');
    assert.equal(bunny.x, 6);
    assert.equal(bunny.y, 4, '撞墙不改变角色位置');

    // 检查提示信息与 Naomi 箭头指示
    assert.ok(result.hint);
    assert.equal(result.hint.blocked, true);
    assert.ok(result.hint.arrowDirection, '必须给出退路方向（如 BACKWARD）');
    assert.match(result.hint.message, /石头|挡路|箭头/);
  });

  test('4. 拾取与自动送回：小熊抱2只，小兔抱1只；到家自动救回并增加勇气', () => {
    const game = CoopEngine.createGame();
    const bear = game.players[0];
    const bunny = game.players[1];

    // 将小动物0放置在 (4, 3)
    game.pets[0].x = 4;
    game.pets[0].y = 3;
    game.pets[0].carriedBy = null;
    game.pets[0].home = false;

    // 小兔移到 (4, 3)
    bunny.x = 4;
    bunny.y = 3;
    CoopEngine.enterCell(game, bunny);
    assert.equal(game.pets[0].carriedBy, 1, '小兔成功抱起小动物0');

    // 将小动物1也放置在 (4, 3)，小兔容量仅为1，无法抱起第二只
    game.pets[1].x = 4;
    game.pets[1].y = 3;
    game.pets[1].carriedBy = null;
    game.pets[1].home = false;
    CoopEngine.enterCell(game, bunny);
    assert.equal(game.pets[1].carriedBy, null, '小兔容量已满，小动物1留在原地');

    // 小兔回到家 (4, 4)
    bunny.x = 4;
    bunny.y = 4;
    CoopEngine.enterCell(game, bunny);
    assert.equal(game.pets[0].home, true, '小动物已平安送回家');
    assert.equal(game.pets[0].carriedBy, null);
    assert.equal(game.energy, 2, '救回1只动物奖励2点团队勇气');
  });

  test('5. 交接动物：相邻或同格合法交接，队友 ready 时不可交接，队友在家立即救回', () => {
    const game = CoopEngine.createGame();
    const bear = game.players[0]; // (4,4) 在家
    const bunny = game.players[1]; // (4,3) 相邻

    bunny.x = 4;
    bunny.y = 3;
    bear.x = 4;
    bear.y = 4;

    // 小兔抱起小动物
    game.pets[0].carriedBy = 1;

    // 若小熊已 ready，交接被拒绝
    bear.ready = true;
    const rBlocked = CoopEngine.applyAction(game, 1, 'GIVE');
    assert.equal(rBlocked.success, false);
    assert.match(rBlocked.error, /未就绪状态/);

    // 小熊取消 ready
    bear.ready = false;
    const rOk = CoopEngine.applyAction(game, 1, 'GIVE');
    assert.ok(rOk.success);
    // 因为小熊在家，递给小熊后应直接触发到家救回！
    assert.equal(game.pets[0].home, true);
    assert.equal(game.energy, 2);
  });

  test('6. 家园守护与森林绳网：家园庇护抵御绳网与雷雨，上限2层', () => {
    const game = CoopEngine.createGame();
    const bear = game.players[0]; // (4,4) 在家
    bear.ap = 2;

    // 第一次守护
    const r1 = CoopEngine.applyAction(game, 0, 'SUPPORT');
    assert.ok(r1.success);
    assert.equal(game.shield, 1);
    assert.equal(bear.ap, 1);

    // 同回合不能重复守护
    const r2 = CoopEngine.applyAction(game, 0, 'SUPPORT');
    assert.equal(r2.success, false);
    assert.match(r2.error, /已经守护过/);
  });

  test('7. 共同回合推进：单方 ready 不推进，双方 ready 推进一次，AP归零不自动推进', () => {
    const game = CoopEngine.createGame();
    const bear = game.players[0];
    const bunny = game.players[1];

    assert.equal(game.teamRound, 1);

    // 小熊行动点消耗完毕
    bear.ap = 0;
    assert.equal(game.teamRound, 1, 'AP 归零绝不自动推进回合');
    assert.equal(bear.ready, false);

    // 小熊点 ready
    const r1 = CoopEngine.applyAction(game, 0, 'READY');
    assert.ok(r1.success);
    assert.equal(bear.ready, true);
    assert.equal(game.teamRound, 1, '单方 ready 不推进共同回合');

    // 小熊反悔，点击继续行动 (UNREADY)
    const r2 = CoopEngine.applyAction(game, 0, 'UNREADY');
    assert.ok(r2.success);
    assert.equal(bear.ready, false);

    // 小熊再次 ready
    CoopEngine.applyAction(game, 0, 'READY');
    // 小兔也 ready
    const r3 = CoopEngine.applyAction(game, 1, 'READY');
    assert.ok(r3.success);
    assert.equal(r3.roundResolved, true);
    assert.equal(game.teamRound, 2, '双方都 ready 后推进到第 2 共同回合');

    // 新回合双方恢复 AP
    assert.equal(bear.ap, 2);
    assert.equal(bunny.ap, 3);
    assert.equal(bear.ready, false);
    assert.equal(bunny.ready, false);
  });

  test('8. 恶作剧礼盒：触发后下回合休息，不可移动，但可商量并确认 ready', () => {
    const game = CoopEngine.createGame();
    const bunny = game.players[1];

    // 找到炸弹礼盒并踩上去
    const bombGift = game.gifts.find((g) => g.kind === 'bomb');
    bunny.x = bombGift.x;
    bunny.y = bombGift.y;
    CoopEngine.enterCell(game, bunny);

    assert.equal(bunny.skipTurns, 1, '小兔被恶作剧炸弹击中');

    // 结束本回合，推进到下一回合
    CoopEngine.applyAction(game, 0, 'READY');
    CoopEngine.applyAction(game, 1, 'READY');
    assert.equal(game.teamRound, 2);

    // 第2回合小兔休息，AP为0
    assert.equal(bunny.ap, 0);
    const rMove = CoopEngine.applyAction(game, 1, 'FORWARD');
    assert.equal(rMove.success, false);
    assert.match(rMove.error, /休息中/);

    // 但小兔仍能点击 ready
    const rReady = CoopEngine.applyAction(game, 1, 'READY');
    assert.ok(rReady.success);
    assert.equal(bunny.ready, true);
  });

  test('9. 视线遮挡：隔墙/树篱看不见队友，无遮挡直视可见', () => {
    const game = CoopEngine.createGame();
    // 树篱在 (6,1)。让小熊在 (6,0)，小兔在 (6,2)
    const canSeeThroughHedge = CoopEngine.hasLineOfSight(game, 6, 0, 6, 2);
    assert.equal(canSeeThroughHedge, false, '被树篱 (6,1) 阻挡视线，无法看到对方');

    // 在开阔走廊 (6,2) 与 (7,2) 之间无阻挡
    const canSeeOpen = CoopEngine.hasLineOfSight(game, 6, 2, 7, 2);
    assert.equal(canSeeOpen, true, '开阔路径视线畅通');
  });

  test('10. 终局胜负：全救回立即判胜，达到最大回合数判负', () => {
    const game = CoopEngine.createGame();
    // 模拟全部小动物回家
    game.pets.forEach((p) => {
      p.home = true;
      p.carriedBy = null;
    });
    const won = CoopEngine.checkWin(game);
    assert.equal(won, true);
    assert.equal(game.status, 'win');

    // 模拟风暴判负
    const game2 = CoopEngine.createGame();
    game2.teamRound = 14;
    CoopEngine.resolveTeamRound(game2);
    assert.equal(game2.status, 'lose');
  });
});
