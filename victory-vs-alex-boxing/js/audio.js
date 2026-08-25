/**
 * Victory vs Alex - Sound & Dynamic Music Engine
 * Powered by Web Audio API (procedural synthesis, no external audio files required)
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.8;
        this.sfxVolume = 0.9;
        this.musicVolume = 0.45;
        this.isMuted = false;
        this.musicPlaying = false;
        this.musicStep = 0;
        this.bpm = 126;
        this.musicTimer = null;
        this.initialized = false;
        this.synthVoice = true;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            console.warn("Web Audio API not supported:", e);
        }
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Toggle Mute
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    // White / Pink Noise generator
    createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // Punch Whoosh / Swing
    playWhoosh(pitch = 1.0) {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(160 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(40 * pitch, t + 0.15);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);

        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.3 * this.sfxVolume, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.17);
    }

    // Quick Jab hit sound
    playJabHit() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;

        const t = this.ctx.currentTime;
        
        // Thump
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        oscGain.gain.setValueAtTime(0.6, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.13);

        // Snap Noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1400, t);
        noiseFilter.Q.setValueAtTime(2.0, t);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(t);
        noise.stop(t + 0.09);
    }

    // Medium Punch / Hook Hit sound
    playHookHit() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;

        const t = this.ctx.currentTime;
        
        // Deep Impact Thud
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(32, t + 0.22);
        oscGain.gain.setValueAtTime(0.9, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.23);

        // Heavy leather slap noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(900, t);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.7, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(t);
        noise.stop(t + 0.15);
    }

    // Heavy Uppercut / Knockout Blow sound
    playHeavyHit(isCounter = false) {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;

        const t = this.ctx.currentTime;

        // Sub bass explosion
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(140, t);
        sub.frequency.exponentialRampToValueAtTime(25, t + 0.38);
        subGain.gain.setValueAtTime(1.0, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(t);
        sub.stop(t + 0.4);

        // Crack / Crunch distortion
        const osc2 = this.ctx.createOscillator();
        const osc2Gain = this.ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(260, t);
        osc2.frequency.exponentialRampToValueAtTime(40, t + 0.18);
        osc2Gain.gain.setValueAtTime(0.6, t);
        osc2Gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
        osc2.connect(osc2Gain);
        osc2Gain.connect(this.sfxGain);
        osc2.start(t);
        osc2.stop(t + 0.19);

        // Counter chime if applicable
        if (isCounter) {
            this.playCounterPing();
        }
    }

    // Block / Guard absorption sound
    playBlock() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.09);
    }

    // Slip / Perfect Dodge slow-mo chime
    playCounterPing() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, t); // B5
        osc.frequency.exponentialRampToValueAtTime(1318.51, t + 0.25); // E6
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.36);
    }

    // Boxing Ring Bell (Classic Ding-Ding-Ding)
    playBell() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;

        const strike = (delay) => {
            const t = this.ctx.currentTime + delay;
            const freqs = [880, 1760, 2640, 3520];
            const amps = [0.6, 0.3, 0.15, 0.08];

            freqs.forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, t);
                gain.gain.setValueAtTime(amps[i] * 0.7, t);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(t);
                osc.stop(t + 1.85);
            });
        };

        strike(0.0);
        strike(0.25);
        strike(0.5);
    }

    // Super Meter Activation Surge
    playSuperActivation() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(1100, t + 0.6);
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.exponentialRampToValueAtTime(3500, t + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.72);
    }

    // Crowd Roar / Cheering
    playCrowdRoar(intensity = 1.0) {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;

        const t = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(650, t);
        filter.Q.setValueAtTime(0.8, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.35 * intensity, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(t);
        noise.stop(t + 1.9);
    }

    // Referee voice announcer (using Web Speech API or synthesised beep fallback)
    announce(text) {
        if (this.isMuted) return;
        try {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.pitch = 0.85;
                utterance.rate = 1.15;
                utterance.volume = 0.9;
                window.speechSynthesis.speak(utterance);
            } else {
                this.playJabHit();
            }
        } catch (e) {
            // fallback
        }
    }

    // Dynamic Fight Music Sequencer (Electro Arcade Synthwave / Stadium Hype)
    startFightMusic() {
        if (this.musicPlaying) return;
        this.ensureContext();
        if (!this.ctx) return;
        this.musicPlaying = true;
        this.musicStep = 0;

        const bassline = [
            48, 48, 60, 48,  48, 51, 53, 48,  // C2 pattern
            44, 44, 56, 44,  44, 48, 51, 44,  // Ab1 pattern
            46, 46, 58, 46,  46, 50, 53, 46,  // Bb1 pattern
            48, 48, 60, 48,  55, 53, 51, 50   // G1 turnaround
        ];

        const stepTime = (60 / this.bpm) / 4; // 16th notes

        const scheduleMusic = () => {
            if (!this.musicPlaying || this.isMuted) return;
            const t = this.ctx.currentTime + 0.05;

            // Bass note
            const noteMidi = bassline[this.musicStep % bassline.length];
            const freq = 440 * Math.pow(2, (noteMidi - 69) / 12);
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = (this.musicStep % 4 === 0) ? 'sawtooth' : 'square';
            osc.frequency.setValueAtTime(freq, t);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320 + ((this.musicStep % 8) * 60), t);

            gain.gain.setValueAtTime(0.2 * this.musicVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + stepTime * 0.9);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            osc.start(t);
            osc.stop(t + stepTime);

            // Kick Drum on 1, 5, 9, 13 (beats 1, 2, 3, 4)
            if (this.musicStep % 4 === 0) {
                const kick = this.ctx.createOscillator();
                const kickGain = this.ctx.createGain();
                kick.type = 'sine';
                kick.frequency.setValueAtTime(140, t);
                kick.frequency.exponentialRampToValueAtTime(30, t + 0.12);
                kickGain.gain.setValueAtTime(0.7 * this.musicVolume, t);
                kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
                kick.connect(kickGain);
                kickGain.connect(this.musicGain);
                kick.start(t);
                kick.stop(t + 0.14);
            }

            // Snare Drum on beat 2 and 4 (steps 4, 12)
            if (this.musicStep % 8 === 4) {
                const snareNoise = this.ctx.createBufferSource();
                snareNoise.buffer = this.createNoiseBuffer();
                const snareFilter = this.ctx.createBiquadFilter();
                snareFilter.type = 'highpass';
                snareFilter.frequency.setValueAtTime(1000, t);
                const snareGain = this.ctx.createGain();
                snareGain.gain.setValueAtTime(0.4 * this.musicVolume, t);
                snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
                snareNoise.connect(snareFilter);
                snareFilter.connect(snareGain);
                snareGain.connect(this.musicGain);
                snareNoise.start(t);
                snareNoise.stop(t + 0.15);
            }

            // Hi-hat on every offbeat 16th
            if (this.musicStep % 2 === 1) {
                const hatNoise = this.ctx.createBufferSource();
                hatNoise.buffer = this.createNoiseBuffer();
                const hatFilter = this.ctx.createBiquadFilter();
                hatFilter.type = 'highpass';
                hatFilter.frequency.setValueAtTime(7000, t);
                const hatGain = this.ctx.createGain();
                hatGain.gain.setValueAtTime(0.12 * this.musicVolume, t);
                hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
                hatNoise.connect(hatFilter);
                hatFilter.connect(hatGain);
                hatGain.connect(this.musicGain);
                hatNoise.start(t);
                hatNoise.stop(t + 0.05);
            }

            this.musicStep = (this.musicStep + 1) % 32;
        };

        this.musicTimer = setInterval(scheduleMusic, stepTime * 1000);
    }

    stopFightMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }
}

window.soundEngine = new SoundEngine();
