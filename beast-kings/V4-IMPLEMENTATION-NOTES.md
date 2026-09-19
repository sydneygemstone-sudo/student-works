# Beast Kings V4 Implementation Notes — 2026-09-19

Worktree: `/Users/gemstone/Desktop/student-works-beast-kings-v4-20260919` · branch `beast-kings-v4-20260919`
Target: `beast-kings/builds/astra-legends/` · baseline includes the LAN-HTTP crypto.randomUUID fix (kept, uncommitted until V4 commit).

## Pre-implementation review status (AGENTS.md gate)

- worker-preflight gate: `route_gate.py --plan --executor claude --intent claude` → 放行 (claude / anthropic / fable, small_sample).
- Actual Claude review call: **FAILED — 429 "You've hit your weekly limit · resets 2am (Australia/Sydney)"** (receipt JSON: `api_error_status:429`, `terminal_reason:"api_error"`).
- Per Dean's rule this is reported, NOT faked and NOT substituted with Astra/native subagents. Execution proceeded under the user's direct instruction; this file + the acceptance checklist below is the audit trail so a Claude review can be run when the route resets.
- Executioner/routing: implementation done inline by the controlling Astra session in this single worktree (no spawn_agent, no external workers, no extra AI spend). All verification is deterministic (`node --test`, static checks). Physical-iPad acceptance remains outstanding by definition.

## Scope decisions (from UPGRADE-BRIEF-20260919.md)

P0 iPad control
- `index.html` viewport: `maximum-scale=1,user-scalable=no` + `viewport-fit=cover` (double-tap zoom); `gesturestart`/`dblclick` preventDefault scoped to `#game`; `touch-action:none` on the gameplay surface only (accessibility outside gameplay untouched); safe-area padding on toolbar/controls; bigger touch targets; up/down depth buttons added; existing multi-touch pointer capture + pointerup/pointercancel/lostpointercapture release retained.

P1+P2 bigger arena + fake-3D
- World: WIDTH 1200→1920 (view/canvas stays 1200×600), depth axis `z` 0..240; `ground(z)=408+z*0.6` so old GROUND 480 == ground(120) (keeps legacy tests valid); spawn z=120 for duel/practice/quest players.
- Diagonal movement normalized; z speed = 60% of run speed; render scale 0.86..1.14 by z; depth-sorted drawing; ground shadows follow z.
- Hit model: planar depth gate `|dz|<=depth tolerance` + height-above-own-ground comparison (replaces raw y-diff), so pure depth separation can't be hit by melee. Zones/projectiles/chain/AI all depth-aware. Zones render as ground ellipses (2D footprint).
- Camera: smooth horizontal follow of alive players, clamped to world, no zoom/shake.

P3 co-op boss
- New mode `boss` (online, 1–3 humans allowed by engine; classroom target 2–3): flagship "Crown Golem" (non-playable character) with stalk / telegraphed slam / sweep / charge / crystal rain, phase change at 65%/32% HP, stagger weak-point windows (+60% damage taken), team revive (1 per player at 45% HP), team win when boss HP=0; difficulty is pattern+positioning, not just HP.
- Server: `configure.mode='boss'`, authoritative boss state via existing 60Hz sim; rewards for the whole team.

P4 Crown Hunt → mini-game
- Lobby: Battle + Boss Hunt primary; Crown Hunt relabeled "MINI-GAME", logic unchanged (reuse).

P5 Energy
- New BOOSTS catalog (reserve-energy spend, temporary, resets at round end): Swift Surge 40⚡ speed, Cool Rush 50⚡ cooldowns, Aegis 45⚡ shield, Mend 45⚡ regen, Focus Fury 70⚡ damage.
- Two spend paths: pre-fight loadout in the room (charged+applied at start) and in-battle BOOST panel; server-authoritative online (validated cost, deducted, spendEvents echoed); local play deducts+saves locally; instant UI reflection; gems stay long-term progression.

## Acceptance checklist (engineering layer)
- [x] `npm test` green: 20 Node test groups; 24 server/network checks, including depth/boss/boost/P0-static coverage (2026-09-19).
- [x] No stuck-input paths preserved: pointerup / pointercancel / lostpointercapture / blur / pagehide release handling covered by implementation review.
- [x] Existing profile schema untouched except energy semantics (still 0..1000, now spendable).
- [x] Fluffy/Water Rat atlas paths preserved by the drawWorld refactor.
- Physical two-iPad round + Nathan/Leo feedback remain the classroom gate (not claimable here).
