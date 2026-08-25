/**
 * Victory vs Alex - Fighter Entity & Anatomical Vector Renderer
 */

class Fighter {
    constructor(data, x, y, facing = 1, isPlayer = true, playerNum = 1) {
        this.data = data;
        this.id = data.id;
        this.name = data.name;
        this.nickname = data.nickname;
        this.isPlayer = isPlayer;
        this.playerNum = playerNum;

        // Position & Physics
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.vx = 0;
        this.vy = 0;
        this.facing = facing; // 1 = facing right, -1 = facing left

        // Combat Stats
        this.maxHealth = data.maxHealth;
        this.health = data.maxHealth;
        this.maxStamina = data.maxStamina;
        this.stamina = data.maxStamina;
        this.superMeter = 0; // 0 to 100
        this.maxSuperMeter = 100;
        this.knockdowns = 0;
        this.maxKnockdowns = 3;

        // States
        this.state = 'IDLE'; // IDLE, WALK_FWD, WALK_BWD, DASH, WEAVE, GUARD, ATTACK, HITSTUN, DIZZY, DOWNED, GETUP, WIN, LOSE
        this.currentMove = null;
        this.moveFrame = 0;
        this.stateTimer = 0;
        this.hitstunTimer = 0;
        this.counterWindow = 0;
        this.guardBreakTimer = 0;

        // Super attack sub-combo index
        this.superHitIndex = 0;
        this.superTimer = 0;

        // Downed & 10-count mash recovery
        this.downedTimer = 0;
        this.recoveryMash = 0;
        this.targetMash = 100;

        // Combo Tracking
        this.comboHits = 0;
        this.comboDamage = 0;
        this.comboTimer = 0;

        // Visual / Animation interpolation timers
        this.animTimer = Math.random() * 100;
        this.trailPositions = [];
        this.palette = data.palette;

        // Target opponent reference
        this.opponent = null;
    }

    setOpponent(opponent) {
        this.opponent = opponent;
    }

    resetForRound(x, facing) {
        this.x = x;
        this.y = this.baseY;
        this.vx = 0;
        this.vy = 0;
        this.facing = facing;
        this.health = this.maxHealth;
        this.stamina = this.maxStamina;
        this.state = 'IDLE';
        this.currentMove = null;
        this.moveFrame = 0;
        this.stateTimer = 0;
        this.hitstunTimer = 0;
        this.counterWindow = 0;
        this.guardBreakTimer = 0;
        this.trailPositions = [];
        this.downedTimer = 0;
        this.recoveryMash = 0;
        this.comboHits = 0;
        this.comboDamage = 0;
    }

    // Input Handling
    handleInput(input) {
        if (this.state === 'DOWNED') {
            // Mashing buttons to get up!
            if (input.jab || input.cross || input.hook || input.uppercut || input.guard || input.dodge || input.up) {
                this.recoveryMash += 5.5;
                window.particleSystem.createAura(this.x, this.y - 30, '#38bdf8', 1);
            }
            return;
        }

        if (this.state === 'HITSTUN' || this.state === 'DIZZY' || this.state === 'KNOCKDOWN_FALL' || this.state === 'GETUP' || this.state === 'WIN' || this.state === 'LOSE') {
            return;
        }

        // Super Move Trigger
        if (input.super && this.superMeter >= 100 && this.canAct()) {
            this.executeSuper();
            return;
        }

        // Attacks
        if (input.uppercut && this.canAct()) {
            this.executeMove('UPPERCUT');
            return;
        }
        if (input.hook && this.canAct()) {
            this.executeMove('BODY_HOOK');
            return;
        }
        if (input.cross && this.canAct()) {
            this.executeMove('CROSS');
            return;
        }
        if (input.jab && this.canAct()) {
            this.executeMove('JAB');
            return;
        }

        // Defensive Weave / Slip
        if (input.dodge && this.canAct() && this.stamina >= this.data.moves.WEAVE.staminaCost) {
            this.executeWeave();
            return;
        }

        // Guard
        if (input.guard && this.canAct()) {
            this.state = 'GUARD';
            this.vx = 0;
            return;
        } else if (this.state === 'GUARD' && !input.guard) {
            this.state = 'IDLE';
        }

        // Movement (Walk / Dash)
        if (this.state === 'IDLE' || this.state === 'WALK_FWD' || this.state === 'WALK_BWD') {
            const moveDir = input.left ? -1 : (input.right ? 1 : 0);
            if (moveDir !== 0) {
                const isForward = (moveDir === this.facing);
                
                // Dash input check
                if (input.dash) {
                    this.state = 'DASH';
                    this.stateTimer = this.data.dashDuration;
                    this.vx = moveDir * this.data.dashSpeed;
                    window.soundEngine.playWhoosh(1.4);
                    window.particleSystem.createCanvasDust(this.x, this.y, -moveDir, 6);
                } else {
                    this.state = isForward ? 'WALK_FWD' : 'WALK_BWD';
                    const speed = isForward ? this.data.moveSpeed : this.data.moveSpeed * 0.8;
                    this.vx = moveDir * speed;
                }
            } else {
                this.state = 'IDLE';
                this.vx = 0;
            }
        }
    }

