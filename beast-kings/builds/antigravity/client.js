// Beast Kings · Antigravity Edition Client
(function() {
  'use strict';

  // --- Audio Engine (Web Audio API Synthesizer) ---
  class SoundFX {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playPunch() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }

    playKick() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    }

    playSpin() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(600, t + 0.15);
      osc.frequency.linearRampToValueAtTime(150, t + 0.35);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    }

    playBlink() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    }

    playSuper() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.25);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.6);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    }

    playKO() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.8);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.8);
    }
  }

  const sfx = new SoundFX();

  // --- Network Client ---
  let ws = null;
  let mySlot = -1; // 0 for Frost, 1 for Ember, -1 for Spectator
  let latestState = null;
  let screenShake = 0;

  // Particle Engine
  const particles = [];
  function addSparks(x, y, color, count = 12, speed = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = (Math.random() * 0.7 + 0.3) * speed;
      particles.push({
        x, y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        color,
        size: Math.random() * 5 + 3,
        life: 1.0,
        decay: Math.random() * 0.04 + 0.03
      });
    }
  }

  // Active inputs
  const currentInputs = {
    left: false,
    right: false,
    jump: false,
    punch: false,
    kick: false,
    spin: false,
    blink: false,
    super: false
  };

  function sendInputs() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: 'input',
      left: currentInputs.left,
      right: currentInputs.right,
      jump: currentInputs.jump,
      punch: currentInputs.punch,
      kick: currentInputs.kick,
      spin: currentInputs.spin,
      blink: currentInputs.blink,
      super: currentInputs.super
    }));
    // Reset momentary action triggers
    currentInputs.punch = false;
    currentInputs.kick = false;
    currentInputs.spin = false;
    currentInputs.blink = false;
    currentInputs.super = false;
  }

  // DOM Elements
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const toastEl = document.getElementById('toast');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalBtn = document.getElementById('btn-modal-action');
  const modeSelectors = document.getElementById('mode-selectors');
  const btnPause = document.getElementById('btn-pause');
  const btnRematch = document.getElementById('btn-rematch');
  const roleBadge = document.getElementById('role-badge');
  const currentModeEl = document.getElementById('current-mode');
  const roundLabelEl = document.getElementById('round-label');
  const targetsHud = document.getElementById('targets-hud');
  const targetsScore = document.getElementById('targets-score');

  const bar0 = document.getElementById('bar-0');
  const bar1 = document.getElementById('bar-1');
  const hpVal0 = document.getElementById('hp-val-0');
  const hpVal1 = document.getElementById('hp-val-1');
  const power0 = document.getElementById('power-0');
  const power1 = document.getElementById('power-1');

  const energyFill = document.getElementById('energy-fill');
  const energyVal = document.getElementById('energy-val');
  const playerIdentity = document.getElementById('player-identity');

  const cdBlink = document.getElementById('cd-blink');
  const cdSpin = document.getElementById('cd-spin');
  const cdSuper = document.getElementById('cd-super');

  let toastTimer = null;
  function showToast(text, duration = 2000) {
    toastEl.textContent = text;
    toastEl.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add('hidden');
    }, duration);
  }

  // Connect WebSocket
  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
      console.log('Connected to Beast Kings arena server');
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'welcome') {
          mySlot = msg.slot;
          updateRoleBadge();
        } else if (msg.type === 'sync') {
          handleStateSync(msg.state);
        }
      } catch (e) {
        console.error(e);
      }
    };

    ws.onclose = () => {
      roleBadge.textContent = 'Disconnected';
      roleBadge.className = 'badge';
      setTimeout(connect, 1500);
    };
  }

  function updateRoleBadge() {
    if (mySlot === 0) {
      roleBadge.textContent = 'Player: FROST (Ice)';
      roleBadge.className = 'badge frost';
      playerIdentity.textContent = 'YOU ARE FROST';
    } else if (mySlot === 1) {
      roleBadge.textContent = 'Player: EMBER (Fire)';
      roleBadge.className = 'badge ember';
      playerIdentity.textContent = 'YOU ARE EMBER';
    } else {
      roleBadge.textContent = 'Spectator';
      roleBadge.className = 'badge spectator';
      playerIdentity.textContent = 'SPECTATING BATTLE';
    }
  }

  function handleStateSync(state) {
    latestState = state;

    // Process events
    if (state.events && state.events.length > 0) {
      for (const ev of state.events) {
        if (ev.type === 'hit') {
          screenShake = 8;
          if (ev.attackType === 'kick') sfx.playKick();
          else sfx.playPunch();
          addSparks(ev.x, ev.y, ev.victimId === 0 ? '#38bdf8' : '#f97316', 15, 8);
        } else if (ev.type === 'blink') {
          sfx.playBlink();
          addSparks(ev.fromX, ev.y - 45, '#eab308', 10, 5);
          addSparks(ev.toX, ev.y - 45, '#eab308', 16, 7);
        } else if (ev.type === 'spin_effect') {
          sfx.playSpin();
          screenShake = 6;
          addSparks(ev.x, ev.y, ev.beastId === 0 ? '#38bdf8' : '#f97316', 20, 9);
        } else if (ev.type === 'super_blast') {
          sfx.playSuper();
          screenShake = 12;
          addSparks(ev.startX, ev.y, ev.color, 25, 12);
        } else if (ev.type === 'target_destroyed') {
          sfx.playKick();
          addSparks(state.targets[ev.targetId]?.x || 600, 300, '#ffd700', 25, 9);
          showToast(`${ev.beastId === 0 ? 'FROST' : 'EMBER'} DEFEATED A TARGET! (${ev.targetsCount}/5)`);
        } else if (ev.type === 'ko') {
          sfx.playKO();
          screenShake = 15;
          showToast(`KNOCKOUT!`);
        } else if (ev.type === 'victory') {
          sfx.playKO();
          showToast(ev.reason, 4000);
        } else if (ev.type === 'announcement') {
          showToast(ev.text, 2500);
        }
      }
    }

    // Update HUD
    const b0 = state.beasts[0];
    const b1 = state.beasts[1];

    if (b0) {
      bar0.style.width = `${b0.hp}%`;
      hpVal0.textContent = `${b0.hp} HP`;
      power0.textContent = `POWER ${b0.power}`;
    }
    if (b1) {
      bar1.style.width = `${b1.hp}%`;
      hpVal1.textContent = `${b1.hp} HP`;
      power1.textContent = `POWER ${b1.power}`;
    }

    // Flight energy
    const myBeast = mySlot === 0 ? b0 : (mySlot === 1 ? b1 : b0);
    if (myBeast) {
      energyFill.style.width = `${myBeast.flightEnergy}%`;
      energyVal.textContent = `${Math.round(myBeast.flightEnergy)}%`;

      // Cooldowns
      if (mySlot === 0 || mySlot === 1) {
        cdBlink.style.height = `${(myBeast.cooldowns.blink / 90) * 100}%`;
        cdSpin.style.height = `${(myBeast.cooldowns.spin / 100) * 100}%`;
        cdSuper.style.height = `${(myBeast.cooldowns.super / 240) * 100}%`;
      }
    }

    // Center pill
    currentModeEl.textContent = state.mode === 'crown' ? '👑 CROWN HUNT' : '⚔ DUEL';
    roundLabelEl.textContent = `ROUND ${state.roundCount}`;

    if (state.mode === 'crown') {
      targetsHud.style.display = 'block';
      targetsScore.textContent = `${b0?.targetsDefeated || 0} - ${b1?.targetsDefeated || 0} / 5`;
    } else {
      targetsHud.style.display = 'none';
    }

    // Modals
    if (state.status === 'paused') {
      modalTitle.textContent = 'ARENA PAUSED';
      modalDesc.textContent = state.pauseReason || 'Paused by Teacher';
      modalBtn.textContent = 'RESUME ROUND ▶';
      modeSelectors.style.display = 'none';
      modalOverlay.classList.remove('hidden');
    } else if (state.status === 'gameover') {
      modalTitle.textContent = state.winner === 'draw' ? 'DRAW!' : `${state.winner.toUpperCase()} WINS!`;
      modalDesc.textContent = state.winReason;
      modalBtn.textContent = 'REMATCH ↻';
      modeSelectors.style.display = 'grid';
      modalOverlay.classList.remove('hidden');
    } else if (state.status === 'ready') {
      modalTitle.textContent = 'BEAST KINGS ARENA';
      modalDesc.textContent = 'Two Players. Two iPads. One Mighty Showdown.';
      modalBtn.textContent = 'ENTER ARENA →';
      modeSelectors.style.display = 'grid';
      // keep visible until entered
    } else {
      modalOverlay.classList.add('hidden');
    }
  }

  // --- Rendering Loop ---
  function render() {
    requestAnimationFrame(render);

    ctx.save();

    // Screen shake
    if (screenShake > 0) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
      screenShake *= 0.88;
      if (screenShake < 0.2) screenShake = 0;
    }

    // 1. Draw Arena Background
    drawArenaBackground();

    // 2. Draw Targets (if Crown Hunt)
    if (latestState && latestState.mode === 'crown') {
      for (const t of latestState.targets) {
        if (t.alive) drawTarget(t);
      }
    }

    // 3. Draw Beasts
    if (latestState && latestState.beasts) {
      for (const b of latestState.beasts) {
        drawBeast(b);
      }
    }

    // 4. Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  function drawArenaBackground() {
    const w = canvas.width;
    const h = canvas.height;
    const groundY = 480;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#0c1527');
    sky.addColorStop(0.7, '#1b2a47');
    sky.addColorStop(1, '#2c3e66');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, groundY);

    // Distant mountain peaks
    ctx.fillStyle = '#141d33';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(200, 260);
    ctx.lineTo(380, groundY);
    ctx.lineTo(600, 220);
    ctx.lineTo(820, groundY);
    ctx.lineTo(1050, 250);
    ctx.lineTo(w, groundY);
    ctx.fill();

    // Arena pillars
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    // Left Pillar
    ctx.fillRect(80, 240, 40, groundY - 240);
    ctx.strokeRect(80, 240, 40, groundY - 240);
    // Right Pillar
    ctx.fillRect(w - 120, 240, 40, groundY - 240);
    ctx.strokeRect(w - 120, 240, 40, groundY - 240);

    // Torches on pillars
    drawTorch(100, 230, '#38bdf8');
    drawTorch(w - 100, 230, '#f97316');

    // Arena Floor
    const floor = ctx.createLinearGradient(0, groundY, 0, h);
    floor.addColorStop(0, '#334155');
    floor.addColorStop(0.08, '#1e293b');
    floor.addColorStop(1, '#0f172a');
    ctx.fillStyle = floor;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Gold arena boundary line
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Arena floor stone grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    for (let x = 100; x < w; x += 150) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x - 60, h);
      ctx.stroke();
    }
  }

  function drawTorch(x, y, flameColor) {
    ctx.save();
    // Torch base
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 8, y, 16, 14);
    // Flame
    const flick = Math.sin(Date.now() / 80) * 4;
    const grad = ctx.createRadialGradient(x, y - 10, 2, x, y - 10, 20);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, flameColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y - 10 + flick, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTarget(t) {
    ctx.save();
    ctx.translate(t.x, t.y);

    // Golden halo glow
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, t.radius + 10);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.6)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, t.radius + 10, 0, Math.PI * 2);
    ctx.fill();

    // Outer ring
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
    ctx.fill();

    // Middle ring
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, 0, t.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Bullseye
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, 0, t.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Floating crown on top
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👑', 0, -t.radius - 4);

    // Small HP bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-20, t.radius + 6, 40, 5);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-20, t.radius + 6, (t.hp / 25) * 40, 5);

    ctx.restore();
  }

  // --- Procedural Cartoon Beast Renderer ---
  function drawBeast(b) {
    ctx.save();
    ctx.translate(b.x, b.y);

    // Shadow on ground
    const shadowDist = 480 - b.y;
    const shadowScale = Math.max(0.3, 1 - shadowDist / 350);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, shadowDist, 35 * shadowScale, 10 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Invulnerability flashing
    if (b.invuln && Math.floor(Date.now() / 70) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Facing direction
    ctx.scale(b.facing, 1);

    const isFrost = b.id === 0;
    const mainColor = isFrost ? '#38bdf8' : '#ea580c';
    const darkColor = isFrost ? '#0284c7' : '#c2410c';
    const lightColor = isFrost ? '#bae6fd' : '#fed7aa';
    const eyeColor = isFrost ? '#0369a1' : '#7c2d12';

    // Knockout state
    if (b.state === 'ko') {
      ctx.rotate(-Math.PI / 2);
      ctx.translate(20, -20);
    }

    // Animated breathing / bobbing
    const bob = Math.sin(Date.now() / 200) * 2;

    // 1. Beast Tail
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(-25, -30 + bob);
    ctx.quadraticCurveTo(-50, -50 + bob, -45, -20 + bob);
    ctx.quadraticCurveTo(-40, -10 + bob, -20, -15 + bob);
    ctx.fill();

    // Tail tip (ice crystal for frost, flame for ember)
    if (isFrost) {
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.moveTo(-45, -20 + bob);
      ctx.lineTo(-58, -25 + bob);
      ctx.lineTo(-52, -15 + bob);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-45, -20 + bob, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Beast Body (Chubby Cute Monster Silhouette)
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(0, -42 + bob, 32, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Belly patch
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.ellipse(8, -36 + bob, 18, 26, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 3. Legs / Feet
    ctx.fillStyle = darkColor;
    // Left foot
    ctx.beginPath();
    ctx.ellipse(-14, -4, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right foot
    ctx.beginPath();
    ctx.ellipse(14, -4, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Claws
    ctx.fillStyle = '#fff';
    ctx.fillRect(8, -5, 4, 4);
    ctx.fillRect(16, -5, 4, 4);
    ctx.fillRect(24, -5, 4, 4);

    // 4. Head & Horns
    // Horns
    ctx.fillStyle = isFrost ? '#e0f2fe' : '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-12, -75 + bob);
    ctx.quadraticCurveTo(-26, -100 + bob, -10, -95 + bob);
    ctx.lineTo(-4, -75 + bob);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(12, -75 + bob);
    ctx.quadraticCurveTo(26, -100 + bob, 10, -95 + bob);
    ctx.lineTo(4, -75 + bob);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(8, -62 + bob, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ears / Spikes
    if (isFrost) {
      // Ice Spikes along spine
      ctx.fillStyle = lightColor;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-25, -60 + i * 15 + bob);
        ctx.lineTo(-38, -65 + i * 15 + bob);
        ctx.lineTo(-24, -50 + i * 15 + bob);
        ctx.fill();
      }
    } else {
      // Flame Mane
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(-8, -65 + bob, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-10, -68 + bob, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Expressive Eyes
    if (b.state === 'ko') {
      // Dizzy X eyes
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      // Eye 1
      ctx.beginPath();
      ctx.moveTo(12, -66 + bob); ctx.lineTo(20, -58 + bob);
      ctx.moveTo(20, -66 + bob); ctx.lineTo(12, -58 + bob);
      ctx.stroke();
    } else if (b.state === 'hit') {
      // Squinting hurt eyes
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(16, -62 + bob, 6, Math.PI, 0);
      ctx.stroke();
    } else {
      // Big cartoon lively eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(16, -64 + bob, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(19, -64 + bob, 5, 0, Math.PI * 2);
      ctx.fill();

      // Eye sparkle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(20, -66 + bob, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cute Snout / Mouth
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(28, -56 + bob, 4, 0, Math.PI * 2);
    ctx.fill();

    // 6. Action Attack Visuals
    if (b.state === 'punch') {
      // Extended Fist & impact flash
      ctx.fillStyle = isFrost ? '#38bdf8' : '#ef4444';
      ctx.beginPath();
      ctx.arc(42, -45 + bob, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Speed smear
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(20, -50 + bob, 25, 10);
    } else if (b.state === 'kick') {
      // Extended Kick leg
      ctx.fillStyle = isFrost ? '#0284c7' : '#f97316';
      ctx.beginPath();
      ctx.ellipse(44, -25 + bob, 24, 12, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (b.state === 'spin') {
      // Cyclone whirl around beast
      ctx.strokeStyle = isFrost ? 'rgba(56, 189, 248, 0.8)' : 'rgba(249, 115, 22, 0.8)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, -42 + bob, 65, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.state === 'super') {
      // Mega energy beam charge
      ctx.fillStyle = isFrost ? '#00f2fe' : '#ff5e3a';
      ctx.beginPath();
      ctx.arc(38, -45 + bob, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wings / Flight Effect
    if (b.isFlying) {
      ctx.fillStyle = isFrost ? 'rgba(186, 230, 253, 0.7)' : 'rgba(254, 215, 170, 0.7)';
      const wingFlap = Math.sin(Date.now() / 60) * 15;
      // Wing
      ctx.beginPath();
      ctx.moveTo(-15, -55 + bob);
      ctx.quadraticCurveTo(-45, -85 + wingFlap + bob, -5, -70 + bob);
      ctx.fill();
    }

    // Crown if 5 targets defeated
    if (b.targetsDefeated >= 5) {
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', 8, -105 + bob);
    }

    ctx.restore();
  }

  // --- Controls & Touch Handling ---
  function initControls() {
    // Touch Buttons
    const buttons = document.querySelectorAll('.touch-btn');
    buttons.forEach(btn => {
      const action = btn.dataset.action;

      const handlePress = (e) => {
        e.preventDefault();
        sfx.init();
        btn.classList.add('active');

        if (action === 'left') currentInputs.left = true;
        if (action === 'right') currentInputs.right = true;
        if (action === 'jump') currentInputs.jump = true;

        if (action === 'punch') currentInputs.punch = true;
        if (action === 'kick') currentInputs.kick = true;
        if (action === 'spin') currentInputs.spin = true;
        if (action === 'blink') currentInputs.blink = true;
        if (action === 'super') currentInputs.super = true;

        sendInputs();
      };

      const handleRelease = (e) => {
        e.preventDefault();
        btn.classList.remove('active');

        if (action === 'left') currentInputs.left = false;
        if (action === 'right') currentInputs.right = false;
        if (action === 'jump') currentInputs.jump = false;

        sendInputs();
      };

      btn.addEventListener('touchstart', handlePress, { passive: false });
      btn.addEventListener('touchend', handleRelease, { passive: false });
      btn.addEventListener('touchcancel', handleRelease, { passive: false });

      btn.addEventListener('mousedown', handlePress);
      btn.addEventListener('mouseup', handleRelease);
      btn.addEventListener('mouseleave', handleRelease);
    });

    // Keyboard Fallbacks
    window.addEventListener('keydown', (e) => {
      sfx.init();
      const code = e.code;
      if (code === 'KeyA' || code === 'ArrowLeft') currentInputs.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') currentInputs.right = true;
      if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') currentInputs.jump = true;

      if (code === 'KeyJ') currentInputs.punch = true;
      if (code === 'KeyI') currentInputs.kick = true;
      if (code === 'KeyK') currentInputs.spin = true;
      if (code === 'KeyL') currentInputs.blink = true;
      if (code === 'KeyU') currentInputs.super = true;

      sendInputs();
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyA' || code === 'ArrowLeft') currentInputs.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') currentInputs.right = false;
      if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') currentInputs.jump = false;

      sendInputs();
    });

    // UI Buttons
    btnPause.addEventListener('click', () => {
      sfx.init();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'pause' }));
      }
    });

    btnRematch.addEventListener('click', () => {
      sfx.init();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'rematch' }));
      }
    });

    modalBtn.addEventListener('click', () => {
      sfx.init();
      if (latestState && latestState.status === 'paused') {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pause' }));
        }
      } else if (latestState && latestState.status === 'gameover') {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'rematch' }));
        }
      } else {
        modalOverlay.classList.add('hidden');
      }
    });

    // Mode Buttons
    const modeBtns = modeSelectors.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sfx.init();
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'mode', mode }));
        }
      });
    });
  }

  // Start everything
  connect();
  initControls();
  requestAnimationFrame(render);
})();
