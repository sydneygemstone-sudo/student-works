const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '8766', 10);
const ARENA_WIDTH = 1200;
const ARENA_HEIGHT = 580;
const GROUND_Y = 480;

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// WebSocket wrapper
class MiniWS {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.onMessage = null;
    this.onClose = null;
    this.isClosed = false;

    socket.on('data', (chunk) => this._handleData(chunk));
    socket.on('close', () => this._handleClose());
    socket.on('error', () => this._handleClose());
  }

  _handleClose() {
    if (this.isClosed) return;
    this.isClosed = true;
    if (this.onClose) this.onClose();
  }

  _handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const b0 = this.buffer[0];
      const b1 = this.buffer[1];
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let offset = 2;

      if (len === 126) {
        if (this.buffer.length < 4) return;
        len = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (this.buffer.length < 10) return;
        len = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskLength = masked ? 4 : 0;
      if (this.buffer.length < offset + maskLength + len) return;

      let mask = null;
      if (masked) {
        mask = this.buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      const payload = this.buffer.subarray(offset, offset + len);
      this.buffer = this.buffer.subarray(offset + len);

      if (opcode === 0x8) { // Close
        this.close();
        return;
      } else if (opcode === 0x9) { // Ping
        this._sendPong(payload);
      } else if (opcode === 0x1) { // Text
        const decoded = Buffer.alloc(len);
        for (let i = 0; i < len; i++) {
          decoded[i] = mask ? payload[i] ^ mask[i % 4] : payload[i];
        }
        const text = decoded.toString('utf8');
        if (this.onMessage) {
          try {
            const data = JSON.parse(text);
            this.onMessage(data);
          } catch (e) {
            console.error('Invalid JSON message:', e.message);
          }
        }
      }
    }
  }

  _sendPong(payload) {
    if (this.isClosed) return;
    const header = Buffer.from([0x8a, payload.length]);
    this.socket.write(Buffer.concat([header, payload]));
  }

  send(data) {
    if (this.isClosed || !this.socket.writable) return;
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const payload = Buffer.from(text, 'utf8');
    const len = payload.length;
    let header;

    if (len < 126) {
      header = Buffer.from([0x81, len]);
    } else if (len <= 65535) {
      header = Buffer.from([0x81, 126, (len >> 8) & 0xff, len & 0xff]);
    } else {
      const b = Buffer.alloc(10);
      b[0] = 0x81;
      b[1] = 127;
      b.writeBigUInt64BE(BigInt(len), 2);
      header = b;
    }

    try {
      this.socket.write(Buffer.concat([header, payload]));
    } catch (e) {
      this.close();
    }
  }

  close() {
    if (this.isClosed) return;
    this.isClosed = true;
    try {
      this.socket.write(Buffer.from([0x88, 0x00]));
      this.socket.end();
    } catch (e) {}
  }
}

// Game State & Room
class GameRoom {
  constructor() {
    this.players = [null, null]; // slot 0: Frost, slot 1: Ember
    this.spectators = new Set();
    this.mode = 'duel'; // 'duel' | 'crown'
    this.status = 'ready'; // 'ready' | 'playing' | 'paused' | 'gameover'
    this.pauseReason = '';
    this.winner = null; // 'frost' | 'ember' | 'draw'
    this.winReason = '';
    this.targets = [];
    this.roundCount = 1;
    this.combatEvents = []; // hit flashes, sounds, KO notifications

    this.beasts = [
      this._createBeast(0, 'Frost', 240, 1),
      this._createBeast(1, 'Ember', 960, -1)
    ];

    this._initTargets();
  }

