/**
 * Adventure World - Save Manager
 * LocalStorage serialization with robust schema validation & fallback.
 */

export const SAVE_KEY = "adventure-world:save:v1";

export function getDefaultSave(spawnX = 650, spawnY = 950) {
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

export class SaveManager {
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
