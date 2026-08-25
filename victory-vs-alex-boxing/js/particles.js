/**
 * Victory vs Alex - Particle & Visual Effects Engine
 */

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.speedLines = [];
    }

    reset() {
        this.particles = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.speedLines = [];
    }

    // Impact Sweat / Blood / Spark burst
    createHitSparks(x, y, count = 15, color = '#ffd700', isHeavy = false) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 7 + 3) * (isHeavy ? 1.6 : 1.0);
            this.particles.push({
                type: 'spark',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (Math.random() * 2),
                gravity: 0.25,
                color: color,
                size: Math.random() * 4 + (isHeavy ? 3 : 2),
                life: 1.0,
                decay: Math.random() * 0.04 + 0.03
            });
        }
    }

    // Sweat spray on heavy impacts
    createSweatSpray(x, y, direction = 1, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (direction > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.2;
            const speed = Math.random() * 9 + 4;
            this.particles.push({
                type: 'sweat',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - Math.random() * 4,
                gravity: 0.35,
                color: 'rgba(230, 245, 255, 0.85)',
                size: Math.random() * 3.5 + 1.5,
                life: 1.0,
                decay: Math.random() * 0.03 + 0.02
            });
        }
    }

    // Guard Block Sparks (Metallic blue / white)
    createGuardSparks(x, y, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                type: 'spark',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.15,
                color: Math.random() > 0.5 ? '#60a5fa' : '#ffffff',
                size: Math.random() * 3 + 2,
                life: 1.0,
                decay: Math.random() * 0.05 + 0.04
            });
        }
    }

    // Expanding Hit Shockwave
    createShockwave(x, y, maxRadius = 80, color = '#ffeedd') {
        this.shockwaves.push({
            x: x,
            y: y,
            radius: 5,
            maxRadius: maxRadius,
            color: color,
            life: 1.0,
            growth: (maxRadius - 5) / 12
        });
    }

    // Floating combat text (e.g. "COUNTER!", "CLEAN HIT!", "CRITICAL!", "SUPER!")
    createFloatingText(x, y, text, color = '#f59e0b', size = 26) {
        this.floatingTexts.push({
            x: x,
            y: y,
            text: text,
            color: color,
            size: size,
            vy: -2.2,
            life: 1.0,
            decay: 0.02
        });
    }

    // Super / Heavy Aura Particles around fighter
    createAura(x, y, color = '#f59e0b', count = 3) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                type: 'aura',
                x: x + (Math.random() - 0.5) * 60,
                y: y + (Math.random() - 0.5) * 80,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -Math.random() * 4 - 1.5,
                gravity: -0.05,
                color: color,
                size: Math.random() * 6 + 3,
                life: 1.0,
                decay: Math.random() * 0.04 + 0.03
            });
        }
    }

    // Canvas Dust when stepping or falling
    createCanvasDust(x, y, direction = 0, count = 8) {
        for (let i = 0; i < count; i++) {
            const vx = (direction === 0 ? (Math.random() - 0.5) * 4 : direction * (Math.random() * 3 + 1));
            this.particles.push({
                type: 'dust',
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                vx: vx,
                vy: -Math.random() * 2 - 0.5,
                gravity: 0.05,
                color: 'rgba(210, 200, 190, 0.4)',
                size: Math.random() * 6 + 3,
                life: 1.0,
                decay: Math.random() * 0.03 + 0.025
            });
        }
    }

    update() {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.growth;
            sw.life -= 0.08;
            if (sw.life <= 0 || sw.radius >= sw.maxRadius) {
                this.shockwaves.splice(i, 1);
            }
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.life -= ft.decay;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // Draw Shockwaves
        for (const sw of this.shockwaves) {
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = sw.color;
            ctx.globalAlpha = Math.max(0, sw.life * 0.8);
            ctx.lineWidth = Math.max(1, sw.life * 6);
            ctx.stroke();
        }

        // Draw Particles
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            if (p.type === 'spark') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'sweat') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size * 1.5, p.size * 0.8, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'aura') {
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'dust') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (1.5 - p.life * 0.5), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Draw Floating Combat Texts
        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.font = `900 ${ft.size}px 'Impact', 'Segoe UI Black', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = Math.max(0, ft.life);
            
            // Text Outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 5;
            ctx.strokeText(ft.text, ft.x, ft.y);

            // Text Fill
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }

        ctx.restore();
    }
}

window.particleSystem = new ParticleSystem();