    canAct() {
        return (this.state === 'IDLE' || this.state === 'WALK_FWD' || this.state === 'WALK_BWD' || this.state === 'GUARD');
    }

    executeMove(moveKey) {
        const move = this.data.moves[moveKey];
        if (!move) return;
        if (this.stamina < move.staminaCost) {
            // Low stamina penalty (sluggish)
            return;
        }

        this.stamina = Math.max(0, this.stamina - move.staminaCost);
        this.currentMove = { ...move, key: moveKey };
        this.moveFrame = 0;
        this.state = 'ATTACK';
        this.stateTimer = move.startup + move.active + move.recovery;
        this.vx = 0;

        if (move.lungeX) {
            this.vx = this.facing * (move.lungeX / (move.startup + 2));
        }

        window.soundEngine.playWhoosh(moveKey === 'JAB' ? 1.3 : 0.9);
    }

    executeWeave() {
        const weave = this.data.moves.WEAVE;
        this.stamina = Math.max(0, this.stamina - weave.staminaCost);
        this.state = 'WEAVE';
        this.stateTimer = weave.startup + weave.active + weave.recovery;
        this.counterWindow = weave.active;
        this.vx = -this.facing * 3.5;
        window.soundEngine.playWhoosh(1.6);
        window.particleSystem.createAura(this.x, this.y - 40, 'rgba(56, 189, 248, 0.6)', 3);
    }

    executeSuper() {
        this.superMeter = 0;
        this.state = 'ATTACK_SUPER';
        this.superHitIndex = 0;
        this.superTimer = 0;
        this.stateTimer = 90;
        this.vx = this.facing * 8;

        window.soundEngine.playSuperActivation();
        window.particleSystem.createAura(this.x, this.y - 50, this.palette.auraColor, 15);
        window.particleSystem.createShockwave(this.x, this.y - 50, 110, this.palette.auraColor);
        window.particleSystem.createFloatingText(this.x, this.y - 120, this.data.palette.superName + '!', '#fbbf24', 32);
    }

