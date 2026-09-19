/**
 * Adventure World - Quest Engine
 * Evaluates stamps, daytime interactions, continuous torch illumination, clues & victory.
 */

import { PHASES, UI_STATES } from "./state.js";

export class QuestEngine {
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
