/**
 * Victory vs Alex - Main Game Engine & Match Flow Manager
 */

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Dimensions
        this.canvas.width = 1100;
        this.canvas.height = 640;

        // Subsystems
        this.ring = new BoxingRing(this.canvas.width, this.canvas.height);
        this.ai = new BoxingAI('MEDIUM');

        // Match Configuration
        this.mode = 'ARCADE'; // ARCADE (P vs AI), VERSUS (P1 vs P2), TRAINING
        this.selectedFighterP1 = 'VICTORY';
        this.selectedFighterP2 = 'ALEX';
        this.difficulty = 'MEDIUM';

        // Fighters
        this.p1 = null;
        this.p2 = null;

        // Match State
        this.gameState = 'MENU'; // MENU, CHAR_SELECT, FIGHT_INTRO, FIGHTING, KNOCKDOWN_COUNT, ROUND_OVER, MATCH_OVER, PAUSED
        this.round = 1;
        this.maxRounds = 3;
        this.roundTime = 90;
        this.roundTimer = 90 * 60; // 60 FPS
        this.refereeCount = 0;
        this.refereeTimer = 0;
        this.knockedDownFighter = null;

        // Intro / Banner Overlay
        this.introTimer = 0;
        this.introBannerText = '';
        this.introBannerSubtext = '';

        // KO Slow-mo Replay
        this.slowMoFactor = 1.0;
        this.koTimer = 0;
        this.screenShake = 0;

        // Input Tracking
        this.keys = {};
        this.touchControls = {};

        // Match Statistics
        this.stats = {
            p1: { punchesThrown: 0, punchesLanded: 0, counters: 0, damageDealt: 0, knockdowns: 0 },
            p2: { punchesThrown: 0, punchesLanded: 0, counters: 0, damageDealt: 0, knockdowns: 0 }
        };

        this.initInputListeners();
        this.initUI();
    }

    initInputListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Global Key handlers
            if (e.code === 'KeyP' || e.code === 'Escape') {
                this.togglePause();
            }
            if (e.code === 'KeyM') {
                window.soundEngine.toggleMute();
                this.updateMuteUI();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Virtual Touch Controls support
        const bindTouchBtn = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchControls[key] = true; });
            el.addEventListener('touchend', (e) => { e.preventDefault(); this.touchControls[key] = false; });
            el.addEventListener('mousedown', (e) => { e.preventDefault(); this.touchControls[key] = true; });
            el.addEventListener('mouseup', (e) => { e.preventDefault(); this.touchControls[key] = false; });
        };

        bindTouchBtn('btnTouchJab', 'jab');
        bindTouchBtn('btnTouchCross', 'cross');
        bindTouchBtn('btnTouchHook', 'hook');
        bindTouchBtn('btnTouchUppercut', 'uppercut');
        bindTouchBtn('btnTouchGuard', 'guard');
        bindTouchBtn('btnTouchWeave', 'dodge');
        bindTouchBtn('btnTouchSuper', 'super');
        bindTouchBtn('btnTouchLeft', 'left');
        bindTouchBtn('btnTouchRight', 'right');
        bindTouchBtn('btnTouchDash', 'dash');
    }

    initUI() {
        // Character Select Screen buttons
        document.querySelectorAll('.char-card').forEach(card => {
            card.addEventListener('click', () => {
                const charId = card.dataset.char;
                const playerSelect = card.dataset.player;
                if (playerSelect === '1') {
                    this.selectedFighterP1 = charId;
                    document.querySelectorAll('.char-card[data-player="1"]').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                } else {
                    this.selectedFighterP2 = charId;
                    document.querySelectorAll('.char-card[data-player="2"]').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                }
                this.updateFighterPreviews();
            });
        });

        // Start Match Button
        const btnStart = document.getElementById('btnStartMatch');
        if (btnStart) {
            btnStart.addEventListener('click', () => {
                window.soundEngine.ensureContext();
                this.startMatch();
            });
        }

        // Help Toggle Button
        const btnHelp = document.getElementById('btnHelpToggle');
        if (btnHelp) {
            btnHelp.addEventListener('click', () => {
                const guide = document.querySelector('.guide-container');
                if (guide) {
                    guide.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        // Mode select buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
            });
        });

        // Difficulty select
        const diffSelect = document.getElementById('difficultySelect');
        if (diffSelect) {
            diffSelect.addEventListener('change', (e) => {
                this.difficulty = e.target.value;
                this.ai.setDifficulty(this.difficulty);
            });
        }

        // Rematch Button
        const btnRematch = document.getElementById('btnRematch');
        if (btnRematch) {
            btnRematch.addEventListener('click', () => {
                this.startMatch();
            });
        }

        // Menu Return Button
        const btnMenu = document.getElementById('btnReturnMenu');
        if (btnMenu) {
            btnMenu.addEventListener('click', () => {
                this.returnToMenu();
            });
        }

        // Mute Button
        const btnMute = document.getElementById('btnMute');
        if (btnMute) {
            btnMute.addEventListener('click', () => {
                window.soundEngine.toggleMute();
                this.updateMuteUI();
            });
        }
    }

    updateMuteUI() {
        const btnMute = document.getElementById('btnMute');
        if (btnMute) {
            btnMute.innerText = window.soundEngine.isMuted ? '🔇 UNMUTE' : '🔊 MUTE';
        }
    }

    updateFighterPreviews() {
        const p1Data = FIGHTERS[this.selectedFighterP1];
        const p2Data = FIGHTERS[this.selectedFighterP2];

        document.getElementById('p1PreviewName').innerText = p1Data.name;
        document.getElementById('p1PreviewNickname').innerText = p1Data.nickname;
        document.getElementById('p1PreviewStats').innerText = `${p1Data.weight} | Reach: ${p1Data.reach}`;
        document.getElementById('p1PreviewSuper').innerText = `SUPER: ${p1Data.palette.superName}`;

        document.getElementById('p2PreviewName').innerText = p2Data.name;
        document.getElementById('p2PreviewNickname').innerText = p2Data.nickname;
        document.getElementById('p2PreviewStats').innerText = `${p2Data.weight} | Reach: ${p2Data.reach}`;
        document.getElementById('p2PreviewSuper').innerText = `SUPER: ${p2Data.palette.superName}`;
    }

    startMatch() {
        document.getElementById('screenMenu').style.display = 'none';
        document.getElementById('screenGameOver').style.display = 'none';
        document.getElementById('hudContainer').style.display = 'flex';

        // Instantiate Fighters
        const p1Data = FIGHTERS[this.selectedFighterP1];
        const p2Data = (this.mode === 'ARCADE') ? (this.selectedFighterP1 === 'VICTORY' ? FIGHTERS.ALEX : FIGHTERS.VICTORY) : FIGHTERS[this.selectedFighterP2];

        this.p1 = new Fighter(p1Data, 360, this.ring.floorY, 1, true, 1);
        this.p2 = new Fighter(p2Data, 740, this.ring.floorY, -1, (this.mode === 'VERSUS'), 2);

        this.p1.setOpponent(this.p2);
        this.p2.setOpponent(this.p1);

        this.round = 1;
        this.stats = {
            p1: { punchesThrown: 0, punchesLanded: 0, counters: 0, damageDealt: 0, knockdowns: 0 },
            p2: { punchesThrown: 0, punchesLanded: 0, counters: 0, damageDealt: 0, knockdowns: 0 }
        };

        window.particleSystem.reset();
        this.startRound(1);
    }

    startRound(roundNum) {
        this.round = roundNum;
        this.roundTimer = this.roundTime * 60;
        this.gameState = 'FIGHT_INTRO';
        this.introTimer = 140;
        this.introBannerText = `ROUND ${this.round}`;
        this.introBannerSubtext = 'FIGHT!';

        this.p1.resetForRound(360, 1);
        this.p2.resetForRound(740, -1);

        window.soundEngine.playBell();
        window.soundEngine.announce(`Round ${this.round}! Fight!`);
        window.soundEngine.startFightMusic();
    }

    togglePause() {
        if (this.gameState === 'FIGHTING') {
            this.gameState = 'PAUSED';
            document.getElementById('screenPause').style.display = 'flex';
        } else if (this.gameState === 'PAUSED') {
            this.gameState = 'FIGHTING';
            document.getElementById('screenPause').style.display = 'none';
        }
    }

    returnToMenu() {
        this.gameState = 'MENU';
        window.soundEngine.stopFightMusic();
        document.getElementById('screenGameOver').style.display = 'none';
        document.getElementById('screenPause').style.display = 'none';
        document.getElementById('hudContainer').style.display = 'none';
        document.getElementById('screenMenu').style.display = 'flex';
    }

    // Input Reading for both Players & Gamepad
    getP1Input() {
        const k = this.keys;
        const t = this.touchControls;

        // Check connected gamepads (Gamepad 0)
        const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
        let gpJab = false, gpCross = false, gpHook = false, gpUppercut = false, gpGuard = false, gpWeave = false, gpSuper = false, gpLeft = false, gpRight = false, gpDash = false;
        
        if (gp) {
            const axes = gp.axes;
            const buttons = gp.buttons;
            gpLeft = (axes[0] < -0.3 || (buttons[14] && buttons[14].pressed));
            gpRight = (axes[0] > 0.3 || (buttons[15] && buttons[15].pressed));
            gpJab = buttons[2] && buttons[2].pressed;      // X / Square
            gpCross = buttons[3] && buttons[3].pressed;    // Y / Triangle
            gpHook = buttons[0] && buttons[0].pressed;     // A / Cross
            gpUppercut = buttons[1] && buttons[1].pressed; // B / Circle
            gpGuard = buttons[4] && buttons[4].pressed;    // LB / L1
            gpWeave = buttons[5] && buttons[5].pressed;    // RB / R1
            gpSuper = buttons[7] && buttons[7].pressed;    // RT / R2
            gpDash = buttons[6] && buttons[6].pressed;     // LT / L2
        }

        return {
            left: k['KeyA'] || t.left || gpLeft || false,
            right: k['KeyD'] || t.right || gpRight || false,
            up: k['KeyW'] || false,
            down: k['KeyS'] || false,
            dash: k['ShiftLeft'] || t.dash || gpDash || false,
            jab: k['KeyJ'] || t.jab || gpJab || false,
            cross: k['KeyK'] || t.cross || gpCross || false,
            hook: k['KeyU'] || t.hook || gpHook || false,
            uppercut: k['KeyI'] || t.uppercut || gpUppercut || false,
            guard: k['KeyL'] || t.guard || gpGuard || false,
            dodge: k['Space'] || t.dodge || gpWeave || false,
            super: k['KeyO'] || t.super || gpSuper || false
        };
    }

    getP2Input() {
        const k = this.keys;
        // 2-Player Local Controls (Arrows + Numpad or Laptop keys)
        return {
            left: k['ArrowLeft'] || false,
            right: k['ArrowRight'] || false,
            up: k['ArrowUp'] || false,
            down: k['ArrowDown'] || false,
            dash: k['Enter'] || k['Numpad0'] || false,
            jab: k['Numpad4'] || k['Digit7'] || false,
            cross: k['Numpad5'] || k['Digit8'] || false,
            hook: k['Numpad7'] || k['Digit9'] || false,
            uppercut: k['Numpad8'] || k['Digit0'] || false,
            guard: k['Numpad6'] || k['BracketLeft'] || false,
            dodge: k['Numpad1'] || k['BracketRight'] || false,
            super: k['Numpad9'] || k['Backslash'] || false
        };
    }

    // MAIN GAME LOOP
    update() {
        if (this.gameState === 'MENU' || this.gameState === 'PAUSED') return;

        // Screen Shake decay
        if (this.screenShake > 0) {
            this.screenShake *= 0.85;
            if (this.screenShake < 0.2) this.screenShake = 0;
        }

        this.ring.update();
        window.particleSystem.update();

        // 1. FIGHT INTRO STATE
        if (this.gameState === 'FIGHT_INTRO') {
            this.introTimer--;
            if (this.introTimer === 60) {
                this.introBannerText = 'BOX!';
                this.introBannerSubtext = '';
                window.soundEngine.playBell();
            }
            if (this.introTimer <= 0) {
                this.gameState = 'FIGHTING';
            }
            return;
        }

        // 2. FIGHTING ACTIVE STATE
        if (this.gameState === 'FIGHTING') {
            // Update Round Timer
            this.roundTimer--;
            if (this.roundTimer <= 0) {
                this.endRoundByDecision();
                return;
            }

            // Input reading
            const p1Input = this.getP1Input();
            this.p1.handleInput(p1Input);

            let p2Input;
            if (this.mode === 'VERSUS') {
                p2Input = this.getP2Input();
            } else {
                p2Input = this.ai.update(this.p2, this.p1);
            }
            this.p2.handleInput(p2Input);

            // Update physics & combat
            this.p1.update(this.ring);
            this.p2.update(this.ring);

            // Check for Knockdowns
            if (this.p1.state === 'DOWNED' || this.p1.state === 'KNOCKDOWN_FALL') {
                this.startKnockdownCount(this.p1, this.p2);
            } else if (this.p2.state === 'DOWNED' || this.p2.state === 'KNOCKDOWN_FALL') {
                this.startKnockdownCount(this.p2, this.p1);
            }

            this.updateHUD();
        }

        // 3. REFEREE 10-COUNT STATE
        if (this.gameState === 'KNOCKDOWN_COUNT') {
            this.p1.update(this.ring);
            this.p2.update(this.ring);

            // Player mash input handling
            if (this.knockedDownFighter === this.p1) {
                this.p1.handleInput(this.getP1Input());
            } else if (this.knockedDownFighter === this.p2 && this.mode === 'VERSUS') {
                this.p2.handleInput(this.getP2Input());
            }

            this.refereeTimer++;
            if (this.refereeTimer % 60 === 0) { // Every 1 second
                this.refereeCount++;
                window.soundEngine.playJabHit();
                window.soundEngine.announce(`${this.refereeCount}!`);
                window.particleSystem.createFloatingText(this.canvas.width * 0.5, 180, `${this.refereeCount}!`, '#ef4444', 48);

                if (this.refereeCount >= 10) {
                    // Decisive Knockout!
                    this.endMatchByKO(this.knockedDownFighter === this.p1 ? this.p2 : this.p1);
                    return;
                }
            }

            // Check if fighter beat the count and got up
            if (this.knockedDownFighter.state === 'GETUP' || this.knockedDownFighter.state === 'IDLE') {
                window.soundEngine.announce('FIGHT ON!');
                window.particleSystem.createFloatingText(this.canvas.width * 0.5, 180, 'FIGHT ON!', '#10b981', 40);
                this.gameState = 'FIGHTING';
            }

            this.updateHUD();
        }
    }

    startKnockdownCount(downedFighter, standingFighter) {
        this.gameState = 'KNOCKDOWN_COUNT';
        this.knockedDownFighter = downedFighter;
        this.refereeCount = 0;
        this.refereeTimer = 0;
        this.screenShake = 12;

        // 3 Knockdown TKO rule
        if (downedFighter.knockdowns >= downedFighter.maxKnockdowns) {
            this.endMatchByKO(standingFighter, true);
        }
    }

    endRoundByDecision() {
        if (this.round < this.maxRounds) {
            this.startRound(this.round + 1);
        } else {
            // Match over: calculate points/health
            const winner = (this.p1.health >= this.p2.health) ? this.p1 : this.p2;
            this.endMatchByDecision(winner);
        }
    }

    endMatchByKO(winner, isTKO = false) {
        this.gameState = 'MATCH_OVER';
        winner.state = 'WIN';
        const loser = (winner === this.p1) ? this.p2 : this.p1;
        loser.state = 'LOSE';

        window.soundEngine.playBell();
        window.soundEngine.playCrowdRoar(1.5);
        window.soundEngine.announce(isTKO ? 'TECHNICAL KNOCKOUT! WINNER BY TKO!' : 'KNOCKOUT! WINNER BY KNOCKOUT!');

        this.showGameOverModal(winner, isTKO ? 'TKO' : 'KO');
    }

    endMatchByDecision(winner) {
        this.gameState = 'MATCH_OVER';
        winner.state = 'WIN';
        const loser = (winner === this.p1) ? this.p2 : this.p1;
        loser.state = 'LOSE';

        window.soundEngine.playBell();
        window.soundEngine.announce('MATCH DECISION! WINNER BY UNANIMOUS DECISION!');
        this.showGameOverModal(winner, 'DECISION');
    }

    showGameOverModal(winner, victoryType) {
        setTimeout(() => {
            const modal = document.getElementById('screenGameOver');
            document.getElementById('winnerName').innerText = `${winner.name} WINS!`;
            document.getElementById('victoryType').innerText = `VICTORY BY ${victoryType}`;
            document.getElementById('winnerNickname').innerText = `"${winner.nickname}"`;

            // Stats
            document.getElementById('statP1Damage').innerText = Math.round(this.p1.data.maxHealth - this.p1.health);
            document.getElementById('statP2Damage').innerText = Math.round(this.p2.data.maxHealth - this.p2.health);
            document.getElementById('statP1KD').innerText = this.p1.knockdowns;
            document.getElementById('statP2KD').innerText = this.p2.knockdowns;

            modal.style.display = 'flex';
        }, 1200);
    }

    updateHUD() {
        if (!this.p1 || !this.p2) return;

        // Health Bars
        const p1HpPercent = Math.max(0, (this.p1.health / this.p1.maxHealth) * 100);
        const p2HpPercent = Math.max(0, (this.p2.health / this.p2.maxHealth) * 100);
        document.getElementById('p1HealthFill').style.width = `${p1HpPercent}%`;
        document.getElementById('p2HealthFill').style.width = `${p2HpPercent}%`;

        // Stamina Bars
        const p1StamPercent = Math.max(0, (this.p1.stamina / this.p1.maxStamina) * 100);
        const p2StamPercent = Math.max(0, (this.p2.stamina / this.p2.maxStamina) * 100);
        document.getElementById('p1StaminaFill').style.width = `${p1StamPercent}%`;
        document.getElementById('p2StaminaFill').style.width = `${p2StamPercent}%`;

        // Super Bars
        document.getElementById('p1SuperFill').style.width = `${this.p1.superMeter}%`;
        document.getElementById('p2SuperFill').style.width = `${this.p2.superMeter}%`;
        
        const p1SuperBtn = document.getElementById('btnTouchSuper');
        if (p1SuperBtn) {
            p1SuperBtn.classList.toggle('ready', this.p1.superMeter >= 100);
        }

        // Names & Round Timer
        document.getElementById('p1HudName').innerText = this.p1.name;
        document.getElementById('p2HudName').innerText = this.p2.name;

        const secondsRemaining = Math.max(0, Math.ceil(this.roundTimer / 60));
        document.getElementById('roundClock').innerText = secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining;
        document.getElementById('roundNumberBadge').innerText = `R${this.round}`;

        // Combo Counter display
        const comboBadge = document.getElementById('comboBadge');
        if (this.p1.comboHits > 1) {
            comboBadge.style.display = 'block';
            comboBadge.innerText = `P1 COMBO x${this.p1.comboHits} (${this.p1.comboDamage} DMG)`;
        } else if (this.p2.comboHits > 1) {
            comboBadge.style.display = 'block';
            comboBadge.innerText = `P2 COMBO x${this.p2.comboHits} (${this.p2.comboDamage} DMG)`;
        } else {
            comboBadge.style.display = 'none';
        }

        // Mash recovery prompt when downed
        const mashPrompt = document.getElementById('mashPrompt');
        if (this.p1.state === 'DOWNED') {
            mashPrompt.style.display = 'block';
            const mashPercent = Math.min(100, Math.round((this.p1.recoveryMash / this.p1.targetMash) * 100));
            document.getElementById('mashBarFill').style.width = `${mashPercent}%`;
        } else {
            mashPrompt.style.display = 'none';
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Screen Shake
        ctx.save();
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(shakeX, shakeY);
        }

        // 1. Draw Ring Background & Crowd
        this.ring.drawBackground(ctx);

        // 2. Draw Fighters (if match active)
        if (this.p1 && this.p2) {
            this.p1.draw(ctx);
            this.p2.draw(ctx);
        }

        // 3. Draw Particles, Sparks, Floating combat text
        window.particleSystem.draw(ctx);

        // 4. Draw Ring Foreground Ropes
        this.ring.drawForeground(ctx);

        // 5. Draw Fight Intro Banners & Announcements
        if (this.gameState === 'FIGHT_INTRO') {
            this.drawIntroBanner(ctx);
        }

        ctx.restore();
    }

    drawIntroBanner(ctx) {
        ctx.save();
        const midX = this.canvas.width * 0.5;
        const midY = this.canvas.height * 0.42;

        // Banner backdrop
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, midY - 60, this.canvas.width, 120);

        // Gold border lines
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(0, midY - 60, this.canvas.width, 4);
        ctx.fillRect(0, midY + 56, this.canvas.width, 4);

        // Text
        ctx.font = "900 46px 'Impact', sans-serif";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.fillText(this.introBannerText, midX, midY + 12);

        if (this.introBannerSubtext) {
            ctx.font = "900 24px 'Impact', sans-serif";
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(this.introBannerSubtext, midX, midY + 45);
        }
        ctx.restore();
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new GameEngine();

    const loop = () => {
        window.gameEngine.update();
        window.gameEngine.render();
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
});
