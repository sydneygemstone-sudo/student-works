/**
 * client/minimap.js — 🗺️ 迷雾小地图。
 *
 * 地图从 9×9 扩到 15×15 之后，光靠越肩视角很容易转向，所以给一张小地图。
 * 但它**不剧透**：只画走过 / 看到过的格子（服务端下发的 explored 位图），
 * 没去过的地方是一片雾。迷宫的岔路、还没找到的小动物、没识破的假房子
 * 都不会提前出现在上面 —— 要记路，还是得自己走。
 *
 * 画在 2D canvas 上，一帧的开销远小于再开一个 3D 相机。
 *
 * Author: Claude Code (Claude Opus)
 */

import { TERRAIN, DIR_VECTOR } from '/core/constants.js';

const FOG = '#2a3340';
const COLORS = {
  [TERRAIN.GRASS]: '#8fd37a',
  [TERRAIN.FOREST]: '#3f8a45',
  [TERRAIN.ROCK]: '#9aa4ab',
  [TERRAIN.NET]: '#c2a469',
  [TERRAIN.HOME]: '#ffd98a',
  [TERRAIN.DECOY]: '#8b8178',
};

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.snapshot = null;
    this.viewRole = null;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const size = Math.max(1, Math.round(rect.width));
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.pixelSize = size;
  }

  update(snapshot, viewRole) {
    this.snapshot = snapshot;
    this.viewRole = viewRole;
    this.draw();
  }

  draw() {
    const snap = this.snapshot;
    if (!snap) return;
    if (!this.pixelSize) this.resize();

    const ctx = this.ctx;
    const n = snap.size;
    const size = this.pixelSize;
    const cell = size / n;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    // 底色就是迷雾：没探索过的地方一片都不画
    ctx.fillStyle = FOG;
    ctx.fillRect(0, 0, size, size);

    const explored = snap.explored ?? '';
    const isSeen = (x, y) => explored[y * n + x] === '1';

    // —— 地形 ——
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if (!isSeen(x, y)) continue;
        ctx.fillStyle = COLORS[snap.grid[y][x]] ?? '#8fd37a';
        ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
      }
    }

    // —— 树篱：只画两侧至少有一格探索过的那些 ——
    ctx.strokeStyle = '#1f6b34';
    ctx.lineWidth = Math.max(1.5, cell * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const key of snap.walls) {
      const [xs, ys, dir] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      const v = DIR_VECTOR[dir];
      if (!v) continue;
      if (v.dx < 0 || v.dy < 0) continue; // 每道墙只画一次（东 / 南那一侧）
      if (!isSeen(x, y) && !isSeen(x + v.dx, y + v.dy)) continue;
      const x0 = (x + (v.dx > 0 ? 1 : 0)) * cell;
      const y0 = (y + (v.dy > 0 ? 1 : 0)) * cell;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + (v.dx > 0 ? 0 : cell), y0 + (v.dy > 0 ? 0 : cell));
    }
    ctx.stroke();

    const dot = (x, y, color, r = cell * 0.3, ring = null) => {
      ctx.beginPath();
      ctx.arc((x + 0.5) * cell, (y + 0.5) * cell, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (ring) {
        ctx.lineWidth = Math.max(1, cell * 0.1);
        ctx.strokeStyle = ring;
        ctx.stroke();
      }
    };

    // —— 🏡 真正的家：永远标出来，这是孩子最需要的那个锚点 ——
    ctx.fillStyle = '#ff8c3d';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1.5, cell * 0.12);
    const hx = (snap.home.x + 0.5) * cell;
    const hy = (snap.home.y + 0.5) * cell;
    ctx.beginPath();
    ctx.moveTo(hx, hy - cell * 0.42);
    ctx.lineTo(hx + cell * 0.4, hy);
    ctx.lineTo(hx + cell * 0.24, hy);
    ctx.lineTo(hx + cell * 0.24, hy + cell * 0.36);
    ctx.lineTo(hx - cell * 0.24, hy + cell * 0.36);
    ctx.lineTo(hx - cell * 0.24, hy);
    ctx.lineTo(hx - cell * 0.4, hy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // —— 🏚️ 假房子：只标已经上过当的那几座 ——
    for (const decoy of snap.decoys ?? []) {
      if (!decoy.discovered) continue;
      const cx = (decoy.x + 0.5) * cell;
      const cy = (decoy.y + 0.5) * cell;
      const r = cell * 0.3;
      ctx.strokeStyle = '#e0483c';
      ctx.lineWidth = Math.max(1.5, cell * 0.14);
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
      ctx.stroke();
    }

    // —— 🌟 还没捡的能量星（只画探索过的） ——
    for (const star of snap.energies ?? []) {
      if (star.taken || !isSeen(star.x, star.y)) continue;
      dot(star.x, star.y, '#ffd23f', cell * 0.22, '#8a6a00');
    }

    // —— 🎁 礼盒 ——
    for (const gift of snap.gifts ?? []) {
      if (gift.opened || !isSeen(gift.x, gift.y)) continue;
      ctx.fillStyle = '#ff8fb1';
      ctx.fillRect((gift.x + 0.28) * cell, (gift.y + 0.28) * cell, cell * 0.44, cell * 0.44);
    }

    // —— 🐾 已经看见过、还没救回的小动物 ——
    for (const animal of snap.animals ?? []) {
      if (animal.state !== 'wild') continue;
      if (!isSeen(animal.x, animal.y)) continue;
      dot(animal.x, animal.y, '#fff1c9', cell * 0.26, '#8a6a42');
    }

    // —— 🐺🦁 野兽：只画本人此刻真的看得见的那几头 ——
    const visible = new Set(snap.visibleBeasts?.[this.viewRole] ?? []);
    for (const beast of snap.beasts ?? []) {
      if (!visible.has(beast.id)) continue;
      dot(beast.x, beast.y, beast.kind === 'wolf' ? '#6c7580' : '#e0a63c', cell * 0.34, '#2b2118');
    }

    // —— 队友：看得见才画 ——
    const partnerRole = this.viewRole === 'bear' ? 'bunny' : 'bear';
    const partner = snap.players?.[partnerRole];
    if (partner && snap.visibility?.visible) {
      dot(partner.x, partner.y, partner.color, cell * 0.3, '#fff');
    }

    // —— 自己：一个带朝向的三角，最显眼 ——
    const me = snap.players?.[this.viewRole];
    if (me) {
      const v = DIR_VECTOR[me.facing] ?? { dx: 0, dy: -1 };
      const cx = (me.x + 0.5) * cell;
      const cy = (me.y + 0.5) * cell;
      const angle = Math.atan2(v.dy, v.dx);
      const r = cell * 0.46;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.6, r * 0.62);
      ctx.lineTo(-r * 0.25, 0);
      ctx.lineTo(-r * 0.6, -r * 0.62);
      ctx.closePath();
      ctx.fillStyle = me.color;
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, cell * 0.12);
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.restore();
    }

    // —— 外框 ——
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  }
}

export default Minimap;
