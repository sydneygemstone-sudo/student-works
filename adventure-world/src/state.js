/**
 * Adventure World - Game State Model
 * Explicit finite state machines for business phases and UI states.
 */

export const PHASES = {
  DAY: "DAY",
  NIGHT: "NIGHT",
  COMPLETED: "COMPLETED"
};

export const UI_STATES = {
  TITLE: "TITLE",
  SELECT: "SELECT",
  PLAY: "PLAY",
  DIALOG: "DIALOG",
  PAUSED: "PAUSED",
  VICTORY: "VICTORY"
};

export class GameState {
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
