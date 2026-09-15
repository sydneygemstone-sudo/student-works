/**
 * Naomi《小动物回家》双 iPad 联机探索版 —— 客户端应用主逻辑
 */
(() => {
  'use strict';

  // 状态变量
  let ws = null;
  let render3d = null;
  let storyTheatre = null;

  let currentRoomCode = null;
  let myPlayerId = null;
  let myRoleKey = null;
  let sessionToken = null;
  let gameState = null;
  let requestCounter = 0;

  // DOM 元素引用
  const $ = (id) => document.getElementById(id);

  // 初始化入口
  window.addEventListener('DOMContentLoaded', () => {
    render3d = new Render3D('canvasContainer');
    storyTheatre = new StoryTheatre();

    setupLobbyEvents();
    setupGameControlEvents();
    setupKeyboardShortcuts();

    // 检查 URL 中是否有 ?room=XXXX 传参
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      $('inputJoinRoomCode').value = roomFromUrl.toUpperCase();
      selectLobbyTab('join');
    }

    // 检查 sessionStorage 是否有未结对局
    const savedToken = sessionStorage.getItem('naomi_coop_token');
    const savedRoom = sessionStorage.getItem('naomi_coop_room');
    if (savedToken && savedRoom) {
      console.log(`[Auto-reconnect] 发现本地缓存会话，尝试恢复房间 ${savedRoom}`);
      connectWebSocket(() => {
        sendWs({
          type: 'JOIN_ROOM',
          roomCode: savedRoom,
          sessionToken: savedToken,
        });
      });
    }
  });

  // WebSocket 连接构建（自适应 host 与 protocol，iPad 无缝连入）
  function connectWebSocket(onOpenCallback) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (onOpenCallback) onOpenCallback();
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;

    console.log(`[WS] 连接局域网服务: ${wsUrl}`);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS] 连接成功建立');
      if (onOpenCallback) onOpenCallback();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (e) {
        console.error('[WS Parse Error]:', e);
      }
    };

    ws.onclose = () => {
      console.warn('[WS] 连接断开，3秒后自动尝试重连……');
      updateTeammateStatus('disconnected');
      setTimeout(() => {
        if (currentRoomCode && sessionToken) {
          connectWebSocket(() => {
            sendWs({
              type: 'JOIN_ROOM',
              roomCode: currentRoomCode,
              sessionToken,
            });
          });
        }
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS Error]:', err);
    };
  }

  function sendWs(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      console.warn('[WS] 未连接，暂缓发送:', msg);
    }
  }

  // 大厅事件处理
  function setupLobbyEvents() {
    // 角色选择
    const bearCard = $('roleBear');
    const bunnyCard = $('roleBunny');

    bearCard.onclick = () => {
      bearCard.classList.add('selected');
      bunnyCard.classList.remove('selected');
      $('inputCreatorName').value = '小熊';
    };

    bunnyCard.onclick = () => {
      bunnyCard.classList.add('selected');
      bearCard.classList.remove('selected');
      $('inputCreatorName').value = 'Naomi';
    };

    // 选项卡切换 (创建房间 / 加入房间)
    $('tabBtnCreate').onclick = () => selectLobbyTab('create');
    $('tabBtnJoin').onclick = () => selectLobbyTab('join');

    // 创建房间按钮
    $('btnCreateRoomSubmit').onclick = () => {
      const isBunny = bunnyCard.classList.contains('selected');
      const roleKey = isBunny ? 'BUNNY' : 'BEAR';
      const name = $('inputCreatorName').value.trim() || (isBunny ? 'Naomi' : '小熊');

      connectWebSocket(() => {
        sendWs({
          type: 'CREATE_ROOM',
          roleKey,
          playerName: name,
        });
      });
    };

    // 加入房间按钮
    $('btnJoinRoomSubmit').onclick = () => {
      const code = $('inputJoinRoomCode').value.trim().toUpperCase();
      const name = $('inputJoinName').value.trim();

      if (!code) {
        alert('请输入4位房间号');
        return;
      }

      connectWebSocket(() => {
        sendWs({
          type: 'JOIN_ROOM',
          roomCode: code,
          playerName: name,
        });
      });
    };

    // 复制房间链接
    $('btnCopyRoomLink').onclick = () => {
      const shareUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomCode}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          alert('已复制房间链接！发送给另一台 iPad 即可直接加入。');
        });
      } else {
        alert(`房间链接：${shareUrl}`);
      }
    };

    // 准备完毕出发
    $('btnStartMission').onclick = () => {
      $('modalWaitingRoom').classList.add('hidden');
      storyTheatre.play('intro');
    };
  }

  function selectLobbyTab(tab) {
    if (tab === 'create') {
      $('tabBtnCreate').classList.add('selected');
      $('tabBtnJoin').classList.remove('selected');
      $('panelCreateRoom').classList.remove('hidden');
      $('panelJoinRoom').classList.add('hidden');
    } else {
      $('tabBtnJoin').classList.add('selected');
      $('tabBtnCreate').classList.remove('selected');
      $('panelJoinRoom').classList.remove('hidden');
      $('panelCreateRoom').classList.add('hidden');
    }
  }

  // 接收服务端消息
  function handleServerMessage(msg) {
    switch (msg.type) {
      case 'ROOM_CREATED':
      case 'ROOM_JOINED': {
        currentRoomCode = msg.roomCode;
        myPlayerId = msg.playerId;
        myRoleKey = msg.roleKey;
        sessionToken = msg.sessionToken;

        sessionStorage.setItem('naomi_coop_token', sessionToken);
        sessionStorage.setItem('naomi_coop_room', currentRoomCode);

        // 关闭主大厅弹窗
        $('modalLobby').classList.add('hidden');

        // 检查房间是否两人就绪
        const bothConnected = msg.state.players[0].connected && msg.state.players[1].connected;
        if (bothConnected) {
          $('modalWaitingRoom').classList.add('hidden');
        } else {
          // 显示房间等待与分享弹窗
          $('displayRoomCode').textContent = currentRoomCode;
          $('shareUrlText').textContent = `${window.location.origin}${window.location.pathname}?room=${currentRoomCode}`;
          $('modalWaitingRoom').classList.remove('hidden');
        }

        updateGameState(msg.state);
        break;
      }

      case 'ROOM_STATE': {
        updateGameState(msg.state);
        const bothConnected = msg.state.players[0].connected && msg.state.players[1].connected;
        if (bothConnected) {
          $('modalWaitingRoom').classList.add('hidden');
        }
        break;
      }

      case 'ACTION_RESULT': {
        if (!msg.success) {
          // 提示错误或阻挡信息（Naomi 的石头箭头）
          if (msg.reason === 'blocked' && msg.hint) {
            showStoneArrowHint(msg.hint);
          } else {
            showBannerNotification(msg.error || '动作无法执行');
          }
        }
        if (msg.state) {
          updateGameState(msg.state);
        }
        break;
      }

      case 'PLAYER_DISCONNECTED': {
        updateGameState(msg.state);
        showBannerNotification(`队友 ${msg.playerName || ''} 掉线，等待重连恢复中……`);
        break;
      }

      case 'PLAYER_RECONNECTED': {
        updateGameState(msg.state);
        showBannerNotification(`队友已重新连入！双方已重置准备状态，继续救援！`);
        break;
      }

      case 'ERROR': {
        alert(msg.error);
        break;
      }
    }
  }

  // 游戏操作事件绑定
  function setupGameControlEvents() {
    $('btnForward').onclick = () => submitAction('FORWARD');
    $('btnBackward').onclick = () => submitAction('BACKWARD');
    $('btnTurnLeft').onclick = () => submitAction('TURN_LEFT');
    $('btnTurnRight').onclick = () => submitAction('TURN_RIGHT');

    $('btnGive').onclick = () => submitAction('GIVE');
    $('btnSupport').onclick = () => submitAction('SUPPORT');
    $('btnBoost').onclick = () => submitAction('BOOST');

    $('btnToggleReady').onclick = () => {
      if (!gameState) return;
      const myP = gameState.players[myPlayerId];
      if (myP.ready) {
        submitAction('UNREADY');
      } else {
        submitAction('READY');
      }
    };
  }

  // 电脑键盘开发辅助
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key) {
        case 'w':
        case 'ArrowUp':
          submitAction('FORWARD');
          break;
        case 's':
        case 'ArrowDown':
          submitAction('BACKWARD');
          break;
        case 'a':
        case 'q':
        case 'ArrowLeft':
          submitAction('TURN_LEFT');
          break;
        case 'd':
        case 'e':
        case 'ArrowRight':
          submitAction('TURN_RIGHT');
          break;
        case 'g':
          submitAction('GIVE');
          break;
        case 'h':
          submitAction('SUPPORT');
          break;
        case 'b':
          submitAction('BOOST');
          break;
        case ' ':
          $('btnToggleReady').click();
          break;
      }
    });
  }

  // 提交带 requestId 与 roundId 的动作指令
  function submitAction(action) {
    if (!currentRoomCode || !sessionToken || !gameState) return;

    requestCounter++;
    const reqId = `req_${myPlayerId}_${Date.now()}_${requestCounter}`;

    sendWs({
      type: 'ACTION',
      roomCode: currentRoomCode,
      sessionToken,
      requestId: reqId,
      roundId: gameState.teamRound,
      action,
    });
  }

  // Naomi 的石头箭头提示展示
  function showStoneArrowHint(hint) {
    const banner = $('hintBanner');
    banner.textContent = `⚠️ ${hint.message}`;
    banner.classList.remove('hidden');

    const myP = gameState.players[myPlayerId];
    render3d.showObstacleArrow(myP.x, myP.y, myP.heading, hint);

    setTimeout(() => {
      banner.classList.add('hidden');
    }, 3200);
  }

  function showBannerNotification(text) {
    const banner = $('hintBanner');
    banner.textContent = text;
    banner.classList.remove('hidden');
    setTimeout(() => {
      banner.classList.add('hidden');
    }, 2800);
  }

  // 更新整个界面状态
  function updateGameState(state) {
    gameState = state;
    render3d.syncGameState(state, myPlayerId);

    // 1. 顶部共同回合与天气
    $('roundDisplay').textContent = `第 ${state.teamRound} / ${state.maxTeamRounds} 共同回合`;
    const nextThunderIn = state.thunderEvery - (state.teamRound % state.thunderEvery);
    $('thunderDisplay').textContent = `⚡ 雷雨倒计时: ${nextThunderIn === state.thunderEvery ? '本回合触发' : `${nextThunderIn} 回合`}`;
    $('courageDisplay').textContent = `✨ 勇气: ${state.energy}`;
    $('shieldDisplay').textContent = `🛡️ 庇护: ${state.shield} 层`;

    // 2. 本人状态卡片
    const myP = state.players[myPlayerId];
    $('myAvatar').textContent = myP.emoji;
    $('myName').textContent = myP.name;
    $('myRoleBadge').textContent = myP.roleKey === 'BEAR' ? '小熊 (2步/抱2只)' : '小兔 (3步/抱1只)';
    $('myCarriedBadge').textContent = `抱有: ${myP.carriedCount} / ${myP.carry}`;

    // AP 点阵
    const myApContainer = $('myApPills');
    myApContainer.innerHTML = '';
    const maxMoves = myP.moves + (myP.boosted ? 2 : 0);
    for (let i = 0; i < maxMoves; i++) {
      const dot = document.createElement('span');
      dot.className = `ap-dot ${i < myP.ap ? '' : 'empty'}`;
      myApContainer.appendChild(dot);
    }

    // 本人状态徽章
    const myStatusBadge = $('myStatusBadge');
    if (myP.ready) {
      myStatusBadge.className = 'status-badge ready';
      myStatusBadge.textContent = '已就绪 (等待队友)';
    } else if (myP.resting) {
      myStatusBadge.className = 'status-badge ready';
      myStatusBadge.textContent = '休息中';
    } else {
      myStatusBadge.className = 'status-badge acting';
      myStatusBadge.textContent = `行动中 (${myP.ap} 步可用)`;
    }

    // 3. 队友状态卡片
    const mateId = 1 - myPlayerId;
    const mateP = state.players[mateId];
    $('mateAvatar').textContent = mateP.emoji;
    $('mateName').textContent = mateP.name;
    $('mateRoleBadge').textContent = mateP.roleKey === 'BEAR' ? '小熊 (2步/抱2只)' : '小兔 (3步/抱1只)';
    $('mateCarriedBadge').textContent = `抱有: ${mateP.carriedCount} / ${mateP.carry}`;

    const mateApContainer = $('mateApPills');
    mateApContainer.innerHTML = '';
    const mateMaxMoves = mateP.moves + (mateP.boosted ? 2 : 0);
    for (let i = 0; i < mateMaxMoves; i++) {
      const dot = document.createElement('span');
      dot.className = `ap-dot ${i < mateP.ap ? '' : 'empty'}`;
      mateApContainer.appendChild(dot);
    }

    const mateStatusBadge = $('mateStatusBadge');
    if (!mateP.connected) {
      mateStatusBadge.className = 'status-badge disconnected';
      mateStatusBadge.textContent = '暂时离线';
    } else if (mateP.ready) {
      mateStatusBadge.className = 'status-badge ready';
      mateStatusBadge.textContent = '已就绪 (等待我)';
    } else if (mateP.resting) {
      mateStatusBadge.className = 'status-badge ready';
      mateStatusBadge.textContent = '休息中';
    } else {
      mateStatusBadge.className = 'status-badge acting';
      mateStatusBadge.textContent = '正在行动';
    }

    // 4. 按钮可用性控制
    const isResting = myP.resting || myP.skipTurns > 0;
    $('btnForward').disabled = myP.ready || isResting || myP.ap < 1;
    $('btnBackward').disabled = myP.ready || isResting || myP.ap < 1;
    $('btnTurnLeft').disabled = myP.ready || isResting;
    $('btnTurnRight').disabled = myP.ready || isResting;

    // 递给队友按钮状态
    const canGive =
      !myP.ready &&
      !mateP.ready &&
      myP.carriedCount > 0 &&
      mateP.carriedCount < mateP.carry &&
      Math.abs(myP.x - mateP.x) + Math.abs(myP.y - mateP.y) <= 1;
    $('btnGive').disabled = !canGive;

    // 守护家园按钮状态
    const atHome = myP.x === state.home.x && myP.y === state.home.y;
    const canSupport = !myP.ready && atHome && myP.ap >= 1 && !myP.supported && state.shield < 2;
    $('btnSupport').disabled = !canSupport;

    // 勇气加步按钮状态
    const canBoost = !myP.ready && !myP.boosted && state.energy >= 2 && !isResting;
    $('btnBoost').disabled = !canBoost;

    // 结束本回合 / 继续行动 大按钮切换
    const readyBtn = $('btnToggleReady');
    if (myP.ready) {
      readyBtn.className = 'btn-round-ready state-unready';
      readyBtn.innerHTML = '<span>↩️</span> 继续行动';
    } else {
      readyBtn.className = 'btn-round-ready state-ready';
      readyBtn.innerHTML = '<span>✅</span> 结束本回合';
    }

    // 5. 胜负检测与弹窗
    if (state.status === 'win') {
      $('modalWin').classList.remove('hidden');
      storyTheatre.play('ending');
    } else if (state.status === 'lose') {
      $('modalLose').classList.remove('hidden');
    }
  }

  function updateTeammateStatus(status) {
    const badge = $('mateStatusBadge');
    if (badge && status === 'disconnected') {
      badge.className = 'status-badge disconnected';
      badge.textContent = '网络断开，重连中';
    }
  }
})();
