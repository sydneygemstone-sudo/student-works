/**
 * Adventure World - Standalone Bundle
 * Universal support for both HTTP server and file:// offline browser launch.
 */
(function() {
/**
 * Adventure World - Procedural Web Audio Engine
 * Zero-asset, 100% offline, zero-latency synthesizer.
 */
class SoundEngine {
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

/**
 * Adventure World - Save Manager
 * LocalStorage serialization with robust schema validation & fallback.
 */

const SAVE_KEY = "adventure-world:save:v1";

function getDefaultSave(spawnX = 650, spawnY = 950) {
  return {
    schemaVersion: 1,
    gameId: "adventure-world",
    worldVersion: "1",
    phase: "DAY",
    avatarId: "avatar-1",
    position: { x: spawnX, y: spawnY },
    stamps: [],
    animalsObserved: [],
    puppyPetted: false,
    puppyFed: false,
    trailRevealed: false,
    clues: [],
    winTriggered: false,
    locale: "en",
    muted: true
  };
}

class SaveManager {
  constructor(defaultSpawn = { x: 650, y: 950 }, isPositionLegal = null) {
    this.defaultSpawn = defaultSpawn;
    this.isPositionLegal = isPositionLegal || ((x, y) => x >= 60 && x <= 1540 && y >= 60 && y <= 1140);
    this.storageAvailable = this.checkStorageAvailability();
    this.lastSavedPositionTime = 0;
  }

  checkStorageAvailability() {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      const testKey = "__aw_storage_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  load() {
    if (!this.storageAvailable) {
      return { success: false, data: getDefaultSave(this.defaultSpawn.x, this.defaultSpawn.y), storageDisabled: true };
    }

    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) {
        return { success: true, data: getDefaultSave(this.defaultSpawn.x, this.defaultSpawn.y), isNew: true };
      }

      const parsed = JSON.parse(raw);
      const validated = this.validateAndSanitize(parsed);
      return { success: true, data: validated, isNew: false };
    } catch (e) {
      console.warn("Corrupt save detected, resetting gracefully:", e);
      return { success: false, data: getDefaultSave(this.defaultSpawn.x, this.defaultSpawn.y), corrupted: true };
    }
  }

  validateAndSanitize(data) {
    const base = getDefaultSave(this.defaultSpawn.x, this.defaultSpawn.y);
    if (!data || typeof data !== "object") return base;

    // Check schema and game ID
    if (data.gameId !== "adventure-world") return base;

    const validPhases = ["DAY", "NIGHT", "COMPLETED"];
    const phase = validPhases.includes(data.phase) ? data.phase : "DAY";

    const validAvatars = ["avatar-1", "avatar-2", "avatar-3"];
    const avatarId = validAvatars.includes(data.avatarId) ? data.avatarId : "avatar-1";

    let pos = base.position;
    if (
      data.position &&
      typeof data.position.x === "number" &&
      typeof data.position.y === "number" &&
      !isNaN(data.position.x) &&
      !isNaN(data.position.y) &&
      this.isPositionLegal(data.position.x, data.position.y)
    ) {
      pos = { x: data.position.x, y: data.position.y };
    }

    const validStampIds = ["waterpark", "zoo", "puppy"];
    const stamps = Array.isArray(data.stamps)
      ? Array.from(new Set(data.stamps.filter(s => validStampIds.includes(s))))
      : [];

    const validAnimalIds = ["lion", "crocodile", "giraffe", "elephant", "penguin", "owl"];
    const animalsObserved = Array.isArray(data.animalsObserved)
      ? Array.from(new Set(data.animalsObserved.filter(a => validAnimalIds.includes(a))))
      : [];

    const validClueIds = ["sky", "quiet", "trail"];
    const clues = Array.isArray(data.clues)
      ? Array.from(new Set(data.clues.filter(c => validClueIds.includes(c))))
      : [];

    const validLocales = ["en", "zh"];
    const locale = validLocales.includes(data.locale) ? data.locale : "en";

    return {
      schemaVersion: 1,
      gameId: "adventure-world",
      worldVersion: "1",
      phase,
      avatarId,
      position: pos,
      stamps,
      animalsObserved,
      puppyPetted: Boolean(data.puppyPetted),
      puppyFed: Boolean(data.puppyFed),
      trailRevealed: Boolean(data.trailRevealed),
      clues,
      winTriggered: Boolean(data.winTriggered),
      locale,
      muted: typeof data.muted === "boolean" ? data.muted : true
    };
  }

  save(state, force = false) {
    if (!this.storageAvailable) return false;
    try {
      const now = Date.now();
      // Throttle pure position saves to 2000ms unless forced (e.g. quest update, phase switch, settings)
      if (!force && now - this.lastSavedPositionTime < 2000) {
        return true;
      }
      this.lastSavedPositionTime = now;

      const payload = {
        schemaVersion: 1,
        gameId: "adventure-world",
        worldVersion: "1",
        phase: state.phase,
        avatarId: state.avatarId,
        position: { x: Math.round(state.player.x), y: Math.round(state.player.y) },
        stamps: Array.from(state.stamps),
        animalsObserved: Array.from(state.animalsObserved),
        puppyPetted: Boolean(state.puppyPetted),
        puppyFed: Boolean(state.puppyFed),
        trailRevealed: Boolean(state.trailRevealed),
        clues: Array.from(state.clues),
        winTriggered: Boolean(state.winTriggered),
        locale: state.locale,
        muted: Boolean(state.muted)
      };

      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn("Storage write failed (quota exceeded or disabled):", e);
      return false;
    }
  }

  clear() {
    if (!this.storageAvailable) return;
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch (e) {}
  }
}

/**
 * Adventure World - Unified Desktop & Touch Input Controller
 * Clean lifecycle handling with zero-stuck keys and multi-touch support.
 */

class InputController {
  constructor(canvasElement, callbacks = {}) {
    this.canvas = canvasElement;
    this.callbacks = callbacks; // { onInteract, onFly, onInvis, onTorch, onAvatar, onPause, onResume }

    // Axes
    this.moveX = 0;
    this.moveY = 0;

    // Raw key tracking
    this.keys = new Map();

    // Virtual Joystick state
    this.joystick = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      radius: 54
    };

    // Action button state
    this.activePointers = new Map();

    this.initKeyboard();
    this.initLifecycle();
  }

  initKeyboard() {
    window.addEventListener("keydown", (e) => {
      // Prevent scrolling on arrows / space
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }

      if (e.repeat) return; // Prevent key-repeat bounce
      this.keys.set(e.code, true);

      // Triggers
      if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") {
        if (this.callbacks.onInteract) this.callbacks.onInteract();
      } else if (e.code === "KeyF") {
        if (this.callbacks.onFly) this.callbacks.onFly();
      } else if (e.code === "KeyI") {
        if (this.callbacks.onInvis) this.callbacks.onInvis();
      } else if (e.code === "KeyL") {
        if (this.callbacks.onTorch) this.callbacks.onTorch();
      } else if (e.code === "Digit1") {
        if (this.callbacks.onAvatar) this.callbacks.onAvatar("avatar-1");
      } else if (e.code === "Digit2") {
        if (this.callbacks.onAvatar) this.callbacks.onAvatar("avatar-2");
      } else if (e.code === "Digit3") {
        if (this.callbacks.onAvatar) this.callbacks.onAvatar("avatar-3");
      } else if (e.code === "Escape") {
        if (this.callbacks.onPause) this.callbacks.onPause();
      }

      this.updateMovementVector();
    });

    window.addEventListener("keyup", (e) => {
      this.keys.set(e.code, false);
      this.updateMovementVector();
    });
  }

  initLifecycle() {
    const clearAll = () => {
      this.keys.clear();
      this.joystick.active = false;
      this.joystick.pointerId = null;
      this.moveX = 0;
      this.moveY = 0;
      this.activePointers.clear();
    };

    window.addEventListener("blur", clearAll);
    window.addEventListener("visibilitychange", () => {
      if (document.hidden) clearAll();
    });
    window.addEventListener("pagehide", clearAll);
    window.addEventListener("orientationchange", clearAll);
  }

  updateMovementVector() {
    // Keyboard vector
    let kx = 0;
    let ky = 0;

    if (this.keys.get("KeyW") || this.keys.get("ArrowUp")) ky -= 1;
    if (this.keys.get("KeyS") || this.keys.get("ArrowDown")) ky += 1;
    if (this.keys.get("KeyA") || this.keys.get("ArrowLeft")) kx -= 1;
    if (this.keys.get("KeyD") || this.keys.get("ArrowRight")) kx += 1;

    // If keyboard is pressed, it overrides or merges
    if (kx !== 0 || ky !== 0) {
      const len = Math.hypot(kx, ky);
      this.moveX = kx / len;
      this.moveY = ky / len;
    } else if (!this.joystick.active) {
      this.moveX = 0;
      this.moveY = 0;
    }
  }

  // Virtual Joystick handlers (called from DOM container)
  bindJoystickElement(containerEl, knobEl) {
    if (!containerEl) return;

    const onPointerDown = (e) => {
      if (this.joystick.active) return;
      this.joystick.active = true;
      this.joystick.pointerId = e.pointerId;
      const rect = containerEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      this.joystick.startX = centerX;
      this.joystick.startY = centerY;
      this.handleJoystickMove(e.clientX, e.clientY, knobEl);
      containerEl.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (this.joystick.active && this.joystick.pointerId === e.pointerId) {
        this.handleJoystickMove(e.clientX, e.clientY, knobEl);
        e.preventDefault();
      }
    };

    const onPointerUp = (e) => {
      if (this.joystick.pointerId === e.pointerId) {
        this.joystick.active = false;
        this.joystick.pointerId = null;
        this.moveX = 0;
        this.moveY = 0;
        if (knobEl) {
          knobEl.style.transform = "translate(0px, 0px)";
        }
      }
    };

    containerEl.addEventListener("pointerdown", onPointerDown, { passive: false });
    containerEl.addEventListener("pointermove", onPointerMove, { passive: false });
    containerEl.addEventListener("pointerup", onPointerUp);
    containerEl.addEventListener("pointercancel", onPointerUp);
    containerEl.addEventListener("lostpointercapture", onPointerUp);
  }

  handleJoystickMove(clientX, clientY, knobEl) {
    const dx = clientX - this.joystick.startX;
    const dy = clientY - this.joystick.startY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = this.joystick.radius;

    let clampedDist = Math.min(dist, maxRadius);
    let angle = Math.atan2(dy, dx);

    const nx = dist > 0 ? (clampedDist / maxRadius) * Math.cos(angle) : 0;
    const ny = dist > 0 ? (clampedDist / maxRadius) * Math.sin(angle) : 0;

    this.moveX = nx;
    this.moveY = ny;

    if (knobEl) {
      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;
      knobEl.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }
  }

  // Clear inputs manually when pausing or showing dialogs
  reset() {
    this.keys.clear();
    this.moveX = 0;
    this.moveY = 0;
    this.joystick.active = false;
    this.joystick.pointerId = null;
  }
}

/**
 * Adventure World - Game State Model
 * Explicit finite state machines for business phases and UI states.
 */

const PHASES = {
  DAY: "DAY",
  NIGHT: "NIGHT",
  COMPLETED: "COMPLETED"
};

const UI_STATES = {
  TITLE: "TITLE",
  SELECT: "SELECT",
  PLAY: "PLAY",
  DIALOG: "DIALOG",
  PAUSED: "PAUSED",
  VICTORY: "VICTORY"
};

class GameState {
  constructor(initialData = {}, questsConfig = null) {
    this.phase = initialData.phase || PHASES.DAY;
    this.uiState = UI_STATES.TITLE;

    this.avatarId = initialData.avatarId || "avatar-1";
    this.locale = initialData.locale || "en";
    this.muted = typeof initialData.muted === "boolean" ? initialData.muted : true;

    const spawn = initialData.position || { x: 650, y: 950 };
    this.player = {
      x: spawn.x,
      y: spawn.y,
      radius: 18,
      speed: questsConfig?.constants?.playerSpeed || 120,
      facing: "down",
      isMoving: false,
      walkTimer: 0,
      takeoffPos: { x: spawn.x, y: spawn.y },
      targetMove: null
    };

    // Abilities
    const consts = questsConfig?.constants || {};
    this.abilities = {
      flight: {
        active: false,
        timer: 0,
        cooldown: 0,
        duration: consts.flightDuration || 5.0,
        cooldownDuration: consts.flightCooldown || 3.0,
        speedMultiplier: consts.flightSpeedMultiplier || 1.25
      },
      invis: {
        active: false,
        timer: 0,
        cooldown: 0,
        duration: consts.invisDuration || 8.0,
        cooldownDuration: consts.invisCooldown || 4.0
      },
      torch: {
        active: this.phase === PHASES.NIGHT,
        range: consts.torchRange || 140
      }
    };

    // Quests & Stamps
    this.stamps = new Set(initialData.stamps || []);
    this.animalsObserved = new Set(initialData.animalsObserved || []);
    this.puppyPetted = Boolean(initialData.puppyPetted);
    this.puppyFed = Boolean(initialData.puppyFed);
    this.hasPuppyTreat = false; // picked up at puppy treat stall

    // Clues & Victory
    this.clues = new Set(initialData.clues || []);
    this.trailRevealed = Boolean(initialData.trailRevealed);
    this.winTriggered = Boolean(initialData.winTriggered);

    // Slide ride animation state
    this.slide = {
      active: false,
      progress: 0,
      speed: 0.35 // full slide takes ~2.8s
    };

    // Continuous illumination tracking for each clue
    this.clueHoldTimers = {
      sky: 0,
      quiet: 0,
      trail: 0
    };

    // UI Toast / Status notification
    this.toast = {
      text: "",
      timer: 0
    };

    // Active modal dialog
    this.modal = null;

    // Victory celebration animation
    this.celebration = {
      active: false,
      timer: 0
    };
  }

