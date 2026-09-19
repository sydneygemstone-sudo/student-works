/**
 * Adventure World - Main Controller & Game Loop
 */

import { GameState, PHASES, UI_STATES } from "./state.js";
import { SaveManager } from "./save.js";
import { InputController } from "./input.js";
import { World } from "./world.js";
import { Puppy } from "./puppy.js";
import { QuestEngine } from "./quests.js";
import { Renderer } from "./render.js";
import { SoundEngine } from "./audio.js";

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
    // 1. Fetch data
    const [worldConfig, questsConfig, localeEn, localeZh] = await Promise.all([
      fetch("./data/world.json").then(r => r.json()),
      fetch("./data/quests.json").then(r => r.json()),
      fetch("./data/locale.en.json").then(r => r.json()),
      fetch("./data/locale.zh.json").then(r => r.json())
    ]);

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