  _createBeast(id, name, x, facing) {
    return {
      id,
      name,
      x,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      width: 70,
      height: 90,
      facing, // 1 for right, -1 for left
      hp: 100,
      maxHp: 100,
      power: 0, // 0..5 in crown hunt
      flightEnergy: 100,
      isGrounded: true,
      isFlying: false,
      state: 'idle', // idle, walk, jump, fly, punch, kick, spin, blink, hit, ko
      stateTimer: 0,
      cooldowns: {
        punch: 0,
        kick: 0,
        spin: 0,
        blink: 0,
        super: 0
      },
      invulnTimer: 0,
      respawnTimer: 0,
      targetsDefeated: 0,
      score: 0,
      inputs: {
        left: false,
        right: false,
        jump: false,
        punch: false,
        kick: false,
        spin: false,
        blink: false,
        super: false
      }
    };
  }

  _initTargets() {
    this.targets = [];
    if (this.mode === 'crown') {
      // Spawn 5 floating/hopping targets
      const targetSpawns = [
        { x: 380, y: 320, vx: 1.5 },
        { x: 600, y: 220, vx: -1.2 },
        { x: 820, y: 320, vx: 1.8 },
        { x: 500, y: 410, vx: 1.0 },
        { x: 700, y: 410, vx: -1.0 }
      ];
      for (let i = 0; i < targetSpawns.length; i++) {
        const s = targetSpawns[i];
        this.targets.push({
          id: i,
          x: s.x,
          y: s.y,
          vx: s.vx,
          vy: 0,
          radius: 26,
          hp: 25,
          alive: true,
          respawnTimer: 0
        });
      }
    }
  }

  resetRound() {
    this.beasts[0] = this._createBeast(0, 'Frost', 240, 1);
    this.beasts[1] = this._createBeast(1, 'Ember', 960, -1);
    this.winner = null;
    this.winReason = '';
    this.combatEvents = [];
    this._initTargets();
    this.status = 'playing';
    this.roundCount++;
    this.combatEvents.push({ type: 'announcement', text: 'FIGHT!' });
  }

  setMode(mode) {
    this.mode = mode === 'crown' ? 'crown' : 'duel';
    this.resetRound();
  }

  togglePause(byWho = 'Teacher') {
    if (this.status === 'playing') {
      this.status = 'paused';
      this.pauseReason = `Paused by ${byWho}`;
    } else if (this.status === 'paused') {
      this.status = 'playing';
      this.pauseReason = '';
    }
  }

  addConnection(ws) {
    // Check if slot 0 or 1 is free
    let assignedSlot = -1;
    if (!this.players[0]) {
      assignedSlot = 0;
      this.players[0] = ws;
    } else if (!this.players[1]) {
      assignedSlot = 1;
      this.players[1] = ws;
    } else {
      this.spectators.add(ws);
    }

    ws.slot = assignedSlot;
    ws.send({
      type: 'welcome',
      slot: assignedSlot,
      beastName: assignedSlot === 0 ? 'Frost' : (assignedSlot === 1 ? 'Ember' : 'Spectator'),
      mode: this.mode,
      status: this.status,
      roundCount: this.roundCount
    });

    if (this.players[0] && this.players[1] && (this.status === 'ready' || this.status === 'paused')) {
      this.status = 'playing';
      this.pauseReason = '';
      this.combatEvents.push({ type: 'announcement', text: 'ARENA READY! FIGHT!' });
    }

    this.broadcastState();
  }

  removeConnection(ws) {
    if (ws.slot === 0 || ws.slot === 1) {
      const leftPlayer = ws.slot === 0 ? 'Frost' : 'Ember';
      this.players[ws.slot] = null;
      if (this.status === 'playing') {
        this.status = 'paused';
        this.pauseReason = `${leftPlayer} disconnected. Waiting for rejoin...`;
      }
    } else {
      this.spectators.delete(ws);
    }
    this.broadcastState();
  }

