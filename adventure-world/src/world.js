/**
 * Adventure World - World Geometry, Collision, Entities & Slide Simulation
 */

export class World {
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