  showToast(text, duration = 2.5) {
    this.toast.text = text;
    this.toast.timer = duration;
  }

  canMoveAndAct() {
    return this.uiState === UI_STATES.PLAY;
  }

  setPhase(newPhase) {
    this.phase = newPhase;
    if (newPhase === PHASES.NIGHT) {
      this.abilities.torch.active = true;
    } else {
      this.abilities.torch.active = false;
    }
  }

  switchAvatar(newId) {
    if (["avatar-1", "avatar-2", "avatar-3"].includes(newId)) {
      this.avatarId = newId;
    }
  }

  // Safe landing validator will be injected from world
  safeLand(world) {
    if (!this.abilities.flight.active) return;
    this.abilities.flight.active = false;
    this.abilities.flight.cooldown = this.abilities.flight.cooldownDuration;

    if (world && !world.isWalkable(this.player.x, this.player.y)) {
      const safe = world.findNearestSafeSpot(this.player.x, this.player.y, this.player.takeoffPos);
      this.player.x = safe.x;
      this.player.y = safe.y;
    }
  }

  triggerFlight(world) {
    if (this.abilities.flight.active) {
      // Cancel flight early
      this.safeLand(world);
      return;
    }
    if (this.abilities.flight.cooldown > 0) {
      return "cooldown";
    }

    // Flight and invisibility are mutually exclusive
    if (this.abilities.invis.active) {
      this.abilities.invis.active = false;
      this.abilities.invis.cooldown = this.abilities.invis.cooldownDuration;
    }

    this.player.takeoffPos = { x: this.player.x, y: this.player.y };
    this.abilities.flight.active = true;
    this.abilities.flight.timer = this.abilities.flight.duration;
    return "ok";
  }

  triggerInvis(world) {
    if (this.abilities.invis.active) {
      // Cancel invis early
      this.abilities.invis.active = false;
      this.abilities.invis.cooldown = this.abilities.invis.cooldownDuration;
      return;
    }
    if (this.abilities.invis.cooldown > 0) {
      return "cooldown";
    }

    // Mutually exclusive: end flight first with safe landing
    if (this.abilities.flight.active) {
      this.safeLand(world);
    }

    this.abilities.invis.active = true;
    this.abilities.invis.timer = this.abilities.invis.duration;
    return "ok";
  }

  toggleTorch() {
    if (this.phase === PHASES.DAY) {
      return "daytime";
    }
    this.abilities.torch.active = !this.abilities.torch.active;
    return this.abilities.torch.active ? "on" : "off";
  }

  allStampsCollected() {
    return this.stamps.has("waterpark") && this.stamps.has("zoo") && this.stamps.has("puppy");
  }

  allCluesCollected() {
    return this.clues.has("sky") && this.clues.has("quiet") && this.clues.has("trail");
  }
}

/**
 * Adventure World - World Geometry, Collision, Entities & Slide Simulation
 */

class World {
  constructor(worldConfig) {
    this.width = worldConfig.width || 1600;
    this.height = worldConfig.height || 1200;
    this.zones = worldConfig.zones || [];
    this.landmarks = worldConfig.landmarks || {};
    this.slide = worldConfig.slide || {
      start: { x: 260, y: 200 },
      path: [{ x: 260, y: 200 }, { x: 500, y: 420 }],
      splash: { x: 500, y: 420 },
      exit: { x: 540, y: 440 }
    };
    this.animals = worldConfig.animals || [];
    this.obstacles = worldConfig.obstacles || [];
    this.puppyTrail = worldConfig.puppy_trail || [];
    this.lamps = worldConfig.lamps || [];
    
    // NPC Visitors
    this.visitors = (worldConfig.visitors || []).map((v, i) => ({
      id: `visitor_${i}`,
      x: v.x,
      y: v.y,
      color: v.color || "#38bdf8",
      route: v.route || [[v.x, v.y]],
      targetIdx: 1,
      speed: 35 + (i % 3) * 5,
      walkTimer: Math.random() * 5
    }));

    // Dynamic particles (water splash, sparks, confetti)
    this.particles = [];
  }

  isInsideRect(x, y, rect, margin = 18) {
    return (
      x >= rect.x - margin &&
      x <= rect.x + rect.w + margin &&
      y >= rect.y - margin &&
      y <= rect.y + rect.h + margin
    );
  }

  isWalkable(x, y, margin = 18) {
    // Check boundary
    if (x < 60 + margin || x > this.width - 60 - margin || y < 60 + margin || y > this.height - 60 - margin) {
      return false;
    }

    // Check all high and low obstacles
    for (const obs of this.obstacles) {
      if (this.isInsideRect(x, y, obs, margin)) {
        return false;
      }
    }
    return true;
  }

  isFlyable(x, y, margin = 18) {
    // Flight can fly over 'low' obstacles, but NOT 'high' obstacles or outer boundaries
    if (x < 60 + margin || x > this.width - 60 - margin || y < 60 + margin || y > this.height - 60 - margin) {
      return false;
    }

    for (const obs of this.obstacles) {
      if (obs.type === "high" && this.isInsideRect(x, y, obs, margin)) {
        return false;
      }
    }
    return true;
  }

  findNearestSafeSpot(targetX, targetY, fallback = { x: 650, y: 950 }) {
    if (this.isWalkable(targetX, targetY)) {
      return { x: targetX, y: targetY };
    }

    // Search in expanding concentric circles
    const radii = [15, 30, 45, 60, 80, 100];
    const angles = 12;
    for (const r of radii) {
      for (let i = 0; i < angles; i++) {
        const theta = (i * 2 * Math.PI) / angles;
        const testX = targetX + Math.cos(theta) * r;
        const testY = targetY + Math.sin(theta) * r;
        if (this.isWalkable(testX, testY)) {
          return { x: testX, y: testY };
        }
      }
    }

    // Return fallback takeoff position or spawn
    return this.isWalkable(fallback.x, fallback.y) ? fallback : { x: 650, y: 950 };
  }

  update(dt, isPlayState) {
    if (!isPlayState) return;

    // Update visitors along routes
    for (const v of this.visitors) {
      if (!v.route || v.route.length < 2) continue;
      const target = v.route[v.targetIdx];
      const dx = target[0] - v.x;
      const dy = target[1] - v.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 4) {
        v.targetIdx = (v.targetIdx + 1) % v.route.length;
      } else {
        v.x += (dx / dist) * v.speed * dt;
        v.y += (dy / dist) * v.speed * dt;
        v.walkTimer += dt * 5;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  spawnSplashParticles(x, y, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        color: Math.random() > 0.4 ? "#38bdf8" : "#ffffff",
        radius: 2 + Math.random() * 3.5,
        life: 0.6 + Math.random() * 0.4
      });
    }
  }

  spawnCelebrationParticles(count = 60) {
    const colors = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#fbbf24"];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: 650 + (Math.random() * 300 - 150),
        y: 840 + (Math.random() * 200 - 100),
        vx: (Math.random() - 0.5) * 140,
        vy: -60 - Math.random() * 120,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: 3 + Math.random() * 4,
        life: 1.5 + Math.random() * 1.5
      });
    }
  }

  // Get Catmull-Rom or cubic spline position along slide path
  getSlidePoint(progress) {
    const pts = this.slide.path;
    const clamped = Math.max(0, Math.min(1, progress));
    const totalSegments = pts.length - 1;
    const segment = Math.min(Math.floor(clamped * totalSegments), totalSegments - 1);
    const segT = (clamped * totalSegments) - segment;

    const p0 = pts[segment];
    const p1 = pts[segment + 1];

    // Smooth linear interpolation between path waypoints
    return {
      x: p0.x + (p1.x - p0.x) * segT,
      y: p0.y + (p1.y - p0.y) * segT
    };
  }
}

/**
 * Adventure World - Puppy Companion Entity
 * Ground navigation, tail wagging, sniffing trail sequence, and celebrations.
 */

class Puppy {
  constructor(initialX = 300, initialY = 860) {
    this.x = initialX;
    this.y = initialY;
    this.radius = 14;
    this.speed = 100;
    this.state = "follow"; // 'idle' | 'follow' | 'sniff' | 'celebrate'
    
    // Animation timers
    this.tailAngle = 0;
    this.breatheTimer = 0;
    this.walkTimer = 0;
    this.facing = "right";

    // Sniff trail navigation
    this.trailWaypoints = [
      { x: 320, y: 840 },
      { x: 260, y: 770 },
      { x: 190, y: 700 },
      { x: 140, y: 640 }
    ];
    this.sniffIndex = 0;
    this.pawprints = []; // Revealed pawprints [{ x, y }]
  }

  startSniffRoute() {
    this.state = "sniff";
    this.sniffIndex = 1;
    this.pawprints = [];
    this.x = this.trailWaypoints[0].x;
    this.y = this.trailWaypoints[0].y;
  }

  update(dt, player, gameState, world, soundEngine) {
    if (!gameState.canMoveAndAct()) return;

    this.breatheTimer += dt * 3;
    this.tailAngle = Math.sin(Date.now() / 120) * 0.6; // Energetic wagging

    if (this.state === "sniff") {
      this.updateSniff(dt, gameState, soundEngine);
    } else if (this.state === "follow") {
      this.updateFollow(dt, player, gameState, world);
    } else if (this.state === "celebrate") {
      // Jump and wag
      this.tailAngle = Math.sin(Date.now() / 80) * 0.9;
    }
  }

  updateSniff(dt, gameState, soundEngine) {
    if (this.sniffIndex >= this.trailWaypoints.length) {
      this.state = "celebrate";
      gameState.trailRevealed = true;
      if (soundEngine) soundEngine.playBark();
      return;
    }

    const target = this.trailWaypoints[this.sniffIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.facing = dx >= 0 ? "right" : "left";

    if (dist < 8) {
      // Arrived at waypoint, drop glowing pawprint
      this.pawprints.push({ x: target.x, y: target.y });
      if (soundEngine) soundEngine.playTone(600 + this.sniffIndex * 150, 0.1, 'sine', 0.1);
      this.sniffIndex++;
      if (this.sniffIndex >= this.trailWaypoints.length) {
        this.state = "celebrate";
        gameState.trailRevealed = true;
        if (soundEngine) soundEngine.playBark();
      }
    } else {
      const step = Math.min(this.speed * 0.8 * dt, dist);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      this.walkTimer += dt * 8;
    }
  }

  updateFollow(dt, player, gameState, world) {
    // If player is flying, puppy stays grounded and waits or moves toward player's ground projection
    const targetX = player.x;
    const targetY = player.y;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    // If too far (>320 units), smoothly catch up near player on a walkable spot
    if (dist > 320) {
      const safe = world.findNearestSafeSpot(player.x - 30, player.y + 20, { x: this.x, y: this.y });
      this.x = safe.x;
      this.y = safe.y;
      return;
    }

    // Keep pleasant companion distance (around 36-50 units)
    if (dist > 44) {
      this.facing = dx >= 0 ? "right" : "left";
      const step = Math.min(this.speed * dt, dist - 36);
      const nextX = this.x + (dx / dist) * step;
      const nextY = this.y + (dy / dist) * step;

      // Ground navigation obstacle check
      if (world.isWalkable(nextX, nextY, this.radius)) {
        this.x = nextX;
        this.y = nextY;
      } else if (world.isWalkable(nextX, this.y, this.radius)) {
        this.x = nextX;
      } else if (world.isWalkable(this.x, nextY, this.radius)) {
        this.y = nextY;
      }
      this.walkTimer += dt * 8;
    }
  }
}

/**
 * Adventure World - Quest Engine
 * Evaluates stamps, daytime interactions, continuous torch illumination, clues & victory.
 */


class QuestEngine {
  constructor(questsConfig, soundEngine) {
    this.config = questsConfig;
    this.sound = soundEngine;
    this.torchRange = questsConfig.constants.torchRange || 140;
    this.interactionRadius = questsConfig.constants.interactionRadius || 48;
    this.minHoldSec = questsConfig.constants.torchMinHoldSec || 1.0;
  }

