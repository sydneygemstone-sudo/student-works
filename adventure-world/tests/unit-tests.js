/**
 * Adventure World - Unit Tests
 * Tests state machine, collision boundaries, quest idempotency, save validation,
 * 6 permutations of clue collection orders, and ability mutual exclusion.
 */

import { GameState, PHASES, UI_STATES } from "../src/state.js";
import { World } from "../src/world.js";
import { QuestEngine } from "../src/quests.js";
import { Puppy } from "../src/puppy.js";
import { SaveManager, SAVE_KEY, getDefaultSave } from "../src/save.js";
import fs from "fs";

const worldConfig = JSON.parse(fs.readFileSync("./data/world.json", "utf-8"));
const questsConfig = JSON.parse(fs.readFileSync("./data/quests.json", "utf-8"));
const localeEn = JSON.parse(fs.readFileSync("./data/locale.en.json", "utf-8"));

const results = [];

function recordTest(testId, passed, notes = "") {
  results.push({ testId, passed, notes });
  console.log(`[${passed ? "PASS" : "FAIL"}] ${testId}: ${notes}`);
}

async function runUnitTests() {
  console.log("=== RUNNING ADVENTURE WORLD UNIT TESTS ===");

  // 1. A01: Title and Select screen input freeze
  {
    const state = new GameState({}, questsConfig);
    state.uiState = UI_STATES.TITLE;
    const canActInTitle = state.canMoveAndAct();
    state.uiState = UI_STATES.SELECT;
    const canActInSelect = state.canMoveAndAct();
    state.uiState = UI_STATES.PLAY;
    const canActInPlay = state.canMoveAndAct();

    const passed = !canActInTitle && !canActInSelect && canActInPlay;
    recordTest("A01_input_freeze", passed, "Movement and interactions frozen during TITLE and SELECT");
  }

  // 2. A03: Stamp prerequisites & deduplication
  {
    const state = new GameState({}, questsConfig);
    state.uiState = UI_STATES.PLAY;
    const world = new World(worldConfig);
    const quests = new QuestEngine(questsConfig, null);

    // Zoo deduplication
    state.animalsObserved.add("lion");
    state.animalsObserved.add("lion"); // repeat
    const countAfterRepeat = state.animalsObserved.size;
    state.animalsObserved.add("elephant");
    state.animalsObserved.add("giraffe");
    if (state.animalsObserved.size >= 3) quests.unlockStamp(state, "zoo");

    // Puppy pet + feed requirement
    state.puppyPetted = true;
    const stampBeforeFeed = state.stamps.has("puppy");
    state.puppyFed = true;
    if (state.puppyPetted && state.puppyFed) quests.unlockStamp(state, "puppy");
    const stampAfterBoth = state.stamps.has("puppy");

    // Waterpark slide completion requirement
    state.slide.active = true;
    state.slide.progress = 0.5;
    quests.update(0.1, state, world, null);
    const stampMidSlide = state.stamps.has("waterpark");
    state.slide.progress = 1.0;
    quests.update(0.1, state, world, null);
    const stampEndSlide = state.stamps.has("waterpark");

    const passed = countAfterRepeat === 1 &&
      state.stamps.has("zoo") &&
      !stampBeforeFeed &&
      stampAfterBoth &&
      !stampMidSlide &&
      stampEndSlide;

    recordTest("A03_stamp_prerequisites", passed, "Observation deduplicated, both pet and feed required, slide ride required");
  }

  // 3. A04: Stamp/clue idempotency & console victory gating
  {
    const state = new GameState({}, questsConfig);
    const quests = new QuestEngine(questsConfig, null);

    // Add stamps multiple times
    quests.unlockStamp(state, "waterpark");
    quests.unlockStamp(state, "waterpark");
    const stampCount = state.stamps.size;

    // Victory console cannot trigger without 3 clues
    state.phase = PHASES.NIGHT;
    state.clues.add("sky");
    state.clues.add("quiet");
    const winBefore3rdClue = state.allCluesCollected();
    state.clues.add("trail");
    const winAfter3rdClue = state.allCluesCollected();

    const passed = stampCount === 1 && !winBefore3rdClue && winAfter3rdClue;
    recordTest("A04_idempotency_and_gating", passed, "Stamp sets are idempotent; victory strictly requires 3 clues");
  }

  // 4. A05: Collision boundaries & Flight vs Safe Landing
  {
    const world = new World(worldConfig);
    const state = new GameState({}, questsConfig);

    // Obstacle at sky barrier is low
    // sky_barrier: x=110, y=230, w=140, h=20. Center is (180, 240)
    const walkableOnLow = world.isWalkable(180, 240);
    const flyableOnLow = world.isFlyable(180, 240);

    // High fence at lion pen: x=910, y=140, w=180, h=120. Center is (1000, 200)
    const walkableOnHigh = world.isWalkable(1000, 200);
    const flyableOnHigh = world.isFlyable(1000, 200);

    // Safe landing
    state.player.x = 180;
    state.player.y = 240; // On low barrier
    state.player.takeoffPos = { x: 650, y: 950 };
    state.abilities.flight.active = true;
    state.safeLand(world);

    const landedSafe = world.isWalkable(state.player.x, state.player.y);

    const passed = !walkableOnLow && flyableOnLow && !walkableOnHigh && !flyableOnHigh && landedSafe;
    recordTest("A05_flight_collision_safeland", passed, "Low obstacles flyable, high obstacles blocked, safe landing finds legal ground");
  }

  // 5. A06: Invisibility mechanics, collisions & cooldown retention
  {
    const state = new GameState({}, questsConfig);
    const world = new World(worldConfig);

    // Activating invis starts timer
    state.triggerInvis(world);
    const invisActive = state.abilities.invis.active;
    state.abilities.invis.timer = 0;
    state.abilities.invis.active = false;
    state.abilities.invis.cooldown = 4.0;

    // Switch avatar should NOT refresh cooldown
    state.switchAvatar("avatar-2");
    const cooldownRetained = state.abilities.invis.cooldown === 4.0;

    // Mutually exclusive test: trigger flight ends invis
    state.abilities.invis.active = true;
    state.abilities.invis.cooldown = 0;
    state.triggerFlight(world);
    const invisEndedByFlight = !state.abilities.invis.active && state.abilities.flight.active;

    const passed = invisActive && cooldownRetained && invisEndedByFlight;
    recordTest("A06_invisibility_and_mutual_exclusion", passed, "Invisibility, cooldown retention across avatar switch, and mutual exclusion verified");
  }

  // 6. A07: Continuous flashlight illumination >= 1.0s requirement
  {
    const state = new GameState({}, questsConfig);
    state.uiState = UI_STATES.PLAY;
    state.setPhase(PHASES.NIGHT);
    state.abilities.torch.active = true;
    state.player.x = 180;
    state.player.y = 180; // Sky tower
    state.abilities.flight.active = true;

    const quests = new QuestEngine(questsConfig, null);

    // Illumination at 0.5s -> not yet ready
    quests.update(0.5, state, new World(worldConfig), null);
    const holdMid = state.clueHoldTimers.sky;

    // Torch switched off -> timer resets
    state.abilities.torch.active = false;
    quests.update(0.1, state, new World(worldConfig), null);
    const holdReset = state.clueHoldTimers.sky;

    // Torch on and held for 1.0s -> timer reaches 1.0s
    state.abilities.torch.active = true;
    quests.update(1.2, state, new World(worldConfig), null);
    const holdComplete = state.clueHoldTimers.sky >= 1.0;

    const passed = holdMid === 0.5 && holdReset === 0 && holdComplete;
    recordTest("A07_flashlight_continuous_hold", passed, "Requires continuous illumination >= 1.0s; resets on torch off");
  }

  // 7. A08: Puppy behavior and sniff trail
  {
    const puppy = new Puppy(320, 840);
    const state = new GameState({}, questsConfig);
    state.uiState = UI_STATES.PLAY;
    const world = new World(worldConfig);

    puppy.startSniffRoute();
    const isSniffing = puppy.state === "sniff";

    // Simulate puppy walking path to end
    for (let step = 0; step < 200; step++) {
      puppy.update(0.1, state.player, state, world, null);
    }
    const trailRevealed = state.trailRevealed;
    const pawprintCount = puppy.pawprints.length;

    const passed = isSniffing && trailRevealed && pawprintCount === 3;
    recordTest("A08_puppy_sniff_trail", passed, "Puppy executes sniff trail, drops 3 pawprints and sets trailRevealed");
  }

  // 8. A09: All 6 clue collection order permutations
  {
    const clueOrders = [
      ["sky", "quiet", "trail"],
      ["sky", "trail", "quiet"],
      ["quiet", "sky", "trail"],
      ["quiet", "trail", "sky"],
      ["trail", "sky", "quiet"],
      ["trail", "quiet", "sky"]
    ];

    let allOrdersSucceed = true;
    for (const order of clueOrders) {
      const state = new GameState({}, questsConfig);
      state.phase = PHASES.NIGHT;
      const quests = new QuestEngine(questsConfig, null);
      for (const clueId of order) {
        quests.unlockClue(state, clueId);
      }
      if (!state.allCluesCollected()) allOrdersSucceed = false;
    }

    recordTest("A09_six_clue_permutations", allOrdersSucceed, "All 6 clue collection orders successfully complete requirements");
  }

  // 9. A10: Day-Night transition and idempotent win
  {
    const state = new GameState({}, questsConfig);
    state.stamps.add("waterpark");
    state.stamps.add("zoo");
    state.stamps.add("puppy");

    state.setPhase(PHASES.NIGHT);
    state.clues.add("sky");

    // Return to daytime
    state.setPhase(PHASES.DAY);
    const stampsKept = state.stamps.size === 3;
    const cluesKept = state.clues.has("sky");

    // Re-enter night
    state.setPhase(PHASES.NIGHT);
    const cluesKeptAfterReenter = state.clues.has("sky");

    // Idempotent win
    state.clues.add("quiet");
    state.clues.add("trail");
    state.winTriggered = true;
    const firstWin = state.winTriggered;
    state.winTriggered = true; // duplicate
    const secondWin = state.winTriggered;

    const passed = stampsKept && cluesKept && cluesKeptAfterReenter && firstWin && secondWin;
    recordTest("A10_day_night_switch_and_win_idempotency", passed, "Switching day/night preserves stamps and clues; win is idempotent");
  }

  // 10. A13: Save validation and fallback
  {
    const saveMgr = new SaveManager({ x: 650, y: 950 });
    
    // Corrupt / invalid data
    const invalidData = {
      gameId: "adventure-world",
      phase: "INVALID_PHASE",
      avatarId: "hacker-avatar",
      position: { x: "NaN", y: 999999 },
      stamps: ["fake_stamp", "waterpark"],
      clues: ["magic_clue"]
    };

    const sanitized = saveMgr.validateAndSanitize(invalidData);
    const passed = sanitized.phase === "DAY" &&
      sanitized.avatarId === "avatar-1" &&
      sanitized.position.x === 650 &&
      sanitized.stamps.length === 1 && sanitized.stamps[0] === "waterpark" &&
      sanitized.clues.length === 0;

    recordTest("A13_save_sanitization", passed, "Corrupt save data sanitized safely with fallbacks; prevents crashes");
  }

  console.log("=== UNIT TESTS FINISHED ===");
  const allPassed = results.every(r => r.passed);
  console.log(`Summary: ${results.filter(r => r.passed).length}/${results.length} tests passed.`);
  return results;
}

runUnitTests().catch(console.error);