  handleInput(slot, data) {
    if (slot < 0 || slot > 1) return;
    const b = this.beasts[slot];
    if (!b || b.hp <= 0) return;

    // Movement flags
    if (typeof data.left === 'boolean') b.inputs.left = data.left;
    if (typeof data.right === 'boolean') b.inputs.right = data.right;
    if (typeof data.jump === 'boolean') b.inputs.jump = data.jump;

    // Trigger actions (if not stunned/cooldown)
    if (this.status === 'playing') {
      if (data.punch && b.cooldowns.punch <= 0) this._triggerAction(b, 'punch');
      if (data.kick && b.cooldowns.kick <= 0) this._triggerAction(b, 'kick');
      if (data.spin && b.cooldowns.spin <= 0) this._triggerAction(b, 'spin');
      if (data.blink && b.cooldowns.blink <= 0) this._triggerAction(b, 'blink');
      if (data.super && b.cooldowns.super <= 0) this._triggerAction(b, 'super');
    }
  }

  _triggerAction(b, action) {
    if (b.state === 'ko' || b.state === 'hit') return;
    if (b.state === 'punch' || b.state === 'kick' || b.state === 'spin' || b.state === 'blink' || b.state === 'super') return;

    if (action === 'punch') {
      b.state = 'punch';
      b.stateTimer = 10;
      b.cooldowns.punch = 12;
      this._performAttack(b, 'punch', 75, 45, 12, 5);
    } else if (action === 'kick') {
      b.state = 'kick';
      b.stateTimer = 14;
      b.cooldowns.kick = 18;
      this._performAttack(b, 'kick', 110, 50, 18, 9);
    } else if (action === 'spin') {
      b.state = 'spin';
      b.stateTimer = 22;
      b.cooldowns.spin = 100; // ~3.3s
      this._performSpin(b);
    } else if (action === 'blink') {
      b.state = 'blink';
      b.stateTimer = 8;
      b.cooldowns.blink = 90; // ~3.0s
      this._performBlink(b);
    } else if (action === 'super') {
      b.state = 'super';
      b.stateTimer = 25;
      b.cooldowns.super = 240; // ~8.0s
      this._performSuper(b);
    }
  }

  _performBlink(b) {
    const oldX = b.x;
    b.x += b.facing * 200;
    // clamp
    b.x = Math.max(70, Math.min(ARENA_WIDTH - 70, b.x));
    b.vx = 0;
    this.combatEvents.push({
      type: 'blink',
      fromX: oldX,
      toX: b.x,
      y: b.y,
      beastId: b.id
    });
  }

  _performAttack(attacker, type, range, heightRange, baseDamage, baseKnockback) {
    const powerMultiplier = 1 + (attacker.power * 0.15);
    const damage = Math.round(baseDamage * powerMultiplier);
    const knockback = baseKnockback * powerMultiplier;
    const hitBox = {
      x: attacker.facing === 1 ? attacker.x : attacker.x - range,
      y: attacker.y - attacker.height + 15,
      width: range,
      height: attacker.height - 10
    };

    // Check hit on other beast
    const opponent = this.beasts[attacker.id === 0 ? 1 : 0];
    if (opponent && opponent.hp > 0 && opponent.invulnTimer <= 0) {
      const oppBox = {
        x: opponent.x - opponent.width / 2,
        y: opponent.y - opponent.height,
        width: opponent.width,
        height: opponent.height
      };

      if (this._rectOverlap(hitBox, oppBox)) {
        this._applyHit(opponent, damage, attacker.facing * knockback, -5, type, attacker.id);
      }
    }

    // Check hit on targets in crown mode
    if (this.mode === 'crown') {
      for (const t of this.targets) {
        if (!t.alive) continue;
        const targetBox = { x: t.x - t.radius, y: t.y - t.radius, width: t.radius * 2, height: t.radius * 2 };
        if (this._rectOverlap(hitBox, targetBox)) {
          this._applyTargetHit(t, damage, attacker);
        }
      }
    }
  }