    // Hit Registration & Combat Resolution
    takeHit(attacker, move, isCounter = false) {
        if (this.state === 'DOWNED' || this.state === 'KNOCKDOWN_FALL') return;

        // Weaving / Slipping (Invulnerable dodge!)
        if (this.state === 'WEAVE') {
            window.soundEngine.playCounterPing();
            window.particleSystem.createFloatingText(this.x, this.y - 90, 'SLIP!', '#38bdf8', 28);
            attacker.superMeter = Math.min(attacker.maxSuperMeter, attacker.superMeter + 12);
            return;
        }

        // Guard / Block
        if (this.state === 'GUARD') {
            const guardData = this.data.moves.GUARD;
            const chipDamage = Math.round(move.damage * (1 - guardData.damageReduction));
            this.health = Math.max(0, this.health - chipDamage);
            this.stamina = Math.max(0, this.stamina - (move.staminaDamage + guardData.staminaDrainPerHit));

            this.vx = -this.facing * (move.knockback * 0.4);
            window.soundEngine.playBlock();
            window.particleSystem.createGuardSparks(this.x + this.facing * 30, this.y - 50, 12);
            window.particleSystem.createFloatingText(this.x, this.y - 80, 'BLOCKED', '#94a3b8', 20);

            // Guard Break check
            if (this.stamina <= 0) {
                this.triggerGuardBreak();
            }
            return;
        }

        // Clean / Counter Hit
        let finalDamage = move.damage;
        if (isCounter || attacker.counterWindow > 0) {
            finalDamage = Math.round(finalDamage * 1.45);
            window.particleSystem.createFloatingText(this.x, this.y - 95, 'COUNTER HIT!', '#ef4444', 30);
            window.particleSystem.createShockwave(this.x, this.y - 60, 95, '#ef4444');
        }

        this.health = Math.max(0, this.health - finalDamage);
        this.stamina = Math.max(0, this.stamina - move.staminaDamage);

        // Attacker Super meter gain
        attacker.superMeter = Math.min(attacker.maxSuperMeter, attacker.superMeter + Math.round(finalDamage * 0.08));

        // Combo Tracking
        attacker.comboHits++;
        attacker.comboDamage += finalDamage;
        attacker.comboTimer = 60;

        // Sound & Visuals
        if (move.sfx === 'heavy' || move.type === 'super') {
            window.soundEngine.playHeavyHit(isCounter);
            window.particleSystem.createSweatSpray(this.x, this.y - 50, -this.facing, 25);
            window.particleSystem.createHitSparks(this.x, this.y - 50, 20, '#fbbf24', true);
        } else if (move.sfx === 'hook') {
            window.soundEngine.playHookHit();
            window.particleSystem.createSweatSpray(this.x, this.y - 50, -this.facing, 15);
            window.particleSystem.createHitSparks(this.x, this.y - 50, 12, '#f59e0b', false);
        } else {
            window.soundEngine.playJabHit();
            window.particleSystem.createHitSparks(this.x, this.y - 50, 8, '#ffffff', false);
        }

        // Knockdown or Hitstun
        if (this.health <= 0 || (move.launchY && this.health < this.maxHealth * 0.4)) {
            this.triggerKnockdown(attacker, move);
        } else {
            this.state = 'HITSTUN';
            this.hitstunTimer = move.hitstun || 20;
            this.vx = -this.facing * move.knockback;
            if (move.launchY) {
                this.vy = move.launchY;
            }
        }
    }

    triggerGuardBreak() {
        this.state = 'DIZZY';
        this.guardBreakTimer = 120;
        this.vx = -this.facing * 4;
        window.soundEngine.playHeavyHit();
        window.particleSystem.createFloatingText(this.x, this.y - 90, 'GUARD BREAK!', '#fbbf24', 32);
        window.particleSystem.createShockwave(this.x, this.y - 50, 80, '#fbbf24');
    }

    triggerKnockdown(attacker, move) {
        this.knockdowns++;
        this.state = 'KNOCKDOWN_FALL';
        this.stateTimer = 40;
        this.vx = -this.facing * (move.knockback * 1.5);
        this.vy = -10;
        this.downedTimer = 0;
        this.recoveryMash = 0;
        this.targetMash = 70 + (this.knockdowns * 35); // Harder to get up after multiple KDs

        window.soundEngine.playHeavyHit();
        window.soundEngine.playCrowdRoar(1.2);
        window.particleSystem.createShockwave(this.x, this.y - 20, 120, '#ef4444');
        window.particleSystem.createFloatingText(this.x, this.y - 110, 'DOWN!', '#dc2626', 42);
    }

