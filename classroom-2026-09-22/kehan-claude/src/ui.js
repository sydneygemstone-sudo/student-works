// ui.js —— 太空冒险游戏 UI 模块（纯 DOM + CSS，不碰 three.js）
// 挂载 window.UI，供主逻辑调用。
(function () {
  'use strict';

  var inited = false;
  var els = {}; // 缓存常用 DOM 引用
  var toastTimer = null;
  var flashHitTimer = null;
  var flashIceTimer = null;
  var touchForced = null; // null=自动检测 true/false=强制

  // ---------- 样式注入 ----------
  function injectStyle() {
    var css = ''
      + ':root{'
      + '--ui-glass:rgba(30,22,70,.55);'
      + '--ui-glass-2:rgba(18,14,46,.72);'
      + '--ui-border:rgba(130,190,255,.55);'
      + '--ui-glow:0 0 14px rgba(110,180,255,.55);'
      + '--ui-cyan:#4be8ff;'
      + '--ui-purple:#b892ff;'
      + '--ui-gold:#ffd35c;'
      + '--ui-red:#ff4d6d;'
      + '--ui-green:#5cffa8;'
      + '--ui-text:#eaf2ff;'
      + '--ui-radius:min(3vw,16px);'
      + '}'
      + '#uiRoot{position:fixed;inset:0;z-index:9000;pointer-events:none;'
      + 'font-family:"Trebuchet MS","PingFang SC",system-ui,sans-serif;color:var(--ui-text);'
      + 'user-select:none;-webkit-user-select:none;}'
      + '#uiRoot *{box-sizing:border-box;}'
      + '.ui-glass{background:var(--ui-glass);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);'
      + 'border:1px solid var(--ui-border);border-radius:var(--ui-radius);box-shadow:var(--ui-glow);}'

      /* 左上角：血条 + 冰条 */
      + '#barsWrap{position:absolute;left:min(3vw,18px);top:min(3vw,18px);'
      + 'display:flex;flex-direction:column;gap:min(1.5vw,8px);width:min(56vw,260px);}'
      + '.bar-row{display:flex;align-items:center;gap:min(2vw,8px);padding:min(1.6vw,7px) min(2.2vw,10px);}'
      + '.bar-label{font-size:min(3.6vw,15px);font-weight:bold;width:min(9vw,32px);text-align:center;'
      + 'text-shadow:0 0 6px currentColor;flex-shrink:0;}'
      + '.bar-track{position:relative;flex:1;height:min(3.6vw,16px);border-radius:999px;'
      + 'background:rgba(0,0,0,.4);overflow:hidden;border:1px solid rgba(255,255,255,.25);}'
      + '.bar-fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;transition:width .25s ease;}'
      + '.bar-fill.hp{background:linear-gradient(90deg,#ff7a7a,#ff2d55);}'
      + '.bar-fill.hp.low{background:linear-gradient(90deg,#ff4040,#ff0033);animation:hpBlink .6s infinite;}'
      + '.bar-fill.ice{background:linear-gradient(90deg,#7cf7ff,#2ab8ff);}'
      + '.bar-label.hp{color:var(--ui-red);}'
      + '.bar-label.ice{color:var(--ui-cyan);}'
      + '@keyframes hpBlink{0%,100%{opacity:1;box-shadow:0 0 10px #ff2d55;}50%{opacity:.55;box-shadow:0 0 2px #ff2d55;}}'

      /* 顶部中央：目标文字 */
      + '#objective{position:absolute;left:50%;top:min(3vw,14px);transform:translateX(-50%);'
      + 'padding:min(1.6vw,7px) min(4vw,18px);font-size:min(4vw,16px);font-weight:bold;'
      + 'text-align:center;white-space:nowrap;color:#fff;text-shadow:0 0 8px var(--ui-purple);}'

      /* Boss 血条 */
      + '#bossWrap{position:absolute;left:50%;top:min(11vw,52px);transform:translateX(-50%);'
      + 'width:min(80vw,420px);display:none;flex-direction:column;align-items:center;gap:4px;padding:min(1.8vw,8px) min(3vw,14px);}'
      + '#bossWrap.show{display:flex;}'
      + '#bossName{font-size:min(3.8vw,16px);font-weight:bold;color:var(--ui-gold);text-shadow:0 0 8px rgba(255,211,92,.8);}'
      + '#bossTrack{position:relative;width:100%;height:min(3.2vw,14px);border-radius:999px;'
      + 'background:rgba(0,0,0,.45);overflow:hidden;border:1px solid rgba(255,255,255,.3);}'
      + '#bossFill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;'
      + 'background:linear-gradient(90deg,#ffdf7a,#ff7a3d);transition:width .25s ease;}'

      /* 右上角：关卡小字 */
      + '#stageLabel{position:absolute;right:min(3vw,16px);top:min(3vw,16px);'
      + 'font-size:min(3vw,13px);color:var(--ui-cyan);opacity:.9;padding:min(1.2vw,5px) min(2.4vw,10px);}'

      /* 右下角：弹药/能量数字 */
      + '#bulletsWrap{position:absolute;right:min(3vw,16px);bottom:min(24vw,150px);'
      + 'display:flex;align-items:center;gap:6px;padding:min(1.4vw,6px) min(2.6vw,12px);}'
      + '#bulletsWrap .ico{font-size:min(4vw,17px);}'
      + '#bulletsVal{font-size:min(4.4vw,19px);font-weight:bold;color:var(--ui-gold);min-width:1.4em;text-align:center;}'

      /* 提示 toast */
      + '#toast{position:absolute;left:50%;top:22%;transform:translate(-50%,-8px);'
      + 'padding:min(2.2vw,10px) min(5vw,22px);font-size:min(4.2vw,18px);font-weight:bold;'
      + 'text-align:center;opacity:0;transition:opacity .25s ease,transform .25s ease;white-space:nowrap;max-width:88vw;overflow:hidden;text-overflow:ellipsis;}'
      + '#toast.show{opacity:1;transform:translate(-50%,0);}'

      /* 底部提示 */
      + '#hint{position:absolute;left:50%;bottom:min(4vw,18px);transform:translateX(-50%);'
      + 'padding:min(1.6vw,7px) min(4vw,16px);font-size:min(3.4vw,14px);text-align:center;'
      + 'color:#dfe9ff;max-width:92vw;line-height:1.5;}'

      /* 准星 */
      + '#crosshair{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);'
      + 'width:min(6vw,28px);height:min(6vw,28px);display:none;}'
      + '#crosshair.show{display:block;}'
      + '#crosshair:before,#crosshair:after{content:"";position:absolute;background:var(--ui-cyan);'
      + 'box-shadow:0 0 6px var(--ui-cyan);}'
      + '#crosshair:before{left:50%;top:0;bottom:0;width:2px;transform:translateX(-50%);}'
      + '#crosshair:after{top:50%;left:0;right:0;height:2px;transform:translateY(-50%);}'

      /* 全屏受伤/冰冻闪光 */
      + '#flashHit,#flashIce{position:absolute;inset:0;opacity:0;pointer-events:none;}'
      + '#flashHit{background:radial-gradient(circle,rgba(255,0,60,0) 40%,rgba(255,0,60,.55) 100%);}'
      + '#flashIce{background:radial-gradient(circle,rgba(0,220,255,0) 40%,rgba(0,220,255,.5) 100%);}'
      + '#flashHit.on{animation:flashAnim .35s ease-out;}'
      + '#flashIce.on{animation:flashAnim .35s ease-out;}'
      + '@keyframes flashAnim{0%{opacity:1;}100%{opacity:0;}}'

      /* 加载遮罩 */
      + '#loadingOverlay{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;'
      + 'gap:min(4vw,18px);background:rgba(8,6,24,.88);pointer-events:auto;}'
      + '#loadingOverlay.show{display:flex;}'
      + '.ui-spinner{width:min(12vw,54px);height:min(12vw,54px);border-radius:50%;'
      + 'border:min(1.2vw,5px) solid rgba(140,160,255,.25);border-top-color:var(--ui-cyan);'
      + 'box-shadow:0 0 16px rgba(75,232,255,.5);animation:spin 0.9s linear infinite;}'
      + '@keyframes spin{to{transform:rotate(360deg);}}'
      + '#loadingOverlay .txt{font-size:min(4.2vw,18px);color:var(--ui-cyan);text-shadow:0 0 8px var(--ui-cyan);}'

      /* 卡片遮罩 */
      + '#cardOverlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;'
      + 'background:rgba(6,4,20,.72);pointer-events:auto;padding:4vw;}'
      + '#cardOverlay.show{display:flex;}'
      + '#cardBox{width:min(92vw,440px);max-height:90vh;overflow:auto;padding:min(6vw,28px) min(6vw,26px);'
      + 'display:flex;flex-direction:column;align-items:center;gap:min(3vw,14px);text-align:center;'
      + 'background:var(--ui-glass-2);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);'
      + 'border:1px solid var(--ui-border);border-radius:min(4vw,20px);'
      + 'box-shadow:0 0 30px rgba(120,150,255,.35),0 0 70px rgba(90,60,200,.25) inset;}'
      + '#cardTitle{font-size:min(8vw,34px);font-weight:900;letter-spacing:2px;color:#bfe0ff;'
      + 'text-shadow:0 0 10px var(--ui-purple),0 0 22px rgba(120,150,255,.7);}'
      + '#cardOverlay.win #cardTitle{color:var(--ui-gold);text-shadow:0 0 12px #ffd35c,0 0 26px rgba(255,211,92,.8);}'
      + '#cardOverlay.lose #cardTitle{color:var(--ui-red);text-shadow:0 0 12px #ff4d6d,0 0 26px rgba(255,77,109,.8);}'
      + '#cardSub{font-size:min(4vw,16px);color:#cfe0ff;opacity:.9;margin-top:-6px;}'
      + '#cardLines{list-style:none;padding:0;margin:min(2vw,8px) 0;width:100%;'
      + 'display:flex;flex-direction:column;gap:min(1.8vw,8px);}'
      + '#cardLines li{padding:min(2vw,9px) min(3vw,12px);border-radius:min(2.4vw,10px);'
      + 'background:rgba(120,150,255,.12);border:1px solid rgba(140,170,255,.3);'
      + 'font-size:min(3.6vw,15px);color:#eaf2ff;}'
      + '#cardBtn{margin-top:min(2vw,8px);padding:min(3.2vw,14px) min(9vw,38px);border:none;cursor:pointer;'
      + 'font-family:inherit;font-size:min(4.6vw,19px);font-weight:bold;color:#0a0a1a;border-radius:999px;'
      + 'background:linear-gradient(135deg,var(--ui-cyan),var(--ui-purple));'
      + 'box-shadow:0 0 18px rgba(120,180,255,.7);animation:btnPulse 1.6s ease-in-out infinite;'
      + 'pointer-events:auto;transition:transform .15s ease;}'
      + '#cardBtn:hover{transform:scale(1.06);}'
      + '#cardBtn:active{transform:scale(.96);}'
      + '@keyframes btnPulse{0%,100%{box-shadow:0 0 12px rgba(120,180,255,.55);}50%{box-shadow:0 0 26px rgba(120,180,255,.95);}}'

      /* 触屏摇杆 */
      + '.ui-touch-el{display:none;}'
      + '@media (pointer:coarse){.ui-touch-el{display:block;}.ui-touch-el.ui-flex{display:flex;}}'
      + 'body.ui-touch-on .ui-touch-el{display:block !important;}'
      + 'body.ui-touch-on .ui-touch-el.ui-flex{display:flex !important;}'
      + 'body.ui-touch-off .ui-touch-el{display:none !important;}'
      + '#stickZone{position:absolute;left:0;bottom:0;width:45vw;height:45vh;pointer-events:auto;}'
      + '#stick{position:absolute;width:min(30vw,130px);height:min(30vw,130px);border-radius:50%;'
      + 'left:0;top:0;opacity:0;background:rgba(120,150,255,.18);border:2px solid rgba(150,190,255,.6);'
      + 'box-shadow:0 0 14px rgba(120,180,255,.5);transform:translate(-50%,-50%);transition:opacity .12s ease;}'
      + '#stick.on{opacity:1;}'
      + '#stickNub{position:absolute;left:50%;top:50%;width:42%;height:42%;border-radius:50%;'
      + 'background:radial-gradient(circle,#bfe0ff,#4be8ff);box-shadow:0 0 12px rgba(75,232,255,.8);'
      + 'transform:translate(-50%,-50%);}'

      /* 触屏按钮区 */
      + '#touchBtns{position:absolute;right:min(3vw,16px);bottom:min(3vw,16px);'
      + 'align-items:flex-end;gap:min(3vw,14px);pointer-events:none;}'
      + '.ui-btn-round{pointer-events:auto;width:min(18vw,72px);height:min(18vw,72px);border-radius:50%;'
      + 'display:flex;align-items:center;justify-content:center;font-size:min(4vw,16px);font-weight:bold;'
      + 'color:#fff;border:2px solid rgba(255,255,255,.5);user-select:none;-webkit-user-select:none;'
      + 'box-shadow:0 0 14px rgba(0,0,0,.4);}'
      + '#btnFire{background:radial-gradient(circle,#ff8a5c,#ff3d3d);width:min(22vw,86px);height:min(22vw,86px);}'
      + '#btnIce{background:radial-gradient(circle,#8af5ff,#1fb6e0);}'
      + '#btnJump{background:radial-gradient(circle,#c9a8ff,#8a5cff);}'
      + '.ui-btn-round:active{transform:scale(.9);}'

      /* 手机竖屏微调：把血条/条状信息略微缩窄，避免溢出 */
      + '@media (max-aspect-ratio:1/1){#barsWrap{width:min(60vw,240px);}}'
      ;
    var style = document.createElement('style');
    style.id = 'uiStyleTag';
    style.textContent = css;
    document.head.appendChild(style);var device=document.createElement('link');device.rel='stylesheet';device.href='../device-kit.css?v=20260923-r4';document.head.appendChild(device);
  }

  // ---------- DOM 结构构建 ----------
  function buildDom() {
    var root = document.createElement('div');
    root.id = 'uiRoot';
    root.innerHTML = ''
      + '<div id="barsWrap">'
      + '  <div class="bar-row ui-glass"><span class="bar-label hp">HP</span>'
      + '    <div class="bar-track"><div id="hpFill" class="bar-fill hp" style="width:100%"></div></div></div>'
      + '  <div class="bar-row ui-glass"><span class="bar-label ice">冰</span>'
      + '    <div class="bar-track"><div id="iceFill" class="bar-fill ice" style="width:100%"></div></div></div>'
      + '</div>'
      + '<div id="objective" class="ui-glass"></div>'
      + '<div id="bossWrap" class="ui-glass"><div id="bossName"></div>'
      + '  <div id="bossTrack"><div id="bossFill" style="width:100%"></div></div></div>'
      + '<div id="stageLabel" class="ui-glass"></div>'
      + '<div id="bulletsWrap" class="ui-glass"><span class="ico">☄️</span><span id="bulletsVal">0</span></div>'
      + '<div id="toast" class="ui-glass"></div>'
      + '<div id="hint" class="ui-glass"></div>'
      + '<div id="crosshair"></div>'
      + '<div id="flashHit"></div>'
      + '<div id="flashIce"></div>'
      + '<div id="loadingOverlay"><div class="ui-spinner"></div><div class="txt">加载中...</div></div>'
      + '<div id="cardOverlay">'
      + '  <div id="cardBox">'
      + '    <div id="cardTitle"></div>'
      + '    <div id="cardSub"></div>'
      + '    <ul id="cardLines"></ul>'
      + '    <button id="cardBtn" type="button"></button>'
      + '  </div>'
      + '</div>'
      + '<div id="stickZone" class="ui-touch-el"><div id="stick"><div id="stickNub"></div></div></div>'
      + '<div id="touchBtns" class="ui-touch-el ui-flex">'
      + '  <button id="btnIce" class="ui-btn-round" type="button">冰冻</button>'
      + '  <button id="btnFire" class="ui-btn-round" type="button">射击</button>'
      + '  <button id="btnJump" class="ui-btn-round" type="button">跳</button>'
      + '</div>'
      ;
    document.body.appendChild(root);

    // 缓存引用
    els.hpFill = root.querySelector('#hpFill');
    els.iceFill = root.querySelector('#iceFill');
    els.objective = root.querySelector('#objective');
    els.bossWrap = root.querySelector('#bossWrap');
    els.bossName = root.querySelector('#bossName');
    els.bossFill = root.querySelector('#bossFill');
    els.stageLabel = root.querySelector('#stageLabel');
    els.bulletsVal = root.querySelector('#bulletsVal');
    els.toast = root.querySelector('#toast');
    els.hint = root.querySelector('#hint');
    els.crosshair = root.querySelector('#crosshair');
    els.flashHit = root.querySelector('#flashHit');
    els.flashIce = root.querySelector('#flashIce');
    els.loadingOverlay = root.querySelector('#loadingOverlay');
    els.cardOverlay = root.querySelector('#cardOverlay');
    els.cardTitle = root.querySelector('#cardTitle');
    els.cardSub = root.querySelector('#cardSub');
    els.cardLines = root.querySelector('#cardLines');
    els.cardBtn = root.querySelector('#cardBtn');
  }

  // ---------- 工具函数 ----------
  function clampPct(cur, max) {
    if (!max || max <= 0) return 0;
    var p = (cur / max) * 100;
    if (p < 0) p = 0;
    if (p > 100) p = 100;
    return p;
  }

  function detectTouch() {
    try {
      return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
    } catch (e) {
      return false;
    }
  }

  // ---------- 对外 API ----------
  var UI = {
    init: function () {
      if (inited) return;
      inited = true;
      injectStyle();
      buildDom();
      // 默认根据设备自动判断一次触屏显隐（可被 setTouch 强制覆盖）
      if (detectTouch()) {
        UI.setTouch(true);
      }
    },

    setHP: function (cur, max) {
      if (!els.hpFill) return;
      var p = clampPct(cur, max);
      els.hpFill.style.width = p + '%';
      if (p < 30) {
        els.hpFill.classList.add('low');
      } else {
        els.hpFill.classList.remove('low');
      }
    },

    setIce: function (cur, max) {
      if (!els.iceFill) return;
      els.iceFill.style.width = clampPct(cur, max) + '%';
    },

    setBossHP: function (name, cur, max) {
      if (!els.bossWrap) return;
      els.bossName.textContent = name || '';
      els.bossFill.style.width = clampPct(cur, max) + '%';
      els.bossWrap.classList.add('show');
    },

    hideBossHP: function () {
      if (!els.bossWrap) return;
      els.bossWrap.classList.remove('show');
    },

    setObjective: function (text) {
      if (!els.objective) return;
      els.objective.textContent = text || '';
    },

    setStage: function (text) {
      if (!els.stageLabel) return;
      els.stageLabel.textContent = text || '';
    },

    toast: function (text, ms) {
      if (!els.toast) return;
      if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
      }
      els.toast.textContent = text || '';
      // 强制重排以便重新触发过渡
      void els.toast.offsetWidth;
      els.toast.classList.add('show');
      var dur = (typeof ms === 'number') ? ms : 2000;
      toastTimer = setTimeout(function () {
        els.toast.classList.remove('show');
        toastTimer = null;
      }, dur);
    },

    setHint: function (html) {
      if (!els.hint) return;
      els.hint.innerHTML = html || '';
    },

    hitFlash: function () {
      if (!els.flashHit) return;
      els.flashHit.classList.remove('on');
      void els.flashHit.offsetWidth;
      els.flashHit.classList.add('on');
      if (flashHitTimer) clearTimeout(flashHitTimer);
      flashHitTimer = setTimeout(function () {
        els.flashHit.classList.remove('on');
      }, 400);
    },

    iceFlash: function () {
      if (!els.flashIce) return;
      els.flashIce.classList.remove('on');
      void els.flashIce.offsetWidth;
      els.flashIce.classList.add('on');
      if (flashIceTimer) clearTimeout(flashIceTimer);
      flashIceTimer = setTimeout(function () {
        els.flashIce.classList.remove('on');
      }, 400);
    },

    setCrosshair: function (on) {
      if (!els.crosshair) return;
      if (on) {
        els.crosshair.classList.add('show');
      } else {
        els.crosshair.classList.remove('show');
      }
    },

    showCard: function (opts) {
      opts = opts || {};
      if (!els.cardOverlay) return;
      els.cardTitle.textContent = opts.title || '';
      els.cardSub.textContent = opts.sub || '';
      els.cardLines.innerHTML = '';
      var lines = opts.lines || [];
      for (var i = 0; i < lines.length; i++) {
        var li = document.createElement('li');
        li.innerHTML = lines[i];
        els.cardLines.appendChild(li);
      }
      els.cardBtn.textContent = opts.btn || '开始';
      els.cardOverlay.classList.remove('win', 'lose');
      if (opts.cls === 'win' || opts.cls === 'lose') {
        els.cardOverlay.classList.add(opts.cls);
      }
      els.cardOverlay.classList.add('show');
    },

    hideCard: function () {
      if (!els.cardOverlay) return;
      els.cardOverlay.classList.remove('show');
    },

    setLoading: function (on) {
      if (!els.loadingOverlay) return;
      if (on) {
        els.loadingOverlay.classList.add('show');
      } else {
        els.loadingOverlay.classList.remove('show');
      }
    },

    setBullets: function (n) {
      if (!els.bulletsVal) return;
      els.bulletsVal.textContent = (typeof n === 'number') ? String(n) : (n || '0');
    },

    setTouch: function (on) {
      touchForced = !!on;
      document.body.classList.remove('ui-touch-on', 'ui-touch-off');
      document.body.classList.add(on ? 'ui-touch-on' : 'ui-touch-off');
    }
  };

  window.UI = UI;
})();
