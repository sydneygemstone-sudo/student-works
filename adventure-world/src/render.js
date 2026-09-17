/**
 * Adventure World - Canvas 2D Vector & Lighting Renderer
 * Picture-book 2.5D aesthetic with day/night cycles, dynamic lighting, and expressive animations.
 */

import { PHASES } from "./state.js";

export class Renderer {
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