  update(dt, state, world, puppy) {
    if (!state.canMoveAndAct()) return;

    // Handle slide ride animation
    if (state.slide.active) {
      state.slide.progress += state.slide.speed * dt;
      const pt = world.getSlidePoint(state.slide.progress);
      state.player.x = pt.x;
      state.player.y = pt.y;

      // When reaching near splash pool
      if (state.slide.progress >= 0.9 && !state.slide.splashed) {
        state.slide.splashed = true;
        world.spawnSplashParticles(world.slide.splash.x, world.slide.splash.y, 25);
        if (this.sound) this.sound.playSplash();
      }

      // Finish slide
      if (state.slide.progress >= 1.0) {
        state.slide.active = false;
        state.player.x = world.slide.exit.x;
        state.player.y = world.slide.exit.y;
        this.unlockStamp(state, "waterpark");
      }
      return; // Skip other interactions while sliding
    }

    // Update continuous flashlight illumination on night clues
    if (state.phase === PHASES.NIGHT && state.abilities.torch.active) {
      this.updateTorchIllumination(dt, state);
    } else {
      // Reset illumination hold timers if torch is off or in daytime
      state.clueHoldTimers.sky = 0;
      state.clueHoldTimers.quiet = 0;
      state.clueHoldTimers.trail = 0;
    }
  }

  updateTorchIllumination(dt, state) {
    const p = state.player;

    // 1. Sky Clue (Tower at 180, 180)
    if (!state.clues.has("sky")) {
      const dist = Math.hypot(p.x - 180, p.y - 180);
      if (dist <= this.torchRange && state.abilities.flight.active) {
        state.clueHoldTimers.sky = Math.min(this.minHoldSec, state.clueHoldTimers.sky + dt);
      } else {
        state.clueHoldTimers.sky = 0;
      }
    }

    // 2. Quiet Clue (Owl at 920, 480)
    if (!state.clues.has("quiet")) {
      const dist = Math.hypot(p.x - 920, p.y - 480);
      if (dist <= this.torchRange && state.abilities.invis.active) {
        state.clueHoldTimers.quiet = Math.min(this.minHoldSec, state.clueHoldTimers.quiet + dt);
      } else {
        state.clueHoldTimers.quiet = 0;
      }
    }

    // 3. Trail Clue (Trail end at 140, 640)
    if (!state.clues.has("trail")) {
      const dist = Math.hypot(p.x - 140, p.y - 640);
      if (dist <= this.torchRange && state.trailRevealed) {
        state.clueHoldTimers.trail = Math.min(this.minHoldSec, state.clueHoldTimers.trail + dt);
      } else {
        state.clueHoldTimers.trail = 0;
      }
    }
  }

  unlockStamp(state, stampId) {
    if (state.stamps.has(stampId)) return;
    state.stamps.add(stampId);
    if (this.sound) this.sound.playStamp();
    state.showToast(`🎉 ${stampId.toUpperCase()} STAMP COLLECTED!`);

    if (state.allStampsCollected()) {
      state.showToast("🌟 All stamps collected! Ready for night adventure?", 4.0);
    }
  }

  unlockClue(state, clueId) {
    if (state.clues.has(clueId)) return;
    state.clues.add(clueId);
    if (this.sound) this.sound.playClue();
    state.showToast(`⭐ FOUND STAR CLUE: ${clueId.toUpperCase()}!`, 3.5);

    if (state.allCluesCollected()) {
      state.showToast("🌟 All 3 clues gathered! Head to the Starglow Console in the Plaza!", 4.5);
    }
  }

  // Evaluate closest interactable target
  getInteractionPrompt(state, world, puppy, strings) {
    if (state.slide.active) return null;
    const p = state.player;

    // A. Victory Console (Entrance Plaza: 650, 840)
    const distConsole = Math.hypot(p.x - 650, p.y - 840);
    if (distConsole <= this.interactionRadius) {
      if (state.phase === PHASES.NIGHT && state.allCluesCollected() && !state.winTriggered) {
        return { id: "console", label: strings.prompt_console_ready, canAct: true };
      }
      if (state.phase === PHASES.NIGHT && !state.allCluesCollected()) {
        return { id: "console", label: strings.prompt_console_need_clues, canAct: false };
      }
    }

    // B. Night Gate (Entrance Plaza: 750, 920)
    const distNightGate = Math.hypot(p.x - 750, p.y - 920);
    if (distNightGate <= this.interactionRadius && state.phase === PHASES.DAY) {
      if (state.allStampsCollected()) {
        return { id: "night_gate", label: strings.prompt_night_gate, canAct: true };
      } else {
        return { id: "night_gate", label: `${strings.prompt_night_gate} (Need 3 stamps: ${state.stamps.size}/3)`, canAct: false };
      }
    }

    // C. Rainbow Slide (Water park: 260, 200)
    const distSlide = Math.hypot(p.x - world.slide.start.x, p.y - world.slide.start.y);
    if (distSlide <= this.interactionRadius) {
      return { id: "slide", label: strings.prompt_slide, canAct: true };
    }

    // D. Free Food Stall (Water park: 420, 520)
    const distSnack = Math.hypot(p.x - 420, p.y - 520);
    if (distSnack <= this.interactionRadius) {
      return { id: "human_snack", label: strings.prompt_snack, canAct: true };
    }

    // E. Free Dog Treat Stall (Puppy park: 160, 800)
    const distTreatStall = Math.hypot(p.x - 160, p.y - 800);
    if (distTreatStall <= this.interactionRadius) {
      return { id: "dog_treat_stall", label: strings.prompt_treat_stall, canAct: true };
    }

    // F. Night Clues (Priority in Night Phase)
    if (state.phase === PHASES.NIGHT) {
      // 1. Sky clue
      const distSky = Math.hypot(p.x - 180, p.y - 180);
      if (distSky <= this.interactionRadius && !state.clues.has("sky")) {
        const illuminated = state.clueHoldTimers.sky >= this.minHoldSec;
        const inFlight = state.abilities.flight.active;
        if (inFlight && illuminated) {
          return { id: "clue_sky", label: "⭐ Collect Sky Star Clue", canAct: true };
        } else if (!inFlight) {
          return { id: "clue_sky", label: "Fly up here with (F) to reach the star!", canAct: false };
        } else {
          const pct = Math.floor((state.clueHoldTimers.sky / this.minHoldSec) * 100);
          return { id: "clue_sky", label: `Shine flashlight with (L)... (${pct}%)`, canAct: false };
        }
      }

      // 2. Quiet clue (Owl)
      const distOwl = Math.hypot(p.x - 920, p.y - 480);
      if (distOwl <= this.interactionRadius && !state.clues.has("quiet")) {
        const illuminated = state.clueHoldTimers.quiet >= this.minHoldSec;
        const isInvis = state.abilities.invis.active;
        if (isInvis && illuminated) {
          return { id: "clue_quiet", label: "⭐ Collect Quiet Star Clue", canAct: true };
        } else if (!isInvis) {
          return { id: "clue_quiet", label: "Shy owl hides! Turn invisible with (I)!", canAct: false };
        } else {
          const pct = Math.floor((state.clueHoldTimers.quiet / this.minHoldSec) * 100);
          return { id: "clue_quiet", label: `Shine flashlight at owl... (${pct}%)`, canAct: false };
        }
      }

      // 3. Trail clue (Trail end)
      const distTrail = Math.hypot(p.x - 140, p.y - 640);
      if (distTrail <= this.interactionRadius && !state.clues.has("trail")) {
        const illuminated = state.clueHoldTimers.trail >= this.minHoldSec;
        if (state.trailRevealed && illuminated) {
          return { id: "clue_trail", label: "⭐ Collect Trail Star Clue", canAct: true };
        } else if (!state.trailRevealed) {
          return { id: "clue_trail", label: "Follow the puppy's scent trail first!", canAct: false };
        } else {
          const pct = Math.floor((state.clueHoldTimers.trail / this.minHoldSec) * 100);
          return { id: "clue_trail", label: `Shine flashlight here... (${pct}%)`, canAct: false };
        }
      }
    }

    // G. Zoo Animals
    for (const animal of world.animals) {
      const dist = Math.hypot(p.x - animal.look_x, p.y - animal.look_y);
      if (dist <= this.interactionRadius) {
        const animalName = strings.animals[animal.id] || animal.id;
        return {
          id: `animal_${animal.id}`,
          animalId: animal.id,
          label: `${strings.prompt_observe} ${animalName}`,
          canAct: true
        };
      }
    }

    // H. Puppy Sniff Spot (Puppy park: 320, 840)
    const distSniffSpot = Math.hypot(p.x - 320, p.y - 840);
    if (distSniffSpot <= this.interactionRadius && state.phase === PHASES.NIGHT && !state.clues.has("trail")) {
      return { id: "puppy_sniff", label: strings.prompt_sniff, canAct: true };
    }

    // I. Puppy Pet / Feed interaction
    const distPuppy = Math.hypot(p.x - puppy.x, p.y - puppy.y);
    if (distPuppy <= this.interactionRadius) {
      if (!state.puppyPetted) {
        return { id: "puppy_pet", label: strings.prompt_pet, canAct: true };
      }
      if (state.hasPuppyTreat && !state.puppyFed) {
        return { id: "puppy_feed", label: strings.prompt_feed, canAct: true };
      }
      return { id: "puppy_pet", label: strings.prompt_pet, canAct: true };
    }

    return null;
  }

  // Handle interaction trigger (E / Tap)
  handleInteraction(state, world, puppy, strings, onSave) {
    if (!state.canMoveAndAct()) return;
    const prompt = this.getInteractionPrompt(state, world, puppy, strings);
    if (!prompt || !prompt.canAct) return;

    // 1. Victory Console
    if (prompt.id === "console") {
      if (state.allCluesCollected() && !state.winTriggered) {
        state.winTriggered = true;
        state.celebration.active = true;
        state.celebration.timer = 3.5;
        world.spawnCelebrationParticles(80);
        if (this.sound) this.sound.playVictory();
        onSave?.(true);

        setTimeout(() => {
          state.uiState = UI_STATES.VICTORY;
        }, 3200);
      }
      return;
    }

    // 2. Night Gate
    if (prompt.id === "night_gate") {
      if (state.allStampsCollected()) {
        state.setPhase(PHASES.NIGHT);
        state.modal = {
          title: strings.night_welcome_title,
          text: strings.night_welcome_text,
          buttonText: strings.btn_got_it,
          onConfirm: () => {
            state.uiState = UI_STATES.PLAY;
            state.modal = null;
          }
        };
        state.uiState = UI_STATES.DIALOG;
        onSave?.(true);
      }
      return;
    }

    // 3. Rainbow Slide
    if (prompt.id === "slide") {
      state.slide.active = true;
      state.slide.progress = 0;
      state.slide.splashed = false;
      if (this.sound) this.sound.playTone(440, 0.4, 'sine', 0.1);
      return;
    }

    // 4. Human Snack
    if (prompt.id === "human_snack") {
      state.showToast(strings.snack_cheer);
      if (this.sound) this.sound.playChime();
      return;
    }

    // 5. Puppy Treat Stall
    if (prompt.id === "dog_treat_stall") {
      state.hasPuppyTreat = true;
      state.showToast(strings.treat_get);
      if (this.sound) this.sound.playTone(600, 0.15, 'triangle', 0.12);
      return;
    }

    // 6. Puppy Pet / Feed
    if (prompt.id === "puppy_pet" || prompt.id === "puppy_feed") {
      if (prompt.id === "puppy_feed" && state.hasPuppyTreat) {
        state.puppyFed = true;
        state.hasPuppyTreat = false;
        puppy.state = "celebrate";
        state.showToast(strings.feed_puppy_cheer);
        if (this.sound) this.sound.playBark();
      } else {
        state.puppyPetted = true;
        puppy.state = "celebrate";
        state.showToast(strings.pet_puppy_cheer);
        if (this.sound) this.sound.playBark();
      }

      // Check puppy stamp
      if (state.puppyPetted && state.puppyFed) {
        this.unlockStamp(state, "puppy");
      }
      onSave?.(true);
      return;
    }

    // 7. Puppy Sniff
    if (prompt.id === "puppy_sniff") {
      puppy.startSniffRoute();
      state.showToast(strings.puppy_sniffing);
      return;
    }

    // 8. Clues
    if (prompt.id === "clue_sky") {
      this.unlockClue(state, "sky");
      onSave?.(true);
      return;
    }
    if (prompt.id === "clue_quiet") {
      this.unlockClue(state, "quiet");
      onSave?.(true);
      return;
    }
    if (prompt.id === "clue_trail") {
      this.unlockClue(state, "trail");
      onSave?.(true);
      return;
    }

    // 9. Animal Observation
    if (prompt.animalId) {
      const aid = prompt.animalId;
      state.animalsObserved.add(aid);
      const animalDesc = strings.animals[`${aid}_desc`] || "";
      state.showToast(`${strings.animals[aid]}: ${animalDesc}`, 3.0);
      if (this.sound) this.sound.playChime();

      if (state.animalsObserved.size >= 3) {
        this.unlockStamp(state, "zoo");
      }
      onSave?.(true);
      return;
    }
  }
}

/**
 * Adventure World - Canvas 2D Vector & Lighting Renderer
 * Picture-book 2.5D aesthetic with day/night cycles, dynamic lighting, and expressive animations.
 */


class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = window.devicePixelRatio || 1;