  _performSpin(attacker) {
    const powerMultiplier = 1 + (attacker.power * 0.15);
    const damage = Math.round(22 * powerMultiplier);
    const radius = 95;

    this.combatEvents.push({
      type: 'spin_effect',
      x: attacker.x,
      y: attacker.y - attacker.height / 2,
      radius,
      beastId: attacker.id
    });

    const opponent = this.beasts[attacker.id === 0 ? 1 : 0];
    if (opponent && opponent.hp > 0 && opponent.invulnTimer <= 0) {
      const dx = opponent.x - attacker.x;
      const dy = (opponent.y - opponent.height / 2) - (attacker.y - attacker.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius + opponent.width / 2) {
        const dir = dx >= 0 ? 1 : -1;
        this._applyHit(opponent, damage, dir * 12, -7, 'spin', attacker.id);
      }
    }

    if (this.mode === 'crown') {
      for (const t of this.targets) {
        if (!t.alive) continue;
        const dx = t.x - attacker.x;
        const dy = t.y - (attacker.y - attacker.height / 2);
        if (Math.sqrt(dx * dx + dy * dy) <= radius + t.radius) {
          this._applyTargetHit(t, damage, attacker);
        }
      }
    }
  }

  _performSuper(attacker) {
    const powerMultiplier = 1 + (attacker.power * 0.15);
    const damage = Math.round(35 * powerMultiplier);

    this.combatEvents.push({
      type: 'super_blast',
      startX: attacker.x + attacker.facing * 40,
      y: attacker.y - attacker.height / 2,
      facing: attacker.facing,
      beastId: attacker.id,
      color: attacker.id === 0 ? '#4fe3ff' : '#ff7b39'
    });

    const opponent = this.beasts[attacker.id === 0 ? 1 : 0];
    if (opponent && opponent.hp > 0 && opponent.invulnTimer <= 0) {
      // Super blasts entire horizontal lane
      const laneY = attacker.y - attacker.height / 2;
      const oppY = opponent.y - opponent.height / 2;
      const inLane = Math.abs(oppY - laneY) < 70;
      const inFacing = attacker.facing === 1 ? opponent.x > attacker.x : opponent.x < attacker.x;
      if (inLane && inFacing) {
        this._applyHit(opponent, damage, attacker.facing * 16, -9, 'super', attacker.id);
      }
    }

    if (this.mode === 'crown') {
      for (const t of this.targets) {
        if (!t.alive) continue;
        const inLane = Math.abs(t.y - (attacker.y - attacker.height / 2)) < 60;
        const inFacing = attacker.facing === 1 ? t.x > attacker.x : t.x < attacker.x;
        if (inLane && inFacing) {
          this._applyTargetHit(t, damage, attacker);
        }
      }
    }
  }

  _applyHit(victim, damage, knockX, knockY, attackType, attackerId) {
    victim.hp = Math.max(0, victim.hp - damage);
    victim.vx = knockX;
    victim.vy = knockY;
    victim.invulnTimer = 18; // ~0.6s invulnerability
    victim.state = victim.hp <= 0 ? 'ko' : 'hit';
    victim.stateTimer = victim.hp <= 0 ? 9999 : 14;

    this.combatEvents.push({
      type: 'hit',
      victimId: victim.id,
      attackerId,
      damage,
      x: victim.x,
      y: victim.y - victim.height / 2,
      attackType
    });

    if (victim.hp <= 0) {
      this._handleKO(victim);
    }
  }

  _applyTargetHit(target, damage, attacker) {
    target.hp -= damage;
    this.combatEvents.push({
      type: 'target_hit',
      targetId: target.id,
      x: target.x,
      y: target.y,
      damage
    });

    if (target.hp <= 0) {
      target.alive = false;
      target.respawnTimer = 120; // respawn in 4 seconds
      attacker.targetsDefeated++;
      attacker.power = Math.min(5, attacker.power + 1);

      this.combatEvents.push({
        type: 'target_destroyed',
        targetId: target.id,
        beastId: attacker.id,
        targetsCount: attacker.targetsDefeated,
        power: attacker.power
      });

      if (attacker.targetsDefeated >= 5) {
        this.winner = attacker.id === 0 ? 'frost' : 'ember';
        this.winReason = `${attacker.name} defeated 5 targets and is crowned BEAST KING!`;
        this.status = 'gameover';
        this.combatEvents.push({
          type: 'victory',
          winner: this.winner,
          reason: this.winReason
        });
      }
    }
  }

