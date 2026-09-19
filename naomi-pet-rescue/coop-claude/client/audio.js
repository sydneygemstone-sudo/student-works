/**
 * client/audio.js — 背景音乐与音效，全部用 Web Audio 现场合成。
 *
 * 为什么不放 mp3：这套东西要在 Dean 的 Mac 上离线跑给两台 iPad 用，
 * 任务书明确不许依赖运行时 CDN。几十行振荡器就能做出一段温柔的花园循环，
 * 还能顺手把雷声、狼嚎、救回小动物的叮咚都合出来，一个字节资源都不用带。
 *
 * iOS Safari 只允许在用户手势里启动音频，所以一切从 unlock() 开始，
 * 在那之前所有调用都是安全的空操作。
 *
 * Author: Claude Code (Claude Opus)
 */

/** 花园主题：C 大调的 I–V–vi–IV，每小节一个和弦，听着暖而不吵。 */
const CHORDS = [
  [261.63, 329.63, 392.00], // C
  [196.00, 246.94, 392.00], // G/B
  [220.00, 261.63, 329.63], // Am
  [174.61, 220.00, 261.63], // F
];

const BAR_SECONDS = 2.4;

export class GardenAudio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.musicOn = true;
    this.volume = 0.5;
    this.timer = null;
    this.bar = 0;
  }

  /** 必须在用户手势里调用（点按钮、选角色）。重复调用无害。 */
  unlock() {
    if (this.ready) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    try {
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.22; // 背景音乐压得比音效低，别盖过说话声
      this.musicBus.connect(this.master);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.85;
      this.sfxBus.connect(this.master);

      this.ready = true;
      if (this.musicOn) this.startMusic();
      return true;
    } catch {
      return false;
    }
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.ready) this.master.gain.value = this.volume;
  }

  toggleMusic(on = !this.musicOn) {
    this.musicOn = on;
    if (!this.ready) return this.musicOn;
    if (on) this.startMusic();
    else this.stopMusic();
    return this.musicOn;
  }

  // ———————————————————— 背景音乐 ————————————————————

  startMusic() {
    if (!this.ready || this.timer) return;
    this.bar = 0;
    const tick = () => {
      if (!this.musicOn || !this.ready) return;
      this.playBar(CHORDS[this.bar % CHORDS.length]);
      this.bar += 1;
      this.timer = setTimeout(tick, BAR_SECONDS * 1000);
    };
    tick();
  }

  stopMusic() {
    clearTimeout(this.timer);
    this.timer = null;
  }

  /** 一小节：低音铺底 + 三个音的柔和琶音。 */
  playBar(chord) {
    const t0 = this.ctx.currentTime;

    // 低音：正弦长音
    this.tone({
      freq: chord[0] / 2, type: 'sine', at: t0, duration: BAR_SECONDS * 0.95,
      attack: 0.25, release: 0.6, peak: 0.16, bus: this.musicBus,
    });

    // 琶音：三角波，一个接一个上行
    chord.forEach((freq, i) => {
      this.tone({
        freq, type: 'triangle', at: t0 + i * 0.28, duration: 0.85,
        attack: 0.05, release: 0.45, peak: 0.1, bus: this.musicBus,
      });
    });
    // 尾巴上加一个高八度的小铃，像花园里的风铃
    this.tone({
      freq: chord[2] * 2, type: 'sine', at: t0 + 1.5, duration: 0.7,
      attack: 0.02, release: 0.5, peak: 0.055, bus: this.musicBus,
    });
  }

  // ———————————————————— 合成基元 ————————————————————

  tone({ freq, type = 'sine', at = 0, duration = 0.3, attack = 0.01, release = 0.12, peak = 0.3, bus = null, slideTo = null }) {
    if (!this.ready) return;
    const start = at || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + duration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + release);

    osc.connect(gain);
    gain.connect(bus ?? this.sfxBus);
    osc.start(start);
    osc.stop(start + duration + release + 0.05);
  }

  /** 一段噪声（雷声、脚步、吼叫的底子）。 */
  noise({ duration = 0.6, peak = 0.3, filterHz = 800, filterType = 'lowpass', at = 0, sweepTo = null }) {
    if (!this.ready) return;
    const start = at || this.ctx.currentTime;
    const frames = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterHz, start);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), start + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(start);
  }

  // ———————————————————— 游戏音效 ————————————————————

  step() { this.tone({ freq: 180, type: 'sine', duration: 0.06, peak: 0.12, release: 0.05 }); }

  /** 撞墙：短促的闷响，听一次就知道「此路不通」。 */
  blocked() {
    this.noise({ duration: 0.16, peak: 0.22, filterHz: 420 });
    this.tone({ freq: 140, type: 'square', duration: 0.1, peak: 0.1, release: 0.08 });
  }

  /** 抱起小动物：往上跳一下。 */
  pickup() {
    const t = this.ctx?.currentTime ?? 0;
    this.tone({ freq: 523.25, duration: 0.1, peak: 0.2, at: t });
    this.tone({ freq: 659.25, duration: 0.14, peak: 0.18, at: t + 0.08 });
  }

  /** 送回家：一小串上行的叮咚，最值得庆祝的声音。 */
  rescue() {
    const t = this.ctx?.currentTime ?? 0;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone({ freq: f, type: 'triangle', duration: 0.16, peak: 0.24, at: t + i * 0.1, release: 0.3 });
    });
  }

  /** 能量星：亮晶晶的上滑音。 */
  energy() {
    this.tone({ freq: 660, type: 'triangle', duration: 0.28, peak: 0.22, slideTo: 1320, release: 0.25 });
  }

  /** 礼物盒。 */
  gift() {
    const t = this.ctx?.currentTime ?? 0;
    this.tone({ freq: 587.33, duration: 0.12, peak: 0.2, at: t });
    this.tone({ freq: 880, duration: 0.2, peak: 0.2, at: t + 0.1, release: 0.3 });
  }

  /** 恶作剧 / 走错门：下滑的泄气音。 */
  oops() {
    this.tone({ freq: 440, type: 'square', duration: 0.35, peak: 0.16, slideTo: 130, release: 0.2 });
  }

  /** ⛈️ 雷声：一声闷响加一串滚雷。 */
  thunder() {
    const t = this.ctx?.currentTime ?? 0;
    this.noise({ duration: 0.9, peak: 0.4, filterHz: 2600, sweepTo: 90, at: t });
    this.noise({ duration: 1.6, peak: 0.22, filterHz: 320, sweepTo: 60, at: t + 0.22 });
    this.tone({ freq: 55, type: 'sine', duration: 1.1, peak: 0.22, at: t, release: 0.6 });
  }

  /** 🐺 狼嚎：低沉、拖长、带一点上扬。 */
  wolfHowl() {
    const t = this.ctx?.currentTime ?? 0;
    this.tone({ freq: 220, type: 'sawtooth', duration: 0.85, peak: 0.16, slideTo: 330, at: t, attack: 0.15, release: 0.5 });
    this.tone({ freq: 110, type: 'sine', duration: 0.9, peak: 0.12, at: t, attack: 0.2, release: 0.5 });
  }

  /** 🐻💢 小熊大吼：短促有力，孩子会想再按一次。 */
  bearRoar() {
    const t = this.ctx?.currentTime ?? 0;
    this.noise({ duration: 0.35, peak: 0.3, filterHz: 900, sweepTo: 250, at: t });
    this.tone({ freq: 160, type: 'sawtooth', duration: 0.3, peak: 0.22, slideTo: 80, at: t, release: 0.2 });
  }

  /** 🦁 狮吼：比狼更沉更宽。 */
  lionRoar() {
    const t = this.ctx?.currentTime ?? 0;
    this.noise({ duration: 0.7, peak: 0.28, filterHz: 700, sweepTo: 160, at: t });
    this.tone({ freq: 98, type: 'sawtooth', duration: 0.6, peak: 0.2, slideTo: 62, at: t, release: 0.35 });
  }

  /** 回合推进。 */
  roundStart() {
    const t = this.ctx?.currentTime ?? 0;
    this.tone({ freq: 392, duration: 0.12, peak: 0.16, at: t });
    this.tone({ freq: 523.25, duration: 0.18, peak: 0.16, at: t + 0.1, release: 0.25 });
  }

  /** 胜利：一串明亮的琶音。 */
  victory() {
    const t = this.ctx?.currentTime ?? 0;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      this.tone({ freq: f, type: 'triangle', duration: 0.22, peak: 0.26, at: t + i * 0.14, release: 0.5 });
    });
  }

  /** 时间用完：温柔的下行，不要吓到孩子。 */
  timeUp() {
    const t = this.ctx?.currentTime ?? 0;
    [523.25, 440, 349.23].forEach((f, i) => {
      this.tone({ freq: f, type: 'sine', duration: 0.3, peak: 0.2, at: t + i * 0.22, release: 0.4 });
    });
  }
}

export default GardenAudio;
