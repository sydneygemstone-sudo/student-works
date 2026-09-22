// audio.js —— 纯 Web Audio API 程序化音效模块
// 挂载 window.SFX，零外部音频文件，所有声音实时合成
(function () {
  'use strict';

  var ctx = null;          // AudioContext
  var masterGain = null;   // 主音量节点
  var muted = false;       // 静音状态
  var engineNodes = null;  // 引擎循环用到的节点组
  var musicNodes = null;   // 氛围音节点组
  var noiseBufferCache = null; // 白噪声 buffer 缓存

  // ---------- 基础工具 ----------

  function now() {
    return ctx ? ctx.currentTime : 0;
  }

  function safeStop(node, t) {
    try { node.stop(t); } catch (e) {}
  }

  function safeDisconnect(node) {
    try { node.disconnect(); } catch (e) {}
  }

  // 生成（并缓存）一段 2 秒的白噪声 buffer，播放时随机截取片段
  function getNoiseBuffer() {
    if (!ctx) return null;
    if (noiseBufferCache) return noiseBufferCache;
    var length = Math.max(1, Math.floor(ctx.sampleRate * 2));
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBufferCache = buffer;
    return buffer;
  }

  // 播放一个可带频率滑音的振荡器音效
  // opts: {type, f0, f1, dur, vol, attack, delay}
  function playToneSlide(opts) {
    if (!ctx) return;
    var t0 = now() + (opts.delay || 0);
    var dur = opts.dur;
    var osc = ctx.createOscillator();
    osc.type = opts.type || 'square';
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    var vol = opts.vol != null ? opts.vol : 1;
    var attack = opts.attack != null ? opts.attack : 0.005;

    osc.frequency.setValueAtTime(Math.max(opts.f0, 1), t0);
    if (opts.f1 != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(opts.f1, 1), t0 + dur);
    }

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    osc.start(t0);
    safeStop(osc, t0 + dur + 0.05);
    osc.onended = function () {
      safeDisconnect(osc);
      safeDisconnect(gain);
    };
  }

  // 播放一段过滤后的白噪声
  // opts: {dur, vol, attack, delay, filterType, filterFreq, filterFreqTo, filterQ}
  function playNoise(opts) {
    if (!ctx) return;
    var buf = getNoiseBuffer();
    if (!buf) return;
    var t0 = now() + (opts.delay || 0);
    var dur = opts.dur;

    var src = ctx.createBufferSource();
    src.buffer = buf;

    var gain = ctx.createGain();
    var vol = opts.vol != null ? opts.vol : 1;
    var attack = opts.attack != null ? opts.attack : 0.005;

    var outNode = src;
    var filter = null;
    if (opts.filterType) {
      filter = ctx.createBiquadFilter();
      filter.type = opts.filterType;
      filter.frequency.setValueAtTime(opts.filterFreq || 1000, t0);
      if (opts.filterFreqTo != null) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(opts.filterFreqTo, 10), t0 + dur);
      }
      if (opts.filterQ != null) filter.Q.value = opts.filterQ;
      src.connect(filter);
      filter.connect(gain);
    } else {
      src.connect(gain);
    }
    gain.connect(masterGain);

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    var maxOffset = Math.max(0, buf.duration - dur - 0.05);
    var offset = Math.random() * maxOffset;
    src.start(t0, offset, dur + 0.05);
    safeStop(src, t0 + dur + 0.06);
    src.onended = function () {
      safeDisconnect(src);
      if (filter) safeDisconnect(filter);
      safeDisconnect(gain);
    };
  }

  // ---------- 各个音效实现（每个音量再乘以调用方传入的 vol）----------

  function sfxShoot(vol) {
    // 激光枪：短促下滑方波 "piu"
    playToneSlide({ type: 'square', f0: 1200, f1: 300, dur: 0.12, vol: 0.5 * vol, attack: 0.002 });
  }

  function sfxIce(vol) {
    // 冰魔法：上滑清脆正弦 + 高频噪声，冷冽感
    playToneSlide({ type: 'sine', f0: 600, f1: 2000, dur: 0.25, vol: 0.4 * vol, attack: 0.01 });
    playNoise({ dur: 0.2, vol: 0.15 * vol, attack: 0.02, delay: 0.02, filterType: 'highpass', filterFreq: 4000 });
  }

  function sfxFreeze(vol) {
    // 火球被冻住：两声玻璃脆响 + 短促高频噪声，模拟混响感
    playToneSlide({ type: 'sine', f0: 2400, f1: 1800, dur: 0.15, vol: 0.35 * vol, attack: 0.001 });
    playToneSlide({ type: 'sine', f0: 3200, f1: 2600, dur: 0.2, vol: 0.25 * vol, attack: 0.001, delay: 0.03 });
    playNoise({ dur: 0.12, vol: 0.2 * vol, attack: 0.001, filterType: 'bandpass', filterFreq: 5000, filterQ: 8 });
  }

  function sfxFireball(vol) {
    // 怪物吐火球：低沉的 whoosh 噪声（低通滤波下滑）
    playNoise({ dur: 0.4, vol: 0.45 * vol, attack: 0.05, filterType: 'lowpass', filterFreq: 1200, filterFreqTo: 200 });
  }

  function sfxBigfire(vol) {
    // Boss 超大火球：更低更长的轰鸣
    playNoise({ dur: 0.9, vol: 0.55 * vol, attack: 0.08, filterType: 'lowpass', filterFreq: 800, filterFreqTo: 100 });
    playToneSlide({ type: 'sawtooth', f0: 120, f1: 50, dur: 0.9, vol: 0.3 * vol, attack: 0.05 });
  }

  function sfxHit(vol) {
    // 打中怪物：短促噪声爆 + 高频点击
    playNoise({ dur: 0.08, vol: 0.5 * vol, attack: 0.001, filterType: 'bandpass', filterFreq: 2000, filterQ: 1 });
    playToneSlide({ type: 'square', f0: 1800, f1: 1200, dur: 0.04, vol: 0.3 * vol, attack: 0.001, delay: 0.01 });
  }

  function sfxHurt(vol) {
    // 玩家受伤：低沉粗糙的下滑音（锯齿波模拟失真）+ 低频噪声
    playToneSlide({ type: 'sawtooth', f0: 300, f1: 80, dur: 0.35, vol: 0.4 * vol, attack: 0.005 });
    playNoise({ dur: 0.15, vol: 0.15 * vol, attack: 0.005, filterType: 'lowpass', filterFreq: 500 });
  }

  function sfxExplode(vol) {
    // 爆炸：白噪声包络（快速起音）+ 低频轰
    playNoise({ dur: 0.6, vol: 0.6 * vol, attack: 0.005, filterType: 'lowpass', filterFreq: 2000, filterFreqTo: 150 });
    playToneSlide({ type: 'sine', f0: 100, f1: 35, dur: 0.5, vol: 0.4 * vol, attack: 0.005 });
  }

  function sfxJump(vol) {
    // 跳跃：短促上滑
    playToneSlide({ type: 'square', f0: 400, f1: 900, dur: 0.12, vol: 0.35 * vol, attack: 0.002 });
  }

  function sfxLand(vol) {
    // 落地：闷响（低频音 + 低通噪声）
    playToneSlide({ type: 'sine', f0: 150, f1: 60, dur: 0.12, vol: 0.4 * vol, attack: 0.001 });
    playNoise({ dur: 0.08, vol: 0.2 * vol, attack: 0.001, filterType: 'lowpass', filterFreq: 300 });
  }

  function sfxPickup(vol) {
    // 拿到宝物：上行大三和弦琶音（C-E-G-C），明亮
    var notes = [523.25, 659.25, 783.99, 1046.5];
    for (var i = 0; i < notes.length; i++) {
      playToneSlide({ type: 'triangle', f0: notes[i], dur: 0.15, vol: 0.3 * vol, attack: 0.005, delay: i * 0.06 });
    }
  }

  function sfxRoar(vol) {
    // Boss 咆哮：低频锯齿波 + 慢速颤音（LFO 调制频率），1.5 秒
    if (!ctx) return;
    var dur = 1.5;
    var t0 = now();
    var osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    var lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5; // 颤音速度 5Hz
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 15; // 颤音幅度
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    var vv = 0.4 * vol;
    osc.frequency.setValueAtTime(90, t0);
    osc.frequency.linearRampToValueAtTime(70, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vv, t0 + 0.15);
    gain.gain.setValueAtTime(vv, t0 + dur - 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    osc.start(t0);
    lfo.start(t0);
    safeStop(osc, t0 + dur + 0.05);
    safeStop(lfo, t0 + dur + 0.05);
    osc.onended = function () {
      safeDisconnect(osc);
      safeDisconnect(gain);
      safeDisconnect(lfo);
      safeDisconnect(lfoGain);
    };
  }

  function sfxWarp(vol) {
    // 穿过传送门：上扫扫频（音调 + 带通噪声一起往上扫）
    playToneSlide({ type: 'sawtooth', f0: 150, f1: 2200, dur: 0.5, vol: 0.35 * vol, attack: 0.01 });
    playNoise({ dur: 0.5, vol: 0.2 * vol, attack: 0.01, filterType: 'bandpass', filterFreq: 300, filterFreqTo: 4000, filterQ: 5 });
  }

  function sfxWin(vol) {
    // 胜利：欢快上行五声音阶 + 结尾大和弦
    var notes = [523.25, 587.33, 659.25, 783.99, 880.0]; // C D E G A
    var i;
    for (i = 0; i < notes.length; i++) {
      playToneSlide({ type: 'triangle', f0: notes[i], dur: 0.18, vol: 0.28 * vol, attack: 0.005, delay: i * 0.09 });
    }
    var chordDelay = notes.length * 0.09 + 0.05;
    var chord = [523.25, 659.25, 783.99, 1046.5];
    for (i = 0; i < chord.length; i++) {
      playToneSlide({ type: 'triangle', f0: chord[i], dur: 0.6, vol: 0.22 * vol, attack: 0.01, delay: chordDelay });
    }
  }

  function sfxLose(vol) {
    // 失败：下行小三度旋律 + 低沉尾音
    playToneSlide({ type: 'triangle', f0: 349.23, dur: 0.3, vol: 0.3 * vol, attack: 0.01 }); // F4
    playToneSlide({ type: 'triangle', f0: 293.66, dur: 0.5, vol: 0.3 * vol, attack: 0.01, delay: 0.28 }); // D4，小三度下行
    playToneSlide({ type: 'sine', f0: 100, f1: 60, dur: 0.7, vol: 0.25 * vol, attack: 0.02, delay: 0.1 });
  }

  function sfxUi(vol) {
    // 按钮点击：短促清脆
    playToneSlide({ type: 'square', f0: 1000, f1: 1400, dur: 0.05, vol: 0.25 * vol, attack: 0.001 });
  }

  var effects = {
    shoot: sfxShoot,
    ice: sfxIce,
    freeze: sfxFreeze,
    fireball: sfxFireball,
    bigfire: sfxBigfire,
    hit: sfxHit,
    hurt: sfxHurt,
    explode: sfxExplode,
    jump: sfxJump,
    land: sfxLand,
    pickup: sfxPickup,
    roar: sfxRoar,
    warp: sfxWarp,
    win: sfxWin,
    lose: sfxLose,
    ui: sfxUi
  };

  // ---------- 引擎循环音 ----------

  function startEngine() {
    try {
      if (!ctx) return;
      if (engineNodes) return; // 重复调用安全

      var osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 60;

      var osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 30;

      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      var gain = ctx.createGain();
      gain.gain.value = 0.0001;

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start();
      osc2.start();

      engineNodes = { osc: osc, osc2: osc2, filter: filter, gain: gain };
      setEngine(0);
    } catch (e) {}
  }

  function stopEngine() {
    try {
      if (!engineNodes) return;
      var nodes = engineNodes;
      engineNodes = null;
      var t = now();
      try {
        nodes.gain.gain.cancelScheduledValues(t);
        nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, t);
        nodes.gain.gain.linearRampToValueAtTime(0.0001, t + 0.1);
      } catch (e2) {}
      safeStop(nodes.osc, t + 0.15);
      safeStop(nodes.osc2, t + 0.15);
      nodes.osc.onended = function () {
        safeDisconnect(nodes.osc);
        safeDisconnect(nodes.osc2);
        safeDisconnect(nodes.filter);
        safeDisconnect(nodes.gain);
      };
    } catch (e) {}
  }

  function setEngine(power) {
    try {
      if (!ctx || !engineNodes) return;
      power = Math.max(0, Math.min(1, power || 0));
      var t = now();
      var freq = 50 + power * 90;   // 50~140Hz
      var vol = 0.05 + power * 0.25;
      engineNodes.osc.frequency.setTargetAtTime(freq, t, 0.05);
      engineNodes.osc2.frequency.setTargetAtTime(freq * 0.5, t, 0.05);
      engineNodes.gain.gain.setTargetAtTime(vol, t, 0.05);
      engineNodes.filter.frequency.setTargetAtTime(300 + power * 500, t, 0.05);
    } catch (e) {}
  }

  // ---------- 简单氛围音乐（三个正弦音的和弦垫底）----------

  function music(on) {
    try {
      if (!ctx) return;
      if (on) {
        if (musicNodes) return;
        var freqs = [130.81, 164.81, 196.0]; // C3 E3 G3
        var oscs = [];
        var gain = ctx.createGain();
        gain.gain.value = 0.0001;
        gain.connect(masterGain);
        for (var i = 0; i < freqs.length; i++) {
          var o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = freqs[i];
          o.connect(gain);
          o.start();
          oscs.push(o);
        }
        var t = now();
        gain.gain.setTargetAtTime(0.08, t, 1.0);
        musicNodes = { oscs: oscs, gain: gain };
      } else {
        if (!musicNodes) return;
        var nodes = musicNodes;
        musicNodes = null;
        var t2 = now();
        try {
          nodes.gain.gain.cancelScheduledValues(t2);
          nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, t2);
          nodes.gain.gain.linearRampToValueAtTime(0.0001, t2 + 0.6);
        } catch (e2) {}
        for (var j = 0; j < nodes.oscs.length; j++) {
          safeStop(nodes.oscs[j], t2 + 0.65);
        }
        nodes.oscs[0].onended = function () {
          for (var k = 0; k < nodes.oscs.length; k++) safeDisconnect(nodes.oscs[k]);
          safeDisconnect(nodes.gain);
        };
      }
    } catch (e) {}
  }

  // ---------- 对外 API ----------

  function init() {
    try {
      if (ctx) {
        if (ctx.state === 'suspended') {
          try { ctx.resume(); } catch (e2) {}
        }
        return;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return; // 浏览器不支持，静默降级
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 0.35;
      masterGain.connect(ctx.destination);
    } catch (e) {
      ctx = null;
      masterGain = null;
    }
  }

  function play(name, opts) {
    try {
      if (!ctx || muted) return;
      if (ctx.state === 'suspended') {
        try { ctx.resume(); } catch (e2) {}
      }
      var fn = effects[name];
      if (!fn) return; // 不认识的名字，静默返回
      var vol = 1;
      if (opts && typeof opts.vol === 'number' && !isNaN(opts.vol)) {
        vol = opts.vol;
      }
      fn(vol);
    } catch (e) {
      // 绝不抛异常
    }
  }

  function setMuted(b) {
    try {
      muted = !!b;
      if (masterGain) {
        masterGain.gain.value = muted ? 0 : 0.35;
      }
    } catch (e) {}
  }

  function isMuted() {
    return muted;
  }

  window.SFX = {
    init: init,
    play: play,
    setMuted: setMuted,
    isMuted: isMuted,
    startEngine: startEngine,
    stopEngine: stopEngine,
    setEngine: setEngine,
    music: music
  };
})();
