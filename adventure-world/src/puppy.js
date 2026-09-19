/**
 * Adventure World - Puppy Companion Entity
 * Ground navigation, tail wagging, sniffing trail sequence, and celebrations.
 */

export class Puppy {
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