  _handleKO(victim) {
    this.combatEvents.push({
      type: 'ko',
      victimId: victim.id,
      x: victim.x,
      y: victim.y
    });

    if (this.mode === 'duel') {
      const other = this.beasts[victim.id === 0 ? 1 : 0];
      if (other.hp <= 0) {
        this.winner = 'draw';
        this.winReason = 'Double Knockout! Draw!';
      } else {
        this.winner = other.id === 0 ? 'frost' : 'ember';
        this.winReason = `${other.name} wins by Knockout!`;
      }
      this.status = 'gameover';
      this.combatEvents.push({
        type: 'victory',
        winner: this.winner,
        reason: this.winReason
      });
    } else if (this.mode === 'crown') {
      // In Crown Hunt, respawn after 3 seconds so the hunt continues!
      victim.respawnTimer = 90; // 3 seconds at 30fps
    }
  }

  _rectOverlap(r1, r2) {
    return !(
      r1.x + r1.width < r2.x ||
      r1.x > r2.x + r2.width ||
      r1.y + r1.height < r2.y ||
      r1.y > r2.y + r2.height
    );
  }

  tick() {
    if (this.status !== 'playing') {
      return;
    }

    // Update Beasts
    for (let i = 0; i < 2; i++) {
      const b = this.beasts[i];

      // Respawn timer in Crown Hunt
      if (b.respawnTimer > 0) {
        b.respawnTimer--;
        if (b.respawnTimer === 0) {
          b.hp = 100;
          b.state = 'idle';
          b.stateTimer = 0;
          b.x = b.id === 0 ? 240 : 960;
          b.y = GROUND_Y;
          b.vx = 0;
          b.vy = 0;
          b.invulnTimer = 30; // brief invulnerability after respawn
          this.combatEvents.push({ type: 'respawn', beastId: b.id });
        }
        continue;
      }

      // Decrement timers & cooldowns
      if (b.invulnTimer > 0) b.invulnTimer--;
      for (const k of Object.keys(b.cooldowns)) {
        if (b.cooldowns[k] > 0) b.cooldowns[k]--;
      }
      if (b.stateTimer > 0) {
        b.stateTimer--;
        if (b.stateTimer === 0 && b.state !== 'ko') {
          b.state = 'idle';
        }
      }

      if (b.hp <= 0) {
        b.state = 'ko';
        continue;
      }

      // Movement & Physics
      const canMove = b.state === 'idle' || b.state === 'walk' || b.state === 'jump' || b.state === 'fly';
      if (canMove) {
        let moveX = 0;
        if (b.inputs.left) moveX -= 1;
        if (b.inputs.right) moveX += 1;

        if (moveX !== 0) {
          b.vx = moveX * 6.8;
          b.facing = moveX > 0 ? 1 : -1;
          if (b.isGrounded && b.state === 'idle') b.state = 'walk';
        } else {
          b.vx *= 0.65;
          if (Math.abs(b.vx) < 0.2) b.vx = 0;
          if (b.isGrounded && b.state === 'walk') b.state = 'idle';
        }

        // Jump & Fly logic
        if (b.inputs.jump) {
          if (b.isGrounded) {
            b.vy = -14;
            b.isGrounded = false;
            b.state = 'jump';
          } else if (b.flightEnergy > 5) {
            // Flight mode (hold jump)
            b.isFlying = true;
            b.state = 'fly';
            b.vy = Math.max(-6, b.vy - 1.2);
            b.flightEnergy = Math.max(0, b.flightEnergy - 0.7);
          }
        } else {
          b.isFlying = false;
        }
      }

      // Gravity
      if (!b.isFlying) {
        b.vy += 0.85;
      } else {
        b.vy += 0.2;
      }

      // Apply velocity
      b.x += b.vx;
      b.y += b.vy;

      // Arena bounds & ground
      if (b.y >= GROUND_Y) {
        b.y = GROUND_Y;
        b.vy = 0;
        b.isGrounded = true;
        b.isFlying = false;
        // Recharge flight energy on ground
        b.flightEnergy = Math.min(100, b.flightEnergy + 1.2);
      } else {
        b.isGrounded = false;
      }

      b.x = Math.max(60, Math.min(ARENA_WIDTH - 60, b.x));
    }

    // Update Targets in Crown Hunt
    if (this.mode === 'crown') {
      for (const t of this.targets) {
        if (!t.alive) {
          if (t.respawnTimer > 0) {
            t.respawnTimer--;
            if (t.respawnTimer === 0) {
              t.alive = true;
              t.hp = 25;
            }
          }
          continue;
        }

        t.x += t.vx;
        if (t.x < 150 || t.x > ARENA_WIDTH - 150) {
          t.vx *= -1;
        }
        // slight bobbing
        t.y += Math.sin(Date.now() / 300 + t.id) * 0.7;
      }
    }
  }

