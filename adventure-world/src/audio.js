/**
 * Adventure World - Procedural Web Audio Engine
 * Zero-asset, 100% offline, zero-latency synthesizer.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.initialized = true;
      }
    } catch (e) {
      console.warn("AudioContext init failed:", e);
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (!muted && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.init();
    this.setMuted(!this.muted);
    return this.muted;
  }

  playTone(freq, duration, type = 'sine', gainVal = 0.15) {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playChime() {
    if (this.muted || !this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.25, 'triangle', 0.12), idx * 80);
    });
  }

  playStamp() {
    if (this.muted || !this.ctx) return;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.35, 'sine', 0.15), idx * 70);
    });
  }

  playClue() {
    if (this.muted || !this.ctx) return;
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.4, 'sine', 0.15), idx * 90);
    });
  }

  playBark() {
    if (this.muted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.15);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(t + 0.16);
    } catch (e) {}
  }

  playSplash() {
    if (this.muted || !this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {}
  }

  playVictory() {
    if (this.muted || !this.ctx) return;
    const fanfare = [
      { f: 523.25, d: 0.15, t: 0 },
      { f: 659.25, d: 0.15, t: 150 },
      { f: 783.99, d: 0.15, t: 300 },
      { f: 1046.5, d: 0.4, t: 450 },
      { f: 880, d: 0.2, t: 750 },
      { f: 1046.5, d: 0.7, t: 950 }
    ];
    fanfare.forEach(item => {
      setTimeout(() => this.playTone(item.f, item.d, 'triangle', 0.18), item.t);
    });
  }

  playClick() {
    this.playTone(800, 0.04, 'square', 0.05);
  }
}