    update(ring) {
        this.animTimer += 0.08;

        // Facing direction tracking (automatically face opponent when neutral)
        if (this.opponent && (this.state === 'IDLE' || this.state === 'WALK_FWD' || this.state === 'WALK_BWD')) {
            this.facing = (this.opponent.x > this.x) ? 1 : -1;
        }

        // Natural Stamina Regeneration
        if (this.state !== 'GUARD' && this.state !== 'ATTACK' && this.state !== 'ATTACK_SUPER' && this.state !== 'WEAVE') {
            this.stamina = Math.min(this.maxStamina, this.stamina + this.data.staminaRegen);
        }

        // Combo timer tick
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) {
                this.comboHits = 0;
                this.comboDamage = 0;
            }
        }

        // Physics movement
        this.x += this.vx;
        this.y += this.vy;

        // Friction
        if (this.state !== 'DASH') {
            this.vx *= 0.85;
        }

        // Gravity
        if (this.y < this.baseY) {
            this.vy += 0.9;
        } else {
            this.y = this.baseY;
            this.vy = 0;
        }

        // Ring Boundary Constraints
        if (ring) {
            if (this.x < ring.leftBound) {
                this.x = ring.leftBound;
                if (Math.abs(this.vx) > 3) ring.hitRope('left', Math.abs(this.vx));
            }
            if (this.x > ring.rightBound) {
                this.x = ring.rightBound;
                if (Math.abs(this.vx) > 3) ring.hitRope('right', Math.abs(this.vx));
            }
        }

        // Body Collision Separation (prevent phasing through opponent)
        if (this.opponent && this.state !== 'DOWNED' && this.opponent.state !== 'DOWNED') {
            const minDistance = 68;
            const dist = Math.abs(this.x - this.opponent.x);
            if (dist < minDistance) {
                const overlap = (minDistance - dist) * 0.5;
                if (this.x < this.opponent.x) {
                    this.x -= overlap;
                    this.opponent.x += overlap;
                } else {
                    this.x += overlap;
                    this.opponent.x -= overlap;
                }
            }
        }

        // Ghost Trail for Dash & Super
        if (this.state === 'DASH' || this.state === 'ATTACK_SUPER') {
            if (Math.random() > 0.4) {
                this.trailPositions.push({ x: this.x, y: this.y, facing: this.facing, life: 1.0 });
            }
        }
        for (let i = this.trailPositions.length - 1; i >= 0; i--) {
            this.trailPositions[i].life -= 0.1;
            if (this.trailPositions[i].life <= 0) {
                this.trailPositions.splice(i, 1);
            }
        }

        // State Handlers
        switch (this.state) {
            case 'DASH':
                this.stateTimer--;
                if (this.stateTimer <= 0) {
                    this.state = 'IDLE';
                    this.vx = 0;
                }
                break;

            case 'WEAVE':
                this.stateTimer--;
                if (this.stateTimer <= 0) {
                    this.state = 'IDLE';
                }
                break;

            case 'ATTACK':
                this.updateAttack();
                break;

            case 'ATTACK_SUPER':
                this.updateSuperAttack();
                break;

            case 'HITSTUN':
                this.hitstunTimer--;
                if (this.hitstunTimer <= 0) {
                    this.state = 'IDLE';
                }
                break;

            case 'DIZZY':
                this.guardBreakTimer--;
                if (this.guardBreakTimer <= 0) {
                    this.stamina = this.maxStamina * 0.4;
                    this.state = 'IDLE';
                }
                break;

            case 'KNOCKDOWN_FALL':
                this.stateTimer--;
                if (this.stateTimer <= 0 && this.y >= this.baseY) {
                    this.state = 'DOWNED';
                    this.downedTimer = 0;
                    window.particleSystem.createCanvasDust(this.x, this.y, 0, 14);
                }
                break;

            case 'DOWNED':
                this.downedTimer++;
                // Natural slow recovery or player mash boost
                if (!this.isPlayer) {
                    // AI recovers based on knockdown count
                    this.recoveryMash += (1.4 - (this.knockdowns * 0.25));
                }

                if (this.recoveryMash >= this.targetMash && this.health > 0) {
                    this.state = 'GETUP';
                    this.stateTimer = 45;
                    this.health = Math.max(this.maxHealth * 0.25, this.health);
                    this.stamina = this.maxStamina * 0.5;
                    window.soundEngine.playWhoosh(1.1);
                }
                break;

            case 'GETUP':
                this.stateTimer--;
                if (this.stateTimer <= 0) {
                    this.state = 'IDLE';
                }
                break;
        }
    }

    updateAttack() {
        if (!this.currentMove) {
            this.state = 'IDLE';
            return;
        }

        this.moveFrame++;
        const move = this.currentMove;
        const startup = move.startup;
        const active = move.active;
        const recovery = move.recovery;

        // Check Hitbox during active frame window
        if (this.moveFrame === startup + 1 && this.opponent) {
            const dist = Math.abs(this.opponent.x - this.x);
            const inFront = (this.facing === 1 && this.opponent.x > this.x) || (this.facing === -1 && this.opponent.x < this.x);

            if (inFront && dist <= move.range) {
                // Determine if counter hit
                const isCounter = (this.opponent.state === 'ATTACK' || this.opponent.state === 'ATTACK_SUPER');
                this.opponent.takeHit(this, move, isCounter);
            }
        }

        if (this.moveFrame >= startup + active + recovery) {
            this.state = 'IDLE';
            this.currentMove = null;
        }
    }

    updateSuperAttack() {
        this.superTimer++;
        const totalFrames = 80;
        
        // Multi-hit sequence during super
        const hitTimings = [15, 28, 40, 52, 66];
        if (hitTimings.includes(this.superTimer) && this.opponent) {
            const dist = Math.abs(this.opponent.x - this.x);
            const inFront = (this.facing === 1 && this.opponent.x > this.x) || (this.facing === -1 && this.opponent.x < this.x);

            if (inFront && dist <= 160) {
                const isFinalHit = (this.superTimer === 66);
                const subDamage = Math.round(this.data.moves.SUPER.damage / 5);
                const miniMove = {
                    damage: subDamage,
                    staminaDamage: 18,
                    knockback: isFinalHit ? 30 : 6,
                    launchY: isFinalHit ? -16 : 0,
                    hitstun: 25,
                    sfx: isFinalHit ? 'heavy' : 'hook'
                };
                this.opponent.takeHit(this, miniMove, false);
                window.particleSystem.createAura(this.opponent.x, this.opponent.y - 50, this.palette.auraColor, 5);
            }
        }

        if (this.superTimer >= totalFrames) {
            this.state = 'IDLE';
        }
    }

    // DRAWING & SKELETAL VECTOR ANIMATION
    draw(ctx) {
        // Draw Ghost Trails
        for (const trail of this.trailPositions) {
            ctx.save();
            ctx.globalAlpha = trail.life * 0.35;
            this.drawSkeletalBody(ctx, trail.x, trail.y, trail.facing, true);
            ctx.restore();
        }

        // Draw Main Fighter
        ctx.save();
        this.drawSkeletalBody(ctx, this.x, this.y, this.facing, false);
        ctx.restore();

        // Draw Dizzy Stars / Guard Break
        if (this.state === 'DIZZY') {
            this.drawDizzyStars(ctx);
        }
    }

    drawSkeletalBody(ctx, posX, posY, facing, isGhost = false) {
        ctx.save();
        ctx.translate(posX, posY);
        ctx.scale(facing, 1);

        const pal = this.palette;
        const t = this.animTimer;

        // Procedural joint & limb offsets based on state
        let breathe = Math.sin(t * 3) * 3;
        let headTilt = 0;
        let torsoAngle = 0;
        let leadArmExt = 0;
        let rearArmExt = 0;
        let leadGloveY = -68;
        let rearGloveY = -74;
        let hipY = -70;
        let duckY = 0;

        if (this.state === 'IDLE') {
            duckY = Math.abs(Math.sin(t * 4)) * 4;
            leadGloveY += Math.sin(t * 3) * 4;
            rearGloveY += Math.cos(t * 3) * 3;
        } else if (this.state === 'WALK_FWD') {
            torsoAngle = 0.08;
            duckY = Math.sin(t * 8) * 6;
        } else if (this.state === 'WALK_BWD') {
            torsoAngle = -0.06;
            duckY = Math.sin(t * 8) * 5;
        } else if (this.state === 'GUARD') {
            leadGloveY = -85;
            rearGloveY = -88;
            torsoAngle = 0.12;
            headTilt = 0.15;
        } else if (this.state === 'WEAVE') {
            duckY = 28;
            torsoAngle = -0.25;
            headTilt = -0.2;
            leadGloveY = -50;
        } else if (this.state === 'ATTACK') {
            const move = this.currentMove;
            const progress = this.moveFrame / (move.startup + move.active + move.recovery);
            
            if (move.key === 'JAB') {
                leadArmExt = Math.sin(progress * Math.PI) * 75;
                torsoAngle = 0.1;
                leadGloveY = -72;
            } else if (move.key === 'CROSS') {
                rearArmExt = Math.sin(progress * Math.PI) * 95;
                torsoAngle = 0.22;
                rearGloveY = -72;
            } else if (move.key === 'BODY_HOOK') {
                leadArmExt = Math.sin(progress * Math.PI) * 55;
                leadGloveY = -45;
                duckY = 12;
                torsoAngle = 0.2;
            } else if (move.key === 'UPPERCUT') {
                rearArmExt = Math.sin(progress * Math.PI) * 60;
                rearGloveY = -95 - (Math.sin(progress * Math.PI) * 35);
                torsoAngle = -0.15;
                duckY = (progress < 0.4) ? 15 : -8;
            }
        } else if (this.state === 'ATTACK_SUPER') {
            const cycle = (this.superTimer % 14) / 14;
            leadArmExt = Math.sin(cycle * Math.PI) * 85;
            rearArmExt = Math.cos(cycle * Math.PI) * 90;
            torsoAngle = 0.15;
        } else if (this.state === 'HITSTUN') {
            torsoAngle = -0.3;
            headTilt = -0.35;
            leadGloveY = -40;
            rearGloveY = -45;
            duckY = -4;
        } else if (this.state === 'KNOCKDOWN_FALL') {
            torsoAngle = -0.8;
            headTilt = -0.6;
            duckY = 30;
        } else if (this.state === 'DOWNED') {
            // Lying flat on canvas
            this.drawDownedPose(ctx, pal, isGhost);
            ctx.restore();
            return;
        } else if (this.state === 'GETUP') {
            duckY = (this.stateTimer / 45) * 45;
            torsoAngle = -0.2;
        } else if (this.state === 'WIN') {
            leadGloveY = -140;
            rearGloveY = -140;
            torsoAngle = 0;
        }

        // --- DRAWING LAYERS (Back to Front) ---

        // 1. Shadow underneath
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 48, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Rear Leg & Boot
        this.drawLeg(ctx, pal, -18, hipY + duckY, -12, 0, '#0f172a');

        // 3. Lead Leg & Boot
        this.drawLeg(ctx, pal, 14, hipY + duckY, 18, 0, '#1e293b');

        // 4. Rear Arm & Glove
        this.drawArm(ctx, pal, -14, hipY - 40 + duckY, rearArmExt, rearGloveY + duckY, true, isGhost);

        // 5. Trunks (Waist & Shorts)
        this.drawTrunks(ctx, pal, 0, hipY + duckY, torsoAngle);

        // 6. Muscular Torso & Chest
        this.drawTorso(ctx, pal, 0, hipY + duckY, torsoAngle, breathe);

        // 7. Head & Hair & Face
        this.drawHead(ctx, pal, 0, hipY - 48 + duckY, headTilt);

        // 8. Lead Arm & Glove
        this.drawArm(ctx, pal, 18, hipY - 38 + duckY, leadArmExt, leadGloveY + duckY, false, isGhost);

        ctx.restore();
    }

    drawTorso(ctx, pal, x, y, angle, breathe) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Muscular Torso base
        ctx.fillStyle = pal.skin;
        ctx.beginPath();
        ctx.moveTo(-24, 0);
        ctx.lineTo(24, 0);
        ctx.lineTo(28, -48 - breathe);
        ctx.lineTo(-26, -48 - breathe);
        ctx.closePath();
        ctx.fill();

        // Shading / Muscle Definition (Abs & Chest)
        ctx.strokeStyle = pal.skinShadow;
        ctx.lineWidth = 2.5;

        // Pectorals
        ctx.beginPath();
        ctx.arc(-11, -34 - breathe, 11, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(11, -34 - breathe, 11, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Center line & Abdominal 6-pack cuts
        ctx.beginPath();
        ctx.moveTo(0, -38);
        ctx.lineTo(0, -5);
        // Ab cuts
        ctx.moveTo(-10, -22); ctx.lineTo(10, -22);
        ctx.moveTo(-9, -12); ctx.lineTo(9, -12);
        ctx.stroke();

        ctx.restore();
    }

    drawHead(ctx, pal, x, y, tilt) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);

        // Neck
        ctx.fillStyle = pal.skinShadow;
        ctx.fillRect(-8, 0, 16, 12);

        // Head Base
        ctx.fillStyle = pal.skin;
        ctx.beginPath();
        ctx.ellipse(0, -14, 15, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Jawline & Chin
        ctx.fillStyle = pal.skin;
        ctx.beginPath();
        ctx.moveTo(-12, -12);
        ctx.lineTo(0, 2);
        ctx.lineTo(12, -12);
        ctx.fill();

        // Eye / Eyebrow & Fierce Boxing Gaze
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(4, -16, 7, 3); // Right fierce eye
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(6, -15, 4, 2);

        // Mouthpiece / Lips
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(4, -4, 6, 2.5);

        // Styled Hair
        ctx.fillStyle = pal.hair;
        ctx.beginPath();
        ctx.arc(0, -20, 16, Math.PI, Math.PI * 2);
        ctx.lineTo(16, -14);
        ctx.lineTo(8, -26);
        ctx.lineTo(0, -28);
        ctx.lineTo(-8, -26);
        ctx.lineTo(-16, -14);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    drawTrunks(ctx, pal, x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle * 0.5);

        // Waistband
        ctx.fillStyle = pal.trunksWaistband;
        ctx.fillRect(-24, 0, 48, 9);

        // Shorts Body
        ctx.fillStyle = pal.trunksPrimary;
        ctx.beginPath();
        ctx.moveTo(-25, 9);
        ctx.lineTo(25, 9);
        ctx.lineTo(28, 38);
        ctx.lineTo(4, 38);
        ctx.lineTo(0, 24);
        ctx.lineTo(-4, 38);
        ctx.lineTo(-28, 38);
        ctx.closePath();
        ctx.fill();

        // Side Gold / Silver Trim
        ctx.fillStyle = pal.trunksSecondary;
        ctx.fillRect(-27, 9, 6, 29);
        ctx.fillRect(21, 9, 6, 29);

        ctx.restore();
    }

    drawLeg(ctx, pal, hipX, hipY, footX, footY, bootColor) {
        ctx.save();

        // Thigh & Calf
        ctx.strokeStyle = pal.skin;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hipX, hipY + 30);
        ctx.lineTo((hipX + footX) * 0.5, (hipY + footY) * 0.5 + 10);
        ctx.lineTo(footX, footY - 14);
        ctx.stroke();

        // Boxing High-Top Boots
        ctx.fillStyle = pal.bootsPrimary;
        ctx.beginPath();
        ctx.roundRect(footX - 8, footY - 18, 22, 18, 4);
        ctx.fill();

        // Boot Trim / Laces
        ctx.fillStyle = pal.bootsSecondary;
        ctx.fillRect(footX - 8, footY - 18, 22, 4);
        ctx.fillRect(footX + 2, footY - 14, 4, 12);

        ctx.restore();
    }

    drawArm(ctx, pal, shoulderX, shoulderY, extX, gloveY, isRear, isGhost) {
        ctx.save();

        const elbowX = shoulderX + (extX * 0.45) + (isRear ? -6 : 10);
        const elbowY = shoulderY + 18 + (isRear ? 4 : 0);
        const handX = shoulderX + extX + (isRear ? 20 : 38);
        const handY = gloveY;

        // Bicep & Forearm
        ctx.strokeStyle = isRear ? pal.skinShadow : pal.skin;
        ctx.lineWidth = 13;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(handX, handY);
        ctx.stroke();

        // Wrist Wrap Tape
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(handX - 8, handY);
        ctx.lineTo(handX, handY);
        ctx.stroke();

        // Professional Boxing Glove
        ctx.fillStyle = pal.glovesPrimary;
        ctx.beginPath();
        ctx.ellipse(handX, handY, 15, 12, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Glove Knuckle Highlight / Lace Trim
        ctx.fillStyle = pal.glovesSecondary;
        ctx.beginPath();
        ctx.arc(handX + 6, handY, 7, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.fill();

        ctx.restore();
    }

    drawDownedPose(ctx, pal, isGhost) {
        // Fighter lying horizontally on the ring canvas
        ctx.save();
        ctx.translate(0, 10);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 65, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body horizontal
        ctx.fillStyle = pal.skin;
        ctx.beginPath();
        ctx.roundRect(-45, -18, 90, 18, 6);
        ctx.fill();

        // Shorts
        ctx.fillStyle = pal.trunksPrimary;
        ctx.fillRect(-15, -18, 35, 18);

        // Gloves limp on canvas
        ctx.fillStyle = pal.glovesPrimary;
        ctx.beginPath();
        ctx.arc(-50, -8, 12, 0, Math.PI * 2);
        ctx.arc(35, -8, 12, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = pal.skin;
        ctx.beginPath();
        ctx.arc(-48, -12, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.hair;
        ctx.arc(-52, -16, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawDizzyStars(ctx) {
        ctx.save();
        const t = this.animTimer * 2;
        const numStars = 4;
        for (let i = 0; i < numStars; i++) {
            const angle = t + (i * (Math.PI * 2 / numStars));
            const sx = this.x + Math.cos(angle) * 26;
            const sy = this.y - 120 + Math.sin(angle) * 8;

            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

window.Fighter = Fighter;
