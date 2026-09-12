# Beast Kings · Antigravity Edition

Independent implementation for Nathan + Leo by **Antigravity** according to `SPEC.md`.

## Features
- **Original Cartoon Beasts**:
  - **Frost** (Player 1, Cyan/Ice Guardian): Ice spikes, crystal tail, blizzard spin, ice dragon blast, expressive cartoon eyes and claws.
  - **Ember** (Player 2, Orange/Fire Guardian): Fire mane, glowing horns, fire cyclone, inferno beam.
- **Dual Game Modes**:
  - **⚔ Duel**: 100 HP arena combat. Opponent HP -> 0 wins. Simultaneous knockout -> Draw. Clean rematch flow.
  - **👑 Crown Hunt**: 5 target spirits race. Defeating targets awards Power charges (+damage) and progress. First to 5 is crowned **Beast King**! 3-second respawn ensures targets remain huntable.
- **Full Action Palette**:
  - Left / Right movement
  - Jump / Flight (tap jump, hold to fly with energy-limited flight and ground recharge)
  - Punch (short range, fast)
  - Kick (medium range, knockback)
  - Spin (360° circular cyclone hit on both sides with cooldown)
  - Blink (forward teleport through space with cooldown)
  - Super (screen-wide elemental beam)
- **Audio & Visual Polish**:
  - Zero-asset procedural Web Audio synthesizer (thumps, whooshes, blinks, blasts, KO fanfare).
  - Procedural Canvas graphics with screen shake, particle sparks, shadows, ground grids, and torches.
- **iPad Multitouch & Teacher Controls**:
  - Large touch targets, touch-action: none, simultaneous multi-finger combat.
  - Keyboard fallbacks (A/D/Space, J/I/K/L/U).
  - Teacher pause/resume and rematch controls.
  - Disconnect graceful pause and instant rejoin recovery.

## Quick Launch
Run with pure Node.js (zero external npm dependencies required):
```bash
node server.js
```
Default port is `8766` (or set `PORT=...`).