    // Lighting offscreen canvas for night mask
    this.lightCanvas = document.createElement("canvas");
    this.lightCtx = this.lightCanvas.getContext("2d");

    // Camera
    this.camera = { x: 650, y: 950 };
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;

    this.lightCanvas.width = width * this.dpr;
    this.lightCanvas.height = height * this.dpr;
  }

  updateCamera(targetX, targetY, worldWidth, worldHeight) {
    const viewW = this.canvas.clientWidth;
    const viewH = this.canvas.clientHeight;

    // Smooth camera lag
    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.y += (targetY - this.camera.y) * 0.1;

    // Clamp camera within world bounds
    const minX = viewW / 2;
    const maxX = Math.max(minX, worldWidth - viewW / 2);
    const minY = viewH / 2;
    const maxY = Math.max(minY, worldHeight - viewH / 2);

    this.camera.x = Math.max(minX, Math.min(maxX, this.camera.x));
    this.camera.y = Math.max(minY, Math.min(maxY, this.camera.y));
  }

  worldToScreen(wx, wy) {
    const viewW = this.canvas.clientWidth;
    const viewH = this.canvas.clientHeight;
    return {
      x: (wx - this.camera.x + viewW / 2) * this.dpr,
      y: (wy - this.camera.y + viewH / 2) * this.dpr
    };
  }

  screenToWorld(sx, sy) {
    const viewW = this.canvas.clientWidth;
    const viewH = this.canvas.clientHeight;
    return {
      x: this.camera.x + (sx - viewW / 2),
      y: this.camera.y + (sy - viewH / 2)
    };
  }

  render(state, world, puppy, questEngine, strings) {
    const ctx = this.ctx;
    const viewW = this.canvas.clientWidth;
    const viewH = this.canvas.clientHeight;

    this.updateCamera(state.player.x, state.player.y, world.width, world.height);

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, viewW, viewH);

    // Transform world to camera
    ctx.save();
    ctx.translate(viewW / 2 - this.camera.x, viewH / 2 - this.camera.y);

    // 1. Terrain & Zones
    this.drawTerrain(ctx, world);

    // 2. Zone Decor & Water Splash Zone
    this.drawZoneDecorations(ctx, world, state);

    // 3. Rainbow Slide
    this.drawSlide(ctx, world.slide);

    // 4. Animal Enclosures & Animals
    this.drawAnimals(ctx, world.animals, state);

    // 5. Puppy Trail & Pawprints
    this.drawPuppyTrail(ctx, puppy, state);

    // 6. Puppy Companion
    this.drawPuppy(ctx, puppy);

    // 7. NPC Visitors
    this.drawVisitors(ctx, world.visitors);

    // 8. Player Character & Target Destination
    if (state.player.targetMove) {
      this.drawTargetMarker(ctx, state.player.targetMove.x, state.player.targetMove.y);
    }
    this.drawPlayer(ctx, state);

    // 9. World Particles
    this.drawParticles(ctx, world.particles);

    // 10. Street Lamps & Starglow Console
    this.drawLampsAndLandmarks(ctx, world, state);

    // 11. Interactive floating prompt badge
    const prompt = questEngine.getInteractionPrompt(state, world, puppy, strings);
    if (prompt) {
      this.drawInteractionBadge(ctx, state.player.x, state.player.y - 42, prompt);
    }

    ctx.restore(); // restore camera

    // 12. Night Lighting Overlay
    if (state.phase === PHASES.NIGHT) {
      this.drawNightLighting(state, world, puppy, viewW, viewH);
    }

    // 13. Screen Celebrations
    if (state.celebration.active) {
      this.drawCelebrationScreen(ctx, viewW, viewH, state.celebration.timer);
    }

    ctx.restore();
  }

  drawTerrain(ctx, world) {
    // Base grass
    ctx.fillStyle = "#86efac";
    ctx.fillRect(0, 0, world.width, world.height);

    // Park outer perimeter hedge
    ctx.fillStyle = "#15803d";
    ctx.fillRect(40, 40, world.width - 80, 20);
    ctx.fillRect(40, world.height - 60, world.width - 80, 20);
    ctx.fillRect(40, 40, 20, world.height - 80);
    ctx.fillRect(world.width - 60, 40, 20, world.height - 80);

    // Zone backdrops
    // A. Entrance Plaza
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.roundRect(500, 750, 600, 400, 32);
    ctx.fill();

    // Plaza cobblestone pattern
    ctx.strokeStyle = "#fcd34d";
    ctx.lineWidth = 2;
    for (let x = 520; x < 1080; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 760);
      ctx.lineTo(x, 1140);
      ctx.stroke();
    }

    // Main paths
    ctx.fillStyle = "#fef3c7";
    // Path from Plaza to Waterpark
    ctx.beginPath();
    ctx.roundRect(360, 580, 180, 220, 20);
    ctx.fill();
    // Path from Plaza to Zoo
    ctx.beginPath();
    ctx.roundRect(740, 580, 180, 220, 20);
    ctx.fill();
    // Path between Waterpark & Zoo
    ctx.beginPath();
    ctx.roundRect(460, 360, 460, 80, 16);
    ctx.fill();

    // B. Waterpark Zone
    ctx.fillStyle = "#bae6fd";
    ctx.beginPath();
    ctx.roundRect(90, 90, 680, 580, 32);
    ctx.fill();

    // Splash Pool
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.roundRect(240, 380, 340, 160, 28);
    ctx.fill();

    // C. Wildlife Zoo Zone
    ctx.fillStyle = "#d9f99d";
    ctx.beginPath();
    ctx.roundRect(830, 90, 680, 580, 32);
    ctx.fill();

    // D. Puppy Meadow
    ctx.fillStyle = "#bef264";
    ctx.beginPath();
    ctx.roundRect(90, 730, 400, 400, 32);
    ctx.fill();
  }

  drawZoneDecorations(ctx, world, state) {
    // 1. Main Gate
    ctx.fillStyle = "#f97316";
    ctx.fillRect(580, 1100, 140, 24);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ADVENTURE WORLD", 650, 1117);

    // 2. Water Park Features
    // Water Sprayers
    const sprayTime = Date.now() / 300;
    const sprayRadius = 12 + Math.sin(sprayTime) * 4;
    ctx.fillStyle = "rgba(56, 189, 248, 0.6)";
    ctx.beginPath();
    ctx.arc(340, 450, sprayRadius, 0, Math.PI * 2);
    ctx.arc(460, 460, sprayRadius, 0, Math.PI * 2);
    ctx.fill();

    // Free Human Snack Stand
    ctx.fillStyle = "#ec4899";
    ctx.fillRect(400, 500, 40, 30);
    ctx.fillStyle = "#fbcfe8";
    ctx.fillRect(395, 490, 50, 12);
    ctx.fillStyle = "#831843";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("FREE 🍬", 420, 500);

    // Free Dog Treat Stand
    ctx.fillStyle = "#d97706";
    ctx.fillRect(140, 780, 40, 30);
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(135, 770, 50, 12);
    ctx.fillStyle = "#78350f";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("DOG 🦴", 160, 780);

    // Sky Clue High Observation Deck
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(150, 150, 60, 60);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(155, 155, 50, 50);

    // Low obstacle barrier in front of Sky Tower
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(110, 230, 140, 20);
    ctx.fillStyle = "#78350f";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("LOW BARRIER (FLY OVER)", 180, 244);

    // Star icon atop Sky Observation Deck
    const starPulse = Math.sin(Date.now() / 250) * 3;
    ctx.fillStyle = state.clues.has("sky") ? "#10b981" : "#fbbf24";
    ctx.font = `${24 + starPulse}px sans-serif`;
    ctx.fillText("⭐", 180, 190);
  }

  drawSlide(ctx, slide) {
    const pts = slide.path;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Rainbow slide stripes
    const rainbowColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];
    rainbowColors.forEach((color, i) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 32 - i * 4;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < pts.length; j++) {
        ctx.lineTo(pts[j].x, pts[j].y);
      }
      ctx.stroke();
    });

    // Slide ladder tower
    ctx.fillStyle = "#64748b";
    ctx.fillRect(pts[0].x - 20, pts[0].y - 20, 40, 40);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("SLIDE", pts[0].x, pts[0].y + 5);

    ctx.restore();
  }

  drawAnimals(ctx, animals, state) {
    for (const a of animals) {
      // Draw enclosure fence if present
      if (a.enclosure) {
        ctx.strokeStyle = "#92400e";
        ctx.lineWidth = 4;
        ctx.strokeRect(a.enclosure.x, a.enclosure.y, a.enclosure.w, a.enclosure.h);

        // Fence posts
        ctx.fillStyle = "#78350f";
        for (let fx = a.enclosure.x; fx <= a.enclosure.x + a.enclosure.w; fx += 30) {
          ctx.fillRect(fx - 3, a.enclosure.y - 3, 6, 6);
          ctx.fillRect(fx - 3, a.enclosure.y + a.enclosure.h - 3, 6, 6);
        }
      }

      ctx.save();
      ctx.translate(a.x, a.y);
      const isObserved = state.animalsObserved.has(a.id);
      const bob = Math.sin((Date.now() / 400) + a.x) * 3;

      if (a.id === "lion") {
        // Mane
        ctx.fillStyle = "#d97706";
        ctx.beginPath();
        ctx.arc(0, bob, 24, 0, Math.PI * 2);
        ctx.fill();
        // Face
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(0, bob, 16, 0, Math.PI * 2);
        ctx.fill();
        // Eyes & Nose
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-6, bob - 3, 3, 4);
        ctx.fillRect(3, bob - 3, 3, 4);
        ctx.fillRect(-2, bob + 3, 4, 3);
      } else if (a.id === "crocodile") {
        ctx.fillStyle = "#15803d";
        ctx.beginPath();
        ctx.ellipse(0, bob, 26, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(-10, bob - 6, 12, 12);
        // Snout
        ctx.fillStyle = "#166534";
        ctx.fillRect(10, bob - 4, 14, 8);
      } else if (a.id === "giraffe") {
        // Long neck
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(-6, bob - 30, 12, 34);
        ctx.fillStyle = "#b45309";
        ctx.fillRect(-4, bob - 20, 8, 8);
        // Head
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(0, bob - 34, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (a.id === "elephant") {
        // Big ears
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.arc(-16, bob, 14, 0, Math.PI * 2);
        ctx.arc(16, bob, 14, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.fillStyle = "#cbd5e1";
        ctx.beginPath();
        ctx.arc(0, bob, 18, 0, Math.PI * 2);
        ctx.fill();
        // Trunk
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(-4, bob + 8, 8, 16);
      } else if (a.id === "penguin") {
        // Ice rock base
        ctx.fillStyle = "#e0f2fe";
        ctx.beginPath();
        ctx.ellipse(0, bob + 10, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tuxedo body
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.ellipse(0, bob, 14, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        // White belly
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(0, bob + 2, 8, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(-4, bob - 10);
        ctx.lineTo(4, bob - 10);
        ctx.lineTo(0, bob - 4);
        ctx.fill();
      } else if (a.id === "owl") {
        // Wooden perch
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-20, 12, 40, 8);

        // Shy Owl logic: if player is near and NOT invisible, owl shrinks or looks away
        const pDist = Math.hypot(state.player.x - 920, state.player.y - 480);
        const hides = pDist < 120 && !state.abilities.invis.active;

        if (hides) {
          ctx.globalAlpha = 0.4;
        }
        ctx.fillStyle = "#854d0e";
        ctx.beginPath();
        ctx.ellipse(0, bob, 15, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Big round owl eyes
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(-6, bob - 6, 6, 0, Math.PI * 2);
        ctx.arc(6, bob - 6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(-6, bob - 6, 3, 0, Math.PI * 2);
        ctx.arc(6, bob - 6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Observed checkmark
      if (isObserved) {
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("✓", 16, bob - 16);
      }

      ctx.restore();
    }
  }

  drawPuppyTrail(ctx, puppy, state) {
    // Draw revealed glowing pawprints
    const prints = state.trailRevealed
      ? [{ x: 260, y: 770 }, { x: 190, y: 700 }, { x: 140, y: 640 }]
      : puppy.pawprints;

    ctx.save();
    for (const pt of prints) {
      const glow = Math.sin(Date.now() / 200) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(250, 204, 21, ${glow})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🐾", pt.x, pt.y + 5);
    }

    // Secret spot indicator at trail end
    if (state.trailRevealed && !state.clues.has("trail")) {
      const pulse = Math.sin(Date.now() / 200) * 4;
      ctx.fillStyle = "#fbbf24";
      ctx.font = `${22 + pulse}px sans-serif`;
      ctx.fillText("⭐", 140, 630);
    }

    ctx.restore();
  }

  drawPuppy(ctx, puppy) {
    ctx.save();
    ctx.translate(puppy.x, puppy.y);

    const isFlipped = puppy.facing === "left";
    if (isFlipped) ctx.scale(-1, 1);

    // Tail wagging
    ctx.save();
    ctx.translate(-14, -4);
    ctx.rotate(puppy.tailAngle);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(-4, -10, 5, 12);
    ctx.restore();

    // Body
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(10, -8, 10, 0, Math.PI * 2);
    ctx.fill();

    // Floppy Ear
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.ellipse(8, -4, 4, 7, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Eye & Nose
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(13, -10, 2, 0, Math.PI * 2);
    ctx.arc(17, -7, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Red Collar with little star bell
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(4, -3, 5, 8);
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(6, 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawVisitors(ctx, visitors) {
    for (const v of visitors) {
      ctx.save();
      ctx.translate(v.x, v.y);
      const bob = Math.sin(v.walkTimer) * 2;

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.beginPath();
      ctx.ellipse(0, 14, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body / Clothes
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.roundRect(-8, -12 + bob, 16, 22, 6);
      ctx.fill();

      // Head
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(0, -18 + bob, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  drawPlayer(ctx, state) {
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);

    const isFlying = state.abilities.flight.active;
    const isInvis = state.abilities.invis.active;

    // Invisibility transparency
    if (isInvis) {
      ctx.globalAlpha = 0.4;
      // Cyan shimmer aura
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shadow
    const shadowScale = isFlying ? 0.6 : 1.0;
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 16, 12 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Height offset when flying
    const floatY = isFlying ? -22 + Math.sin(Date.now() / 150) * 4 : 0;
    ctx.translate(0, floatY);

    // Flying wings/jetpack sparkles
    if (isFlying) {
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(-16, 0, 6, 0, Math.PI * 2);
      ctx.arc(16, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body based on avatar
    const avatars = {
      "avatar-1": { hat: "#0284c7", shirt: "#38bdf8", pants: "#fef08a" },
      "avatar-2": { hat: "#16a34a", shirt: "#4ade80", pants: "#475569" },
      "avatar-3": { hat: "#ea580c", shirt: "#fb923c", pants: "#0284c7" }
    };
    const colors = avatars[state.avatarId] || avatars["avatar-1"];

    // Legs / Walking bob
    const legOffset = p.isMoving ? Math.sin(p.walkTimer) * 4 : 0;
    ctx.fillStyle = colors.pants;
    ctx.fillRect(-7, 8 + legOffset, 5, 8);
    ctx.fillRect(2, 8 - legOffset, 5, 8);

    // Body / Shirt
    ctx.fillStyle = colors.shirt;
    ctx.beginPath();
    ctx.roundRect(-10, -6, 20, 16, 5);
    ctx.fill();

    // Head
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(0, -14, 10, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(-3, -14, 1.8, 0, Math.PI * 2);
    ctx.arc(3, -14, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Hat
    ctx.fillStyle = colors.hat;
    ctx.beginPath();
    ctx.arc(0, -18, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-12, -19, 24, 4);

    ctx.restore();
  }

  drawLampsAndLandmarks(ctx, world, state) {
    // 1. Street Lamps
    for (const lamp of world.lamps) {
      ctx.fillStyle = "#334155";
      ctx.fillRect(lamp.x - 3, lamp.y - 20, 6, 24);
      // Lamp bulb
      const bulbColor = (state.phase === PHASES.NIGHT || state.phase === PHASES.COMPLETED) ? "#fef08a" : "#cbd5e1";
      ctx.fillStyle = bulbColor;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y - 22, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Starglow Console (Central Plaza: 650, 840)
    const isRestored = state.phase === PHASES.COMPLETED || state.winTriggered;
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.roundRect(620, 820, 60, 40, 8);
    ctx.fill();

    // Star Globe
    const globePulse = Math.sin(Date.now() / 200) * 3;
    ctx.fillStyle = isRestored ? "#fbbf24" : "#94a3b8";
    ctx.beginPath();
    ctx.arc(650, 810, 16 + (isRestored ? globePulse : 0), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⭐", 650, 816);

    // Starglow light rays when completed
    if (isRestored) {
      ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(650, 810, 40 + globePulse * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawInteractionBadge(ctx, x, y, prompt) {
    ctx.save();
    ctx.font = "bold 12px sans-serif";
    const textWidth = ctx.measureText(prompt.label).width;
    const badgeW = textWidth + 24;
    const badgeH = 28;

    // Background pill
    ctx.fillStyle = prompt.canAct ? "#2563eb" : "#475569";
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.roundRect(x - badgeW / 2, y - badgeH / 2, badgeW, badgeH, 14);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(prompt.label, x, y);

    ctx.restore();
  }

  drawParticles(ctx, particles) {
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTargetMarker(ctx, x, y) {
    ctx.save();
    const pulse = (Date.now() % 800) / 800;
    const r = 6 + pulse * 14;
    const alpha = Math.max(0, 1.0 - pulse);
    ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawNightLighting(state, world, puppy, viewW, viewH) {
    const lCtx = this.lightCtx;
    lCtx.save();
    lCtx.scale(this.dpr, this.dpr);
    lCtx.clearRect(0, 0, viewW, viewH);

    // Dark twilight fill
    lCtx.fillStyle = "rgba(8, 14, 30, 0.88)";
    lCtx.fillRect(0, 0, viewW, viewH);

    // Cut out lights with 'destination-out'
    lCtx.globalCompositeOperation = "destination-out";

    // A. Player Flashlight
    if (state.abilities.torch.active) {
      const screenP = this.worldToScreen(state.player.x, state.player.y);
      const torchR = state.abilities.torch.range * this.dpr;

      const grad = lCtx.createRadialGradient(
        screenP.x / this.dpr, screenP.y / this.dpr, 10,
        screenP.x / this.dpr, screenP.y / this.dpr, torchR / this.dpr
      );
      grad.addColorStop(0, "rgba(0, 0, 0, 1.0)");
      grad.addColorStop(0.7, "rgba(0, 0, 0, 0.75)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");

      lCtx.fillStyle = grad;
      lCtx.beginPath();
      lCtx.arc(screenP.x / this.dpr, screenP.y / this.dpr, torchR / this.dpr, 0, Math.PI * 2);
      lCtx.fill();
    }

    // B. Street Lamps Light Cutouts
    for (const lamp of world.lamps) {
      const s = this.worldToScreen(lamp.x, lamp.y - 20);
      const grad = lCtx.createRadialGradient(
        s.x / this.dpr, s.y / this.dpr, 5,
        s.x / this.dpr, s.y / this.dpr, 60
      );
      grad.addColorStop(0, "rgba(0, 0, 0, 0.85)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");

      lCtx.fillStyle = grad;
      lCtx.beginPath();
      lCtx.arc(s.x / this.dpr, s.y / this.dpr, 60, 0, Math.PI * 2);
      lCtx.fill();
    }

    // C. Glowing Pawprints Cutout
    if (state.trailRevealed || puppy.pawprints.length > 0) {
      const prints = state.trailRevealed
        ? [{ x: 260, y: 770 }, { x: 190, y: 700 }, { x: 140, y: 640 }]
        : puppy.pawprints;
      for (const pt of prints) {
        const s = this.worldToScreen(pt.x, pt.y);
        const grad = lCtx.createRadialGradient(
          s.x / this.dpr, s.y / this.dpr, 2,
          s.x / this.dpr, s.y / this.dpr, 28
        );
        grad.addColorStop(0, "rgba(0, 0, 0, 0.9)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        lCtx.fillStyle = grad;
        lCtx.beginPath();
        lCtx.arc(s.x / this.dpr, s.y / this.dpr, 28, 0, Math.PI * 2);
        lCtx.fill();
      }
    }

    // D. Starglow Console Light Cutout
    const sConsole = this.worldToScreen(650, 810);
    const gradConsole = lCtx.createRadialGradient(
      sConsole.x / this.dpr, sConsole.y / this.dpr, 10,
      sConsole.x / this.dpr, sConsole.y / this.dpr, 80
    );
    gradConsole.addColorStop(0, "rgba(0, 0, 0, 0.9)");
    gradConsole.addColorStop(1, "rgba(0, 0, 0, 0)");
    lCtx.fillStyle = gradConsole;
    lCtx.beginPath();
    lCtx.arc(sConsole.x / this.dpr, sConsole.y / this.dpr, 80, 0, Math.PI * 2);
    lCtx.fill();

    lCtx.restore();

    // Blit lighting onto main canvas
    this.ctx.drawImage(this.lightCanvas, 0, 0, viewW, viewH);
  }

  drawCelebrationScreen(ctx, w, h, timer) {
    ctx.save();
    const alpha = Math.min(0.4, timer * 0.15);
    ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/**
 * Adventure World - Main Controller & Game Loop
 */









class GameApp {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.world = null;
    this.state = null;
    this.saveMgr = null;
    this.puppy = null;
    this.quests = null;
    this.renderer = null;
    this.sound = null;
    this.input = null;

    this.localeData = { en: null, zh: null };
    this.lastTime = 0;
    this.running = false;
  }

  async init() {
    
    const EMBEDDED_WORLD = {
  "width": 1600,
  "height": 1200,
  "spawn": {
    "x": 650,
    "y": 950
  },
  "zones": [
    {
      "id": "plaza",
      "name_en": "Entrance Plaza",
      "name_zh": "入口广场",
      "bounds": { "x": 500, "y": 750, "w": 600, "h": 400 },
      "color": "#fef3c7"
    },
    {
      "id": "waterpark",
      "name_en": "Rainbow Water Park",
      "name_zh": "彩虹水上乐园",
      "bounds": { "x": 80, "y": 80, "w": 700, "h": 600 },
      "color": "#e0f2fe"
    },
    {
      "id": "zoo",
      "name_en": "Wildlife Zoo",
      "name_zh": "野生动物园",
      "bounds": { "x": 820, "y": 80, "w": 700, "h": 600 },
      "color": "#ecfccb"
    },
    {
      "id": "puppy_park",
      "name_en": "Puppy Meadow",
      "name_zh": "小狗草地乐园",
      "bounds": { "x": 80, "y": 720, "w": 420, "h": 420 },
      "color": "#fef08a"
    }
  ],
  "landmarks": {
    "gate": { "x": 650, "y": 1080, "label_en": "Main Gate", "label_zh": "乐园大门" },
    "map_board": { "x": 550, "y": 920, "label_en": "Park Map", "label_zh": "游园地图" },
    "starglow_console": { "x": 650, "y": 840, "radius": 48, "label_en": "Starglow Console", "label_zh": "星星灯控制台" },
    "night_gate": { "x": 750, "y": 920, "radius": 48, "label_en": "Night Tour Portal", "label_zh": "夜游传送门" },
    "human_snack_stall": { "x": 420, "y": 520, "radius": 48, "label_en": "Free Treat Stand", "label_zh": "免费甜品摊" },
    "puppy_treat_stall": { "x": 160, "y": 800, "radius": 48, "label_en": "Free Dog Treat Stand", "label_zh": "免费狗粮饼干站" },
    "sky_tower": { "x": 180, "y": 180, "radius": 48, "label_en": "Sky Observation Deck", "label_zh": "高空观察台" },
    "puppy_sniff_spot": { "x": 320, "y": 840, "radius": 48, "label_en": "Sniff Start Spot", "label_zh": "嗅探起点" },
    "trail_end_spot": { "x": 140, "y": 640, "radius": 48, "label_en": "Secret Trail End", "label_zh": "神秘脚印终点" }
  },
  "slide": {
    "start": { "x": 260, "y": 200 },
    "path": [
      { "x": 260, "y": 200 },
      { "x": 300, "y": 260 },
      { "x": 360, "y": 320 },
      { "x": 440, "y": 380 },
      { "x": 500, "y": 420 }
    ],
    "splash": { "x": 500, "y": 420 },
    "exit": { "x": 540, "y": 440 }
  },
  "animals": [
    {
      "id": "lion",
      "x": 980,
      "y": 220,
      "look_x": 980,
      "look_y": 290,
      "enclosure": { "x": 910, "y": 140, "w": 180, "h": 130 }
    },
    {
      "id": "crocodile",
      "x": 1200,
      "y": 200,
      "look_x": 1200,
      "look_y": 270,
      "enclosure": { "x": 1130, "y": 130, "w": 180, "h": 120 }
    },
    {
      "id": "giraffe",
      "x": 1420,
      "y": 230,
      "look_x": 1360,
      "look_y": 290,
      "enclosure": { "x": 1340, "y": 140, "w": 180, "h": 150 }
    },
    {
      "id": "elephant",
      "x": 1420,
      "y": 480,
      "look_x": 1340,
      "look_y": 480,
      "enclosure": { "x": 1340, "y": 400, "w": 180, "h": 160 }
    },
    {
      "id": "penguin",
      "x": 1160,
      "y": 520,
      "look_x": 1160,
      "look_y": 450,
      "enclosure": { "x": 1080, "y": 460, "w": 180, "h": 120 }
    },
    {
      "id": "owl",
      "x": 920,
      "y": 480,
      "look_x": 920,
      "look_y": 480,
      "enclosure": null
    }
  ],
  "obstacles": [
    { "id": "border_top", "type": "high", "x": 40, "y": 40, "w": 1520, "h": 20 },
    { "id": "border_bottom", "type": "high", "x": 40, "y": 1140, "w": 1520, "h": 20 },
    { "id": "border_left", "type": "high", "x": 40, "y": 40, "w": 20, "h": 1120 },
    { "id": "border_right", "type": "high", "x": 1540, "y": 40, "w": 20, "h": 1120 },
    
    { "id": "sky_barrier", "type": "low", "x": 110, "y": 230, "w": 140, "h": 20 },
    
    { "id": "slide_tower_wall", "type": "high", "x": 210, "y": 140, "w": 50, "h": 50 },
    
    { "id": "lion_pen", "type": "high", "x": 910, "y": 140, "w": 180, "h": 120 },
    { "id": "croc_pen", "type": "high", "x": 1130, "y": 130, "w": 180, "h": 110 },
    { "id": "giraffe_pen", "type": "high", "x": 1340, "y": 140, "w": 180, "h": 130 },
    { "id": "elephant_pen", "type": "high", "x": 1340, "y": 400, "w": 180, "h": 140 },
    { "id": "penguin_pen", "type": "high", "x": 1080, "y": 480, "w": 180, "h": 100 },
    
    { "id": "puppy_fence_top", "type": "high", "x": 80, "y": 720, "w": 200, "h": 16 },
    { "id": "puppy_fence_right", "type": "high", "x": 490, "y": 720, "w": 16, "h": 380 }
  ],
  "puppy_trail": [
    { "x": 320, "y": 840 },
    { "x": 260, "y": 770 },
    { "x": 190, "y": 700 },
    { "x": 140, "y": 640 }
  ],
  "lamps": [
    { "x": 580, "y": 800 },
    { "x": 720, "y": 800 },
    { "x": 580, "y": 980 },
    { "x": 720, "y": 980 },
    { "x": 460, "y": 650 },
    { "x": 650, "y": 650 },
    { "x": 820, "y": 650 },
    { "x": 300, "y": 500 },
    { "x": 480, "y": 300 },
    { "x": 220, "y": 280 },
    { "x": 920, "y": 360 },
    { "x": 1060, "y": 360 },
    { "x": 1240, "y": 360 },
    { "x": 1400, "y": 360 },
    { "x": 980, "y": 540 },
    { "x": 1260, "y": 540 },
    { "x": 260, "y": 920 },
    { "x": 380, "y": 920 }
  ],
  "visitors": [
    { "x": 600, "y": 880, "color": "#f87171", "route": [[600, 880], [700, 880], [700, 940], [600, 940]] },
    { "x": 680, "y": 760, "color": "#fb923c", "route": [[680, 760], [680, 680], [620, 680], [620, 760]] },
    { "x": 400, "y": 560, "color": "#facc15", "route": [[400, 560], [480, 560], [480, 600], [400, 600]] },
    { "x": 320, "y": 420, "color": "#4ade80", "route": [[320, 420], [360, 460], [320, 480], [280, 440]] },
    { "x": 580, "y": 460, "color": "#2dd4bf", "route": [[580, 460], [640, 460], [640, 520], [580, 520]] },
    { "x": 880, "y": 320, "color": "#38bdf8", "route": [[880, 320], [960, 320], [960, 350], [880, 350]] },
    { "x": 1100, "y": 340, "color": "#818cf8", "route": [[1100, 340], [1180, 340], [1180, 380], [1100, 380]] },
    { "x": 1300, "y": 350, "color": "#c084fc", "route": [[1300, 350], [1360, 350], [1360, 320], [1300, 320]] },
    { "x": 1020, "y": 440, "color": "#f472b6", "route": [[1020, 440], [1060, 460], [1020, 480], [980, 460]] },
    { "x": 1260, "y": 500, "color": "#fb7185", "route": [[1260, 500], [1320, 500], [1320, 540], [1260, 540]] },
    { "x": 380, "y": 800, "color": "#34d399", "route": [[380, 800], [440, 800], [440, 860], [380, 860]] },
    { "x": 220, "y": 880, "color": "#a78bfa", "route": [[220, 880], [260, 940], [200, 940], [180, 880]] }
  ]
}
;
    const EMBEDDED_QUESTS = {
  "constants": {
    "torchRange": 140,
    "interactionRadius": 48,
    "playerSpeed": 120,
    "flightSpeedMultiplier": 1.25,
    "flightDuration": 5.0,
    "flightCooldown": 3.0,
    "invisDuration": 8.0,
    "invisCooldown": 4.0,
    "torchMinHoldSec": 1.0
  },
  "stamps": [
    {
      "id": "waterpark",
      "name_en": "Rainbow Splash",
      "name_zh": "彩虹水上乐园",
      "icon": "🌊",
      "description_en": "Ride the rainbow water slide to the splash pool",
      "description_zh": "乘坐一次彩虹水滑梯并安全滑入戏水池"
    },
    {
      "id": "zoo",
      "name_en": "Animal Explorer",
      "name_zh": "野生动物探秘",
      "icon": "🦁",
      "target_count": 3,
      "description_en": "Observe 3 different wildlife animals",
      "description_zh": "近距离观察3种不同的可爱动物"
    },
    {
      "id": "puppy",
      "name_en": "Puppy's Best Friend",
      "name_zh": "小狗的好伙伴",
      "icon": "🐶",
      "description_en": "Pet the puppy and feed it a yummy dog biscuit",
      "description_zh": "抚摸小狗一次并喂食一块香脆狗零食"
    }
  ],
  "clues": [
    {
      "id": "sky",
      "name_en": "Sky Star Clue",
      "name_zh": "高空之星线索",
      "icon": "⭐",
      "target_id": "sky_tower",
      "x": 180,
      "y": 180,
      "required_ability": "flight",
      "description_en": "Fly across the barrier to the high observation deck and illuminate with flashlight",
      "description_zh": "飞行越过障碍到达高空观察台，并用手电筒照亮"
    },
    {
      "id": "quiet",
      "name_en": "Quiet Star Clue",
      "name_zh": "静谧之星线索",
      "icon": "🌙",
      "target_id": "owl",
      "x": 920,
      "y": 480,
      "required_ability": "invis",
      "description_en": "Stay invisible along the public walkway and shine flashlight at the shy owl",
      "description_zh": "保持隐形站在林荫步道，用手电筒照亮害羞猫头鹰"
    },
    {
      "id": "trail",
      "name_en": "Trail Star Clue",
      "name_zh": "嗅探之星线索",
      "icon": "🐾",
      "target_id": "trail_end_spot",
      "x": 140,
      "y": 640,
      "required_state": "trailRevealed",
      "description_en": "Follow the puppy's glowing pawprint trail to the secret spot and shine flashlight",
      "description_zh": "跟随小狗留下的发光脚印到达终点，用手电筒照亮"
    }
  ]
}
;
    const EMBEDDED_LOCALE_EN = {
  "title": "Adventure World",
  "subtitle": "Rainbow Adventure Park",
  "hint_controls": "🎮 WASD or Click Ground to Move | [E] or Click Bubble to Interact | [F] Fly | [I] Invis | [L] Torch",
  "creators": "Co-created by Joey · Mia · Chloe",
  "btn_start": "Start Adventure",
  "btn_select_character": "Choose Your Explorer",
  "avatar_1": "Explorer Sky",
  "avatar_1_desc": "Brave and energetic, loves water slides!",
  "avatar_2": "Explorer Forest",
  "avatar_2_desc": "Curious animal lover, friend to wildlife!",
  "avatar_3": "Explorer Sunny",
  "avatar_3_desc": "Gentle puppy whisperer, master puzzle solver!",
  "btn_confirm_select": "Enter Park (Free)",
  "badge_free": "FREE ADMISSION",
  "hud_passport": "Park Passport",
  "hud_stamps": "Stamps",
  "hud_clues": "Star Clues",
  "stamp_waterpark": "Water Park",
  "stamp_zoo": "Zoo Explorer",
  "stamp_puppy": "Puppy Bestie",
  "clue_sky": "Sky Star",
  "clue_quiet": "Quiet Star",
  "clue_trail": "Trail Star",
  "ready_for_night": "All stamps collected! Ready for night adventure?",
  "btn_start_night": "Begin Night Tour",
  "night_welcome_title": "Night Adventure Begins!",
  "night_welcome_text": "The park's Starglow lights went out! Use your free infinite flashlight and special abilities (Flight & Invisibility) with puppy's help to find 3 Star Clues!",
  "btn_got_it": "Let's Go!",
  "btn_return_day": "Return to Daytime",
  "btn_resume": "Resume Game",
  "btn_restart": "Restart Adventure",
  "btn_continue_roam": "Keep Exploring",
  "confirm_restart": "Are you sure you want to restart your adventure? (Progress will reset)",
  "yes": "Yes",
  "no": "Cancel",
  "paused": "Game Paused",
  "sound_on": "Sound: On",
  "sound_off": "Sound: Muted",
  "controls_title": "How to Play",
  "controls_desktop": "Move: WASD / Arrows | Interact: E | Fly: F | Invisibility: I | Flashlight: L | Switch Avatar: 1, 2, 3 | Pause: Esc",
  "controls_touch": "Left Joystick to move, Right Action buttons to Interact & use abilities. Tap avatar icons to switch appearance.",
  "prompt_interact": "Press [E] or Tap to interact",
  "prompt_slide": "Ride Rainbow Slide",
  "prompt_snack": "Enjoy Free Snack",
  "prompt_pet": "Pet Puppy",
  "prompt_feed": "Feed Puppy Treat",
  "prompt_treat_stall": "Get Free Dog Treat",
  "prompt_sniff": "Ask Puppy to Sniff Clue",
  "prompt_observe": "Observe",
  "prompt_console_need_clues": "Starglow Console: 3 Star Clues needed to light up the park!",
  "prompt_console_ready": "Press [E] to light up the Star Lights!",
  "prompt_night_gate": "Enter Night Adventure",
  "slide_cheer": "Whoosh! Down the rainbow slide! Splash!",
  "snack_cheer": "Yum! Free cotton candy makes you smile!",
  "treat_get": "You got a yummy puppy biscuit!",
  "pet_puppy_cheer": "Puppy happily wags its tail! Woof woof!",
  "feed_puppy_cheer": "Puppy munches the treat and licks your hand!",
  "stamp_unlocked": "Stamp Unlocked: ",
  "clue_unlocked": "Star Clue Found: ",
  "ability_fly_active": "Flying! (Can cross low barriers)",
  "ability_fly_ready": "Flight ready (Press F)",
  "ability_invis_active": "Invisible! (Shy animals won't hide)",
  "ability_invis_ready": "Invisibility ready (Press I)",
  "ability_cooldown": "Ability in cooldown...",
  "torch_day_tip": "Flashlight is available during Night Tour",
  "torch_on": "Flashlight ON",
  "torch_off": "Flashlight OFF",
  "owl_shy": "The shy owl flew higher into the branches... maybe approach quietly while invisible?",
  "owl_spotted": "You quietly observe the shy owl under the flashlight beam!",
  "puppy_sniffing": "Puppy caught a scent! Follow the glowing pawprints!",
  "puppy_found_trail": "Puppy found the mystery spot! Shine your flashlight here!",
  "sky_observation_tip": "Fly up to the observation deck and shine your flashlight to find the star!",
  "victory_title": "Park Star Lights Restored!",
  "victory_text": "Hooray! Joey, Mia, Chloe and puppy brought back the starry magic to Adventure World!",
  "victory_stats": "Stamps: 3/3 | Star Clues: 3/3",
  "storage_disabled": "Note: Local storage is disabled, current session progress won't be saved.",
  "animals": {
    "lion": "Sunny the Lion",
    "lion_desc": "A majestic golden lion basking in the sun. Softly snores!",
    "crocodile": "Croc the Crocodile",
    "crocodile_desc": "A friendly green crocodile smiling in the shallow pool.",
    "giraffe": "Gigi the Giraffe",
    "giraffe_desc": "Towers high, cheerfully nibbling acacia leaves!",
    "elephant": "Ellie the Elephant",
    "elephant_desc": "Gently swings its trunk and sprays sparkling mist!",
    "penguin": "Pip the Penguin",
    "penguin_desc": "Waddles happily on the ice rock and slides on its belly!",
    "owl": "Barnaby the Shy Owl",
    "owl_desc": "Perched quietly among the leafy branches."
  }
}
;
    const EMBEDDED_LOCALE_ZH = {
  "title": "Adventure World",
  "subtitle": "彩虹探险乐园",
  "hint_controls": "🎮 WASD 或 点击地面移动 ｜ [E] 或 点击气泡互动 ｜ [F] 飞行 ｜ [I] 隐形 ｜ [L] 手电筒",
  "creators": "Joey · Mia · Chloe 课堂共创",
  "btn_start": "开始探险",
  "btn_select_character": "选择你的探险家",
  "avatar_1": "天蓝探险家",
  "avatar_1_desc": "活力充沛，最喜欢彩虹水滑梯！",
  "avatar_2": "森绿探险家",
  "avatar_2_desc": "细心好奇，森林动物的好伙伴！",
  "avatar_3": "暖阳探险家",
  "avatar_3_desc": "温和亲切，小狗的好朋友与解谜能手！",
  "btn_confirm_select": "免费入园",
  "badge_free": "全场免费",
  "hud_passport": "游园护照",
  "hud_stamps": "游园印章",
  "hud_clues": "星星线索",
  "stamp_waterpark": "水上乐园",
  "stamp_zoo": "动物观察家",
  "stamp_puppy": "小狗挚友",
  "clue_sky": "高空之星",
  "clue_quiet": "静谧之星",
  "clue_trail": "嗅探之星",
  "ready_for_night": "已集齐三枚印章！准备好夜间探险了吗？",
  "btn_start_night": "开启夜间探险",
  "night_welcome_title": "夜游开启！",
  "night_welcome_text": "乐园的星星灯还没亮！带上无限电量的免费手电筒，善用飞行、隐形与小狗嗅探能力，找到三枚星星线索吧！",
  "btn_got_it": "出发！",
  "btn_return_day": "回到白天",
  "btn_resume": "继续游戏",
  "btn_restart": "重新开始",
  "btn_continue_roam": "继续游园",
  "confirm_restart": "确定要重新开始探险吗？（进度将重置）",
  "yes": "确定",
  "no": "取消",
  "paused": "游戏暂停",
  "sound_on": "声音：开启",
  "sound_off": "声音：静音",
  "controls_title": "操作说明",
  "controls_desktop": "移动：WASD / 方向键 | 互动：E | 飞行：F | 隐形：I | 手电筒：L | 切换角色：1, 2, 3 | 暂停：Esc",
  "controls_touch": "左侧摇杆移动，右侧操作按钮互动与施展能力。轻触顶部头像切换角色外观。",
  "prompt_interact": "按 [E] 或轻触互动",
  "prompt_slide": "乘坐彩虹滑梯",
  "prompt_snack": "品尝免费甜点",
  "prompt_pet": "抚摸小狗",
  "prompt_feed": "喂食小狗零食",
  "prompt_treat_stall": "领取免费小狗零食",
  "prompt_sniff": "让小狗嗅探线索",
  "prompt_observe": "观察",
  "prompt_console_need_clues": "星星灯控制台：集齐 3 枚星星线索后即可点亮乐园！",
  "prompt_console_ready": "按 [E] 点亮星星灯！",
  "prompt_night_gate": "进入夜间探险",
  "slide_cheer": "嗖——顺着彩虹滑梯滑下！哗啦水花四溅！",
  "snack_cheer": "哇！免费棉花糖甜甜的，好开心！",
  "treat_get": "领到了香喷喷的狗狗专用饼干！",
  "pet_puppy_cheer": "小狗欢快地摇着尾巴，汪汪叫！",
  "feed_puppy_cheer": "小狗开心吃完零食，亲昵地蹭蹭你的手！",
  "stamp_unlocked": "获得印章：",
  "clue_unlocked": "找到星星线索：",
  "ability_fly_active": "正在飞行！（可越过低矮障碍）",
  "ability_fly_ready": "飞行已就绪（按 F）",
  "ability_invis_active": "处于隐形状态！（害羞动物不会躲避）",
  "ability_invis_ready": "隐形已就绪（按 I）",
  "ability_cooldown": "技能冷却中...",
  "torch_day_tip": "手电筒在夜游时可用",
  "torch_on": "手电筒已开启",
  "torch_off": "手电筒已关闭",
  "owl_shy": "害羞的猫头鹰躲回了树梢……试着在隐形状态下悄悄靠近？",
  "owl_spotted": "在手电筒光芒中，你静静观察到了害羞猫头鹰！",
  "puppy_sniffing": "小狗闻到了气味！快跟着发光的脚印走！",
  "puppy_found_trail": "小狗找到了神秘终点！在这里照亮手电筒吧！",
  "sky_observation_tip": "飞到高处观察点并用手电筒照亮，就能发现星星！",
  "victory_title": "乐园星星灯被全部点亮！",
  "victory_text": "太棒啦！Joey、Mia、Chloe 与小狗一起为彩虹探险乐园找回了璀璨星光！",
  "victory_stats": "游园印章：3/3 | 星星线索：3/3",
  "storage_disabled": "注意：本地存储不可用，本次进度将不会保存。",
  "animals": {
    "lion": "太阳狮子",
    "lion_desc": "金黄鬃毛威风凛凛，正懒洋洋地晒太阳、打呼噜！",
    "crocodile": "小鳄鱼",
    "crocodile_desc": "碧绿的小鳄鱼在浅水池边轻摇尾巴微笑。",
    "giraffe": "长颈鹿奇奇",
    "giraffe_desc": "脖子长长高耸，正津津有味地咀嚼着金合欢树叶！",
    "elephant": "小象艾莉",
    "elephant_desc": "轻轻扬起长鼻子，喷出一阵闪亮的水雾！",
    "penguin": "企鹅皮皮",
    "penguin_desc": "在冰石上摇摇摆摆，开心地趴着肚皮滑行！",
    "owl": "害羞的猫头鹰",
    "owl_desc": "安静地栖息在绿荫枝头，大眼睛骨碌碌地转。"
  }
}
;

    let worldConfig, questsConfig, localeEn, localeZh;
    try {
      if (typeof location !== 'undefined' && location.protocol !== 'file:') {
        [worldConfig, questsConfig, localeEn, localeZh] = await Promise.all([
          fetch("./data/world.json").then(r => r.json()),
          fetch("./data/quests.json").then(r => r.json()),
          fetch("./data/locale.en.json").then(r => r.json()),
          fetch("./data/locale.zh.json").then(r => r.json())
        ]);
      } else {
        throw new Error('file protocol');
      }
    } catch (e) {
      worldConfig = EMBEDDED_WORLD;
      questsConfig = EMBEDDED_QUESTS;
      localeEn = EMBEDDED_LOCALE_EN;
      localeZh = EMBEDDED_LOCALE_ZH;
    }


    this.localeData.en = localeEn;
    this.localeData.zh = localeZh;

    // 2. Initialize World & Collision
    this.world = new World(worldConfig);

    // 3. Initialize Save Manager
    this.saveMgr = new SaveManager(worldConfig.spawn, (x, y) => this.world.isWalkable(x, y));
    const saveResult = this.saveMgr.load();

    // 4. Initialize State
    this.state = new GameState(saveResult.data, questsConfig);
    if (!this.saveMgr.storageAvailable) {
      document.getElementById("storage-banner").style.display = "block";
    }

    // 5. Initialize Sound Engine
    this.sound = new SoundEngine();
    this.sound.setMuted(this.state.muted);

    // 6. Initialize Puppy
    this.puppy = new Puppy(worldConfig.landmarks.puppy_sniff_spot.x, worldConfig.landmarks.puppy_sniff_spot.y);
    if (this.state.trailRevealed) {
      this.puppy.state = "celebrate";
    }

    // 7. Initialize Quest Engine & Renderer
    this.quests = new QuestEngine(questsConfig, this.sound);
    this.renderer = new Renderer(this.canvas);
    this.renderer.resize();

    window.addEventListener("resize", () => this.renderer.resize());

    // 8. Initialize Input Controller
    this.input = new InputController(this.canvas, {
      onInteract: () => this.handleActionInteract(),
      onFly: () => this.handleActionFly(),
      onInvis: () => this.handleActionInvis(),
      onTorch: () => this.handleActionTorch(),
      onAvatar: (id) => this.handleSwitchAvatar(id),
      onPause: () => this.handleTogglePause()
    });

    // Bind virtual joystick
    const joyContainer = document.getElementById("joystick-base");
    const joyKnob = document.getElementById("joystick-knob");
    this.input.bindJoystickElement(joyContainer, joyKnob);

    // Click-to-move / Tap-to-move & direct tap-to-interact on canvas
    this.canvas.addEventListener("pointerdown", (e) => {
      if (!this.state || this.state.uiState !== UI_STATES.PLAY) return;

      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const worldPos = this.renderer.screenToWorld(clickX, clickY);

      // If near active interaction prompt or player, tap triggers interaction!
      const prompt = this.quests.getInteractionPrompt(this.state, this.world, this.puppy, this.getStrings());
      const distToPlayer = Math.hypot(worldPos.x - this.state.player.x, worldPos.y - this.state.player.y);

      if (prompt && prompt.canAct && distToPlayer <= 64) {
        this.handleActionInteract();
        return;
      }

      // Otherwise, navigate smoothly toward tapped destination
      this.state.player.targetMove = { x: worldPos.x, y: worldPos.y };
    });

    // 9. Bind DOM Buttons & UI Overlays
    this.bindUI();

    // Apply initial strings
    this.updateLocaleUI();

    // 10. Start Game Loop
    this.lastTime = performance.now();
    this.running = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  getStrings() {
    return this.localeData[this.state.locale] || this.localeData.en;
  }

  bindUI() {
    const s = () => this.getStrings();

    // Title Screen
    document.getElementById("btn-title-start").onclick = () => {
      this.sound.init();
      this.sound.playClick();
      this.state.uiState = UI_STATES.SELECT;
      this.updateUIOverlays();
    };

    // Character Selection Screen
    document.querySelectorAll(".avatar-select-card").forEach(card => {
      card.onclick = (e) => {
        document.querySelectorAll(".avatar-select-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        const aid = card.dataset.avatar;
        this.state.switchAvatar(aid);
        this.sound.playClick();
      };
    });

    document.getElementById("btn-confirm-avatar").onclick = () => {
      this.sound.playClick();
      this.state.uiState = UI_STATES.PLAY;
      this.saveMgr.save(this.state, true);
      this.updateUIOverlays();
    };

    // HUD Actions
    document.getElementById("btn-action-interact").onclick = () => this.handleActionInteract();
    document.getElementById("btn-action-fly").onclick = () => this.handleActionFly();
    document.getElementById("btn-action-invis").onclick = () => this.handleActionInvis();
    document.getElementById("btn-action-torch").onclick = () => this.handleActionTorch();

    // Top HUD buttons
    document.getElementById("btn-hud-pause").onclick = () => this.handleTogglePause();
    document.getElementById("btn-hud-sound").onclick = () => {
      const isMuted = this.sound.toggleMute();
      this.state.muted = isMuted;
      this.saveMgr.save(this.state, true);
      this.updateLocaleUI();
    };
    document.getElementById("btn-hud-lang").onclick = () => {
      this.state.locale = this.state.locale === "en" ? "zh" : "en";
      this.saveMgr.save(this.state, true);
      this.updateLocaleUI();
    };

    // Avatar switcher buttons in HUD
    document.querySelectorAll(".btn-avatar-switch").forEach(btn => {
      btn.onclick = () => {
        const aid = btn.dataset.avatar;
        this.handleSwitchAvatar(aid);
      };
    });

    // Ready for night banner button
    document.getElementById("btn-banner-night").onclick = () => {
      if (this.state.allStampsCollected()) {
        this.state.setPhase(PHASES.NIGHT);
        this.state.modal = {
          title: s().night_welcome_title,
          text: s().night_welcome_text,
          buttonText: s().btn_got_it,
          onConfirm: () => {
            this.state.uiState = UI_STATES.PLAY;
            this.state.modal = null;
            this.updateUIOverlays();
          }
        };
        this.state.uiState = UI_STATES.DIALOG;
        this.saveMgr.save(this.state, true);
        this.updateUIOverlays();
      }
    };

    // Modal Dialog
    document.getElementById("btn-modal-confirm").onclick = () => {
      if (this.state.modal && this.state.modal.onConfirm) {
        this.sound.playClick();
        this.state.modal.onConfirm();
      }
    };

    // Pause Menu
    document.getElementById("btn-pause-resume").onclick = () => {
      this.sound.playClick();
      this.state.uiState = UI_STATES.PLAY;
      this.updateUIOverlays();
    };

    document.getElementById("btn-pause-day").onclick = () => {
      this.sound.playClick();
      this.state.setPhase(PHASES.DAY);
      this.state.uiState = UI_STATES.PLAY;
      this.saveMgr.save(this.state, true);
      this.updateUIOverlays();
    };

    document.getElementById("btn-pause-restart").onclick = () => {
      this.sound.playClick();
      if (confirm(s().confirm_restart)) {
        this.saveMgr.clear();
        window.location.reload();
      }
    };

    // Victory Screen
    document.getElementById("btn-victory-continue").onclick = () => {
      this.sound.playClick();
      this.state.setPhase(PHASES.COMPLETED);
      this.state.uiState = UI_STATES.PLAY;
      this.saveMgr.save(this.state, true);
      this.updateUIOverlays();
    };

    document.getElementById("btn-victory-restart").onclick = () => {
      this.sound.playClick();
      if (confirm(s().confirm_restart)) {
        this.saveMgr.clear();
        window.location.reload();
      }
    };
  }

  handleActionInteract() {
    if (!this.state.canMoveAndAct()) return;
    this.quests.handleInteraction(
      this.state,
      this.world,
      this.puppy,
      this.getStrings(),
      (force) => this.saveMgr.save(this.state, force)
    );
    this.updateUIOverlays();
  }

  handleActionFly() {
    if (!this.state.canMoveAndAct()) return;
    const res = this.state.triggerFlight(this.world);
    if (res === "cooldown") {
      this.state.showToast(this.getStrings().ability_cooldown);
    } else if (res === "ok") {
      this.sound.playTone(520, 0.25, 'triangle', 0.1);
    }
  }

  handleActionInvis() {
    if (!this.state.canMoveAndAct()) return;
    const res = this.state.triggerInvis(this.world);
    if (res === "cooldown") {
      this.state.showToast(this.getStrings().ability_cooldown);
    } else if (res === "ok") {
      this.sound.playTone(400, 0.2, 'sine', 0.1);
    }
  }

  handleActionTorch() {
    if (!this.state.canMoveAndAct()) return;
    const res = this.state.toggleTorch();
    if (res === "daytime") {
      this.state.showToast(this.getStrings().torch_day_tip);
    } else {
      this.sound.playClick();
      this.state.showToast(res === "on" ? this.getStrings().torch_on : this.getStrings().torch_off);
    }
  }

  handleSwitchAvatar(avatarId) {
    this.state.switchAvatar(avatarId);
    this.sound.playClick();
    this.saveMgr.save(this.state, true);
    this.updateUIOverlays();
  }

  handleTogglePause() {
    if (this.state.uiState === UI_STATES.PLAY) {
      this.input.reset();
      this.state.uiState = UI_STATES.PAUSED;
    } else if (this.state.uiState === UI_STATES.PAUSED) {
      this.state.uiState = UI_STATES.PLAY;
    }
    this.updateUIOverlays();
  }

  updateLocaleUI() {
    const s = this.getStrings();
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (s[key]) el.textContent = s[key];
    });

    document.getElementById("btn-hud-sound").textContent = this.state.muted ? "🔇" : "🔊";
    document.getElementById("btn-hud-lang").textContent = this.state.locale === "en" ? "中" : "EN";

    this.updateUIOverlays();
  }

  updateUIOverlays() {
    const s = this.getStrings();

    // Toggle screen overlays
    document.getElementById("screen-title").style.display =
      this.state.uiState === UI_STATES.TITLE ? "flex" : "none";
    document.getElementById("screen-select").style.display =
      this.state.uiState === UI_STATES.SELECT ? "flex" : "none";
    document.getElementById("screen-dialog").style.display =
      this.state.uiState === UI_STATES.DIALOG ? "flex" : "none";
    document.getElementById("screen-pause").style.display =
      this.state.uiState === UI_STATES.PAUSED ? "flex" : "none";
    document.getElementById("screen-victory").style.display =
      this.state.uiState === UI_STATES.VICTORY ? "flex" : "none";

    // Pause Return to Daytime button visibility
    const pauseDayBtn = document.getElementById("btn-pause-day");
    if (pauseDayBtn) {
      pauseDayBtn.style.display = this.state.phase === PHASES.NIGHT ? "block" : "none";
    }

    // Modal dialog content
    if (this.state.modal) {
      document.getElementById("modal-title").textContent = this.state.modal.title;
      document.getElementById("modal-text").textContent = this.state.modal.text;
      document.getElementById("btn-modal-confirm").textContent = this.state.modal.buttonText || s.btn_got_it;
    }

    // Night adventure banner
    const banner = document.getElementById("banner-night-ready");
    if (this.state.phase === PHASES.DAY && this.state.allStampsCollected() && this.state.uiState === UI_STATES.PLAY) {
      banner.style.display = "flex";
    } else {
      banner.style.display = "none";
    }

    // HUD Stamps
    const stampWater = document.getElementById("hud-stamp-waterpark");
    const stampZoo = document.getElementById("hud-stamp-zoo");
    const stampPuppy = document.getElementById("hud-stamp-puppy");
    if (stampWater) stampWater.className = `stamp-badge ${this.state.stamps.has("waterpark") ? "unlocked" : "locked"}`;
    if (stampZoo) stampZoo.className = `stamp-badge ${this.state.stamps.has("zoo") ? "unlocked" : "locked"}`;
    if (stampPuppy) stampPuppy.className = `stamp-badge ${this.state.stamps.has("puppy") ? "unlocked" : "locked"}`;

    // HUD Clues
    const clueSky = document.getElementById("hud-clue-sky");
    const clueQuiet = document.getElementById("hud-clue-quiet");
    const clueTrail = document.getElementById("hud-clue-trail");
    if (clueSky) clueSky.className = `clue-badge ${this.state.clues.has("sky") ? "unlocked" : "locked"}`;
    if (clueQuiet) clueQuiet.className = `clue-badge ${this.state.clues.has("quiet") ? "unlocked" : "locked"}`;
    if (clueTrail) clueTrail.className = `clue-badge ${this.state.clues.has("trail") ? "unlocked" : "locked"}`;

    // Active avatar indicator in top bar
    document.querySelectorAll(".btn-avatar-switch").forEach(btn => {
      if (btn.dataset.avatar === this.state.avatarId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Victory screen stats
    document.getElementById("victory-stamps-summary").textContent =
      `Stamps: ${this.state.stamps.size}/3 | Clues: ${this.state.clues.size}/3`;
  }

  loop(timestamp) {
    if (!this.running) return;
    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Strict delta time clamping (max 0.05s) to eliminate tab-switch / background warping
    const dt = Math.min(rawDt, 0.05);

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (this.state.uiState !== this.lastUIState) {
      this.lastUIState = this.state.uiState;
      this.updateUIOverlays();
    }

    const isPlay = this.state.uiState === UI_STATES.PLAY;

    // Toast countdown
    if (this.state.toast.timer > 0) {
      this.state.toast.timer -= dt;
      const toastEl = document.getElementById("game-toast");
      toastEl.textContent = this.state.toast.text;
      toastEl.style.display = "block";
    } else {
      document.getElementById("game-toast").style.display = "none";
    }

    // Celebration animation timer
    if (this.state.celebration.active) {
      this.state.celebration.timer -= dt;
      if (this.state.celebration.timer <= 0) {
        this.state.celebration.active = false;
      }
    }

    if (isPlay) {
      // 1. Ability timers and cooldowns
      this.updateAbilities(dt);

      // 2. Player movement
      this.updatePlayerMovement(dt);

      // 3. Puppy companion
      this.puppy.update(dt, this.state.player, this.state, this.world, this.sound);

      // 4. Quests & Slide & Hold Illumination
      this.quests.update(dt, this.state, this.world, this.puppy);

      // 5. Throttled save position
      this.saveMgr.save(this.state, false);
    }

    // World ambient entities (visitors & particles)
    this.world.update(dt, isPlay);
  }

  updateAbilities(dt) {
    const f = this.state.abilities.flight;
    if (f.active) {
      f.timer -= dt;
      if (f.timer <= 0) {
        this.state.safeLand(this.world);
      }
    } else if (f.cooldown > 0) {
      f.cooldown = Math.max(0, f.cooldown - dt);
    }

    const inv = this.state.abilities.invis;
    if (inv.active) {
      inv.timer -= dt;
      if (inv.timer <= 0) {
        inv.active = false;
        inv.cooldown = inv.cooldownDuration;
      }
    } else if (inv.cooldown > 0) {
      inv.cooldown = Math.max(0, inv.cooldown - dt);
    }

    // Update Action Button Visuals (cooldown sweep & active glow)
    const btnFly = document.getElementById("btn-action-fly");
    const btnInvis = document.getElementById("btn-action-invis");
    const btnTorch = document.getElementById("btn-action-torch");

    if (f.active) {
      btnFly.className = "action-btn active";
      btnFly.querySelector(".cooldown-text").textContent = Math.ceil(f.timer) + "s";
    } else if (f.cooldown > 0) {
      btnFly.className = "action-btn on-cooldown";
      btnFly.querySelector(".cooldown-text").textContent = Math.ceil(f.cooldown) + "s";
    } else {
      btnFly.className = "action-btn";
      btnFly.querySelector(".cooldown-text").textContent = "";
    }

    if (inv.active) {
      btnInvis.className = "action-btn active";
      btnInvis.querySelector(".cooldown-text").textContent = Math.ceil(inv.timer) + "s";
    } else if (inv.cooldown > 0) {
      btnInvis.className = "action-btn on-cooldown";
      btnInvis.querySelector(".cooldown-text").textContent = Math.ceil(inv.cooldown) + "s";
    } else {
      btnInvis.className = "action-btn";
      btnInvis.querySelector(".cooldown-text").textContent = "";
    }

    if (this.state.phase === PHASES.NIGHT) {
      btnTorch.className = `action-btn ${this.state.abilities.torch.active ? "active" : ""}`;
      btnTorch.querySelector(".cooldown-text").textContent = "";
    } else {
      btnTorch.className = "action-btn disabled";
      btnTorch.querySelector(".cooldown-text").textContent = "";
    }
  }

  updatePlayerMovement(dt) {
    const p = this.state.player;
    if (this.state.slide.active) return; // Frozen while sliding down

    const mx = this.input.moveX;
    const my = this.input.moveY;

    if (mx !== 0 || my !== 0) {
      p.targetMove = null; // Keyboard/joystick overrides click-to-move
      p.isMoving = true;
      p.walkTimer += dt * 8;

      let speed = p.speed;
      if (this.state.abilities.flight.active) {
        speed *= this.state.abilities.flight.speedMultiplier;
      }

      const nextX = p.x + mx * speed * dt;
      const nextY = p.y + my * speed * dt;

      const collisionChecker = this.state.abilities.flight.active
        ? (x, y) => this.world.isFlyable(x, y, p.radius)
        : (x, y) => this.world.isWalkable(x, y, p.radius);

      // Separate X and Y for smooth wall sliding
      if (collisionChecker(nextX, p.y)) {
        p.x = nextX;
      }
      if (collisionChecker(p.x, nextY)) {
        p.y = nextY;
      }
    } else if (p.targetMove) {
      // Click-to-move navigation
      const dx = p.targetMove.x - p.x;
      const dy = p.targetMove.y - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 6) {
        p.targetMove = null;
        p.isMoving = false;
      } else {
        p.isMoving = true;
        p.walkTimer += dt * 8;

        let speed = p.speed;
        if (this.state.abilities.flight.active) {
          speed *= this.state.abilities.flight.speedMultiplier;
        }

        const step = Math.min(dist, speed * dt);
        const nextX = p.x + (dx / dist) * step;
        const nextY = p.y + (dy / dist) * step;

        const collisionChecker = this.state.abilities.flight.active
          ? (x, y) => this.world.isFlyable(x, y, p.radius)
          : (x, y) => this.world.isWalkable(x, y, p.radius);

        let moved = false;
        if (collisionChecker(nextX, p.y)) {
          p.x = nextX;
          moved = true;
        }
        if (collisionChecker(p.x, nextY)) {
          p.y = nextY;
          moved = true;
        }

        if (!moved) {
          p.targetMove = null; // Reached obstacle
        }
      }
    } else {
      p.isMoving = false;
    }
  }

  render() {
    this.renderer.render(
      this.state,
      this.world,
      this.puppy,
      this.quests,
      this.getStrings()
    );
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const game = new GameApp();
  game.init();
  window.__AW_GAME__ = game; // Exposed cleanly for testing
});

})();
