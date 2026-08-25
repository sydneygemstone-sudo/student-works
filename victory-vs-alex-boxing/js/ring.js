/**
 * Victory vs Alex - Boxing Ring & Arena Environment
 */

class BoxingRing {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.floorY = 560;
        this.leftBound = 160;
        this.rightBound = canvasWidth - 160;

        // Ropes physics state
        this.ropeTension = 0.2;
        this.ropeDamp = 0.88;
        this.ropes = [
            { y: 350, offsetL: 0, vL: 0, offsetR: 0, vR: 0 },
            { y: 410, offsetL: 0, vL: 0, offsetR: 0, vR: 0 },
            { y: 470, offsetL: 0, vL: 0, offsetR: 0, vR: 0 }
        ];

        // Camera flashes in crowd
        this.cameraFlashes = [];
        this.flashTimer = 0;

        // Spotlights
        this.spotlightAngle = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.floorY = h - 140;
        this.leftBound = 160;
        this.rightBound = w - 160;
        this.ropes = [
            { y: this.floorY - 180, offsetL: 0, vL: 0, offsetR: 0, vR: 0 },
            { y: this.floorY - 120, offsetL: 0, vL: 0, offsetR: 0, vR: 0 },
            { y: this.floorY - 60, offsetL: 0, vL: 0, offsetR: 0, vR: 0 }
        ];
    }

    // Trigger rope vibration when fighter hits boundary
    hitRope(side = 'left', strength = 15) {
        this.ropes.forEach(r => {
            if (side === 'left') {
                r.vL += -strength;
            } else {
                r.vR += strength;
            }
        });
    }

    update() {
        // Update rope physics
        this.ropes.forEach(r => {
            r.vL += -r.offsetL * this.ropeTension;
            r.vL *= this.ropeDamp;
            r.offsetL += r.vL;

            r.vR += -r.offsetR * this.ropeTension;
            r.vR *= this.ropeDamp;
            r.offsetR += r.vR;
        });

        // Spotlights sway
        this.spotlightAngle += 0.015;

        // Camera flashes
        this.flashTimer++;
        if (this.flashTimer % 18 === 0 && Math.random() > 0.3) {
            this.cameraFlashes.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.floorY - 200) + 40,
                radius: Math.random() * 25 + 15,
                life: 1.0,
                decay: 0.15
            });
        }

        for (let i = this.cameraFlashes.length - 1; i >= 0; i--) {
            const cf = this.cameraFlashes[i];
            cf.life -= cf.decay;
            if (cf.life <= 0) {
                this.cameraFlashes.splice(i, 1);
            }
        }
    }

    drawBackground(ctx) {
        // Deep Arena Atmosphere gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(0.5, '#121b2b');
        bgGrad.addColorStop(1, '#06090f');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Crowd Silhouette Rows
        ctx.save();
        const crowdY = this.floorY - 140;
        ctx.fillStyle = '#080d17';
        for (let row = 0; row < 3; row++) {
            const rowY = crowdY - row * 35;
            const size = 18 + row * 4;
            ctx.fillStyle = `rgba(10, 16, 28, ${0.4 + row * 0.25})`;
            for (let x = -20; x < this.width + 40; x += size * 1.3) {
                const bob = Math.sin(x * 0.1 + this.spotlightAngle * 2 + row) * 3;
                ctx.beginPath();
                ctx.arc(x, rowY + bob, size * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillRect(x - size * 0.5, rowY + size * 0.4 + bob, size, size * 1.2);
            }
        }

        // Camera Flashes in the crowd
        for (const cf of this.cameraFlashes) {
            ctx.save();
            ctx.globalAlpha = cf.life;
            const flashGrad = ctx.createRadialGradient(cf.x, cf.y, 0, cf.x, cf.y, cf.radius);
            flashGrad.addColorStop(0, '#ffffff');
            flashGrad.addColorStop(0.3, 'rgba(200, 240, 255, 0.8)');
            flashGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = flashGrad;
            ctx.beginPath();
            ctx.arc(cf.x, cf.y, cf.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Arena Overhead Spotlights (Sweeping Volumetric Beams)
        const numSpots = 4;
        for (let i = 0; i < numSpots; i++) {
            ctx.save();
            const startX = (this.width / (numSpots + 1)) * (i + 1);
            const targetX = this.width * 0.5 + Math.sin(this.spotlightAngle + i * 1.5) * (this.width * 0.4);
            
            const spotGrad = ctx.createLinearGradient(startX, 0, targetX, this.floorY);
            const col = (i % 2 === 0) ? 'rgba(245, 158, 11, 0.08)' : 'rgba(56, 189, 248, 0.08)';
            spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
            spotGrad.addColorStop(0.3, col);
            spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = spotGrad;
            ctx.beginPath();
            ctx.moveTo(startX - 15, 0);
            ctx.lineTo(startX + 15, 0);
            ctx.lineTo(targetX + 160, this.floorY + 80);
            ctx.lineTo(targetX - 160, this.floorY + 80);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();

        // 3D Ring Canvas Floor (Mat)
        this.drawRingMat(ctx);
    }

    drawRingMat(ctx) {
        ctx.save();

        const canvasTopY = this.floorY - 40;
        const canvasBottomY = this.height - 20;

        // Ring Base Plinth / Apron
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(80, this.floorY, this.width - 160, this.height - this.floorY);

        // Ring Apron Edge Highlight
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(80, this.floorY, this.width - 160, 6);

        // Ring Mat Perspective Polygon
        ctx.beginPath();
        ctx.moveTo(this.leftBound - 40, canvasTopY);
        ctx.lineTo(this.rightBound + 40, canvasTopY);
        ctx.lineTo(this.rightBound + 70, this.floorY);
        ctx.lineTo(this.leftBound - 70, this.floorY);
        ctx.closePath();

        const matGrad = ctx.createLinearGradient(0, canvasTopY, 0, this.floorY);
        matGrad.addColorStop(0, '#1c2738');
        matGrad.addColorStop(0.5, '#24334a');
        matGrad.addColorStop(1, '#1e2b3e');
        ctx.fillStyle = matGrad;
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Center Ring Logo Decal
        const centerX = this.width * 0.5;
        const centerY = (canvasTopY + this.floorY) * 0.5;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(1, 0.45); // Perspective compression

        // Outer Ring Circle
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 160, 0, Math.PI * 2);
        ctx.stroke();

        // Inner Ring Circle
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 120, 0, Math.PI * 2);
        ctx.stroke();

        // Text "WORLD BOXING CHAMPIONSHIP"
        ctx.font = "900 24px 'Impact', sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.textAlign = "center";
        ctx.fillText("VICTORY  VS  ALEX", 0, 8);

        ctx.restore();

        // Red Corner Pad (Left) & Blue Corner Pad (Right)
        this.drawCornerPost(ctx, this.leftBound - 60, canvasTopY - 140, this.floorY, '#dc2626', 'RED CORNER');
        this.drawCornerPost(ctx, this.rightBound + 60, canvasTopY - 140, this.floorY, '#2563eb', 'BLUE CORNER');

        // Back Ring Ropes
        this.drawRopes(ctx, true);

        ctx.restore();
    }

    drawCornerPost(ctx, x, topY, botY, color, label) {
        ctx.save();
        // Post pipe
        ctx.fillStyle = '#475569';
        ctx.fillRect(x - 8, topY, 16, botY - topY);

        // Turnbuckle Pad
        const padHeight = botY - topY - 20;
        const padGrad = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
        padGrad.addColorStop(0, color);
        padGrad.addColorStop(0.5, '#ffffff');
        padGrad.addColorStop(1, color);

        ctx.fillStyle = padGrad;
        ctx.beginPath();
        ctx.roundRect(x - 16, topY + 10, 32, padHeight, 8);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Turnbuckle straps
        ctx.fillStyle = '#0f172a';
        for (let y = topY + 40; y < botY - 20; y += 45) {
            ctx.fillRect(x - 17, y, 34, 6);
        }

        ctx.restore();
    }

    drawRopes(ctx, isBack = false) {
        ctx.save();
        this.ropes.forEach((r, idx) => {
            const y = r.y;
            const leftX = this.leftBound - 40 + r.offsetL;
            const rightX = this.rightBound + 40 + r.offsetR;
            const midX = (leftX + rightX) * 0.5;
            const sag = 4 + Math.sin(this.spotlightAngle + idx) * 1.5;

            // Rope gradient
            const ropeGrad = ctx.createLinearGradient(0, y - 4, 0, y + 4);
            const colorMain = (idx === 0) ? '#e11d48' : (idx === 1 ? '#f8fafc' : '#2563eb');
            ropeGrad.addColorStop(0, '#ffffff');
            ropeGrad.addColorStop(0.4, colorMain);
            ropeGrad.addColorStop(1, '#0f172a');

            ctx.beginPath();
            ctx.moveTo(leftX, y);
            ctx.quadraticCurveTo(midX, y + sag, rightX, y);
            ctx.strokeStyle = ropeGrad;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Rope Sheen
            ctx.beginPath();
            ctx.moveTo(leftX, y - 2);
            ctx.quadraticCurveTo(midX, y + sag - 2, rightX, y - 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        ctx.restore();
    }

    drawForeground(ctx) {
        // Front apron ropes & post highlights
        ctx.save();
        // Front Ropes
        this.drawRopes(ctx, false);
        ctx.restore();
    }
}

window.BoxingRing = BoxingRing;
