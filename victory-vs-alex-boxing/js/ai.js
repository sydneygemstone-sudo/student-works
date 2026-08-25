/**
 * Victory vs Alex - AI Boxing Intelligence Controller
 */

class BoxingAI {
    constructor(difficulty = 'MEDIUM') {
        this.difficulty = difficulty; // EASY, MEDIUM, HARD, CHAMPION
        this.decisionTimer = 0;
        this.currentAction = {};
        this.setDifficulty(difficulty);
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        switch (diff) {
            case 'EASY':
                this.reactionDelay = 18;
                this.guardChance = 0.35;
                this.weaveChance = 0.15;
                this.aggression = 0.4;
                this.comboProficiency = 0.25;
                break;
            case 'MEDIUM':
                this.reactionDelay = 10;
                this.guardChance = 0.6;
                this.weaveChance = 0.35;
                this.aggression = 0.65;
                this.comboProficiency = 0.55;
                break;
            case 'HARD':
                this.reactionDelay = 6;
                this.guardChance = 0.75;
                this.weaveChance = 0.55;
                this.aggression = 0.8;
                this.comboProficiency = 0.8;
                break;
            case 'CHAMPION':
                this.reactionDelay = 3;
                this.guardChance = 0.88;
                this.weaveChance = 0.75;
                this.aggression = 0.95;
                this.comboProficiency = 0.95;
                break;
        }
    }

    update(bot, player) {
        const input = {
            left: false,
            right: false,
            up: false,
            down: false,
            jab: false,
            cross: false,
            hook: false,
            uppercut: false,
            guard: false,
            dodge: false,
            dash: false,
            super: false
        };

        if (bot.state === 'DOWNED') {
            // Mashing to beat 10-count
            if (Math.random() < 0.6) {
                input.jab = true;
            }
            return input;
        }

        if (!bot.canAct()) {
            return input;
        }

        this.decisionTimer++;
        const dist = Math.abs(player.x - bot.x);
        const botFacing = bot.facing;
        const playerIsRight = (player.x > bot.x);

        // 1. REACTION TO PLAYER ATTACKS (Guard or Weave)
        if (player.state === 'ATTACK' || player.state === 'ATTACK_SUPER') {
            if (dist < 140 && this.decisionTimer % this.reactionDelay === 0) {
                if (Math.random() < this.weaveChance && bot.stamina > 25) {
                    input.dodge = true;
                    return input;
                } else if (Math.random() < this.guardChance) {
                    input.guard = true;
                    return input;
                }
            }
        }

        // 2. PUNISH DIZZY / GUARD BROKEN OPPONENT
        if (player.state === 'DIZZY') {
            if (bot.superMeter >= 100 && Math.random() < 0.9) {
                input.super = true;
                return input;
            }
            if (dist < 110) {
                input.uppercut = true;
                return input;
            } else {
                // Rush in!
                input[playerIsRight ? 'right' : 'left'] = true;
                input.dash = true;
                return input;
            }
        }

        // 3. SUPER ATTACK OPPORTUNITY
        if (bot.superMeter >= 100 && dist < 130 && Math.random() < 0.35) {
            input.super = true;
            return input;
        }

        // 4. SPACING & FOOTWORK
        const idealDistance = (bot.id === 'VICTORY') ? 100 : 120;

        if (dist > idealDistance + 40) {
            // Close distance
            input[playerIsRight ? 'right' : 'left'] = true;
            if (dist > 220 && Math.random() < 0.4) {
                input.dash = true;
            }
        } else if (dist < idealDistance - 30) {
            // Back up slightly or circle
            if (Math.random() < 0.3) {
                input[playerIsRight ? 'left' : 'right'] = true;
            }
        }

        // 5. OFFENSIVE COMBO STRATEGY
        if (dist <= 125 && Math.random() < this.aggression) {
            const rand = Math.random();

            if (bot.id === 'VICTORY') {
                // Victory: Slugger style (Liver hook, heavy cross, uppercut)
                if (rand < 0.35) {
                    input.jab = true;
                } else if (rand < 0.65) {
                    input.cross = true;
                } else if (rand < 0.85 && dist < 95) {
                    input.hook = true;
                } else {
                    input.uppercut = true;
                }
            } else {
                // Alex: Outboxer speed combo style (Flash jabs, gazelle punch, corkscrews)
                if (rand < 0.45) {
                    input.jab = true;
                } else if (rand < 0.70) {
                    input.cross = true;
                } else if (rand < 0.85) {
                    input.hook = true;
                } else {
                    input.uppercut = true;
                }
            }
        }

        return input;
    }
}

window.BoxingAI = BoxingAI;