  getStateSnapshot() {
    return {
      mode: this.mode,
      status: this.status,
      pauseReason: this.pauseReason,
      winner: this.winner,
      winReason: this.winReason,
      roundCount: this.roundCount,
      playersConnected: [!!this.players[0], !!this.players[1]],
      spectatorCount: this.spectators.size,
      beasts: this.beasts.map(b => ({
        id: b.id,
        name: b.name,
        x: Math.round(b.x),
        y: Math.round(b.y),
        vx: Math.round(b.vx * 10) / 10,
        vy: Math.round(b.vy * 10) / 10,
        facing: b.facing,
        hp: b.hp,
        maxHp: b.maxHp,
        power: b.power,
        flightEnergy: Math.round(b.flightEnergy),
        state: b.state,
        isGrounded: b.isGrounded,
        isFlying: b.isFlying,
        invuln: b.invulnTimer > 0,
        cooldowns: {
          punch: b.cooldowns.punch,
          kick: b.cooldowns.kick,
          spin: b.cooldowns.spin,
          blink: b.cooldowns.blink,
          super: b.cooldowns.super
        },
        targetsDefeated: b.targetsDefeated
      })),
      targets: this.mode === 'crown' ? this.targets.map(t => ({
        id: t.id,
        x: Math.round(t.x),
        y: Math.round(t.y),
        alive: t.alive,
        hp: t.hp
      })) : [],
      events: this.combatEvents
    };
  }

  broadcastState() {
    const snapshot = this.getStateSnapshot();
    const payload = JSON.stringify({ type: 'sync', state: snapshot });

    if (this.players[0]) this.players[0].send(payload);
    if (this.players[1]) this.players[1].send(payload);
    for (const s of this.spectators) {
      s.send(payload);
    }
    // Clear transient events
    this.combatEvents = [];
  }
}

// Server bootstrap
const room = new GameRoom();

// 30 Hz Game Loop
setInterval(() => {
  room.tick();
  room.broadcastState();
}, 33);

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
});

// Upgrade to WebSocket
server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );

  const ws = new MiniWS(socket);
  room.addConnection(ws);

  ws.onMessage = (msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'input') {
      room.handleInput(ws.slot, msg);
    } else if (msg.type === 'mode') {
      room.setMode(msg.mode);
      room.broadcastState();
    } else if (msg.type === 'pause') {
      room.togglePause(ws.slot === 0 ? 'Frost' : (ws.slot === 1 ? 'Ember' : 'Teacher'));
      room.broadcastState();
    } else if (msg.type === 'rematch') {
      room.resetRound();
      room.broadcastState();
    }
  };

  ws.onClose = () => {
    room.removeConnection(ws);
  };
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Beast Kings - Antigravity Edition] Listening on http://0.0.0.0:${PORT}`);
});
