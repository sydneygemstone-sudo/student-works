# Beast Kings — GLM-5.3 Upgrade Notes (2026-09-19)

Model: **GLM-5.3** (this branch is the GLM-5.3 comparison build of Beast Kings V4 for Nathan + Leo).
Baseline: V4 2.5D / Crown Golem / energy-boost branch (`beast-kings/builds/astra-legends/`, V4-IMPLEMENTATION-NOTES.md 2026-09-19).
Target: `beast-kings/builds/astra-legends/` only. **Not a rewrite** — all V4 systems, characters, Fluffy/Water Rat art, multiplayer server, solo practice, 2.5D movement, Crown Golem boss and energy boosts are preserved.

## How this build is distinguishable from V4

- New "GLM 5.3 UPGRADE" badge in the top bar (visible in hub and during play).
- Build identity is declared once in code (`shared.js` → `BUILD = {id:'glm53', ...}`) and asserted by tests; cache-busted asset versions (`client.js?v=20260919-glm53`, service-worker cache `…-glm53`).
- Visual language of the arena changed: floor depth bands + BACK/FRONT labels, amber→red telegraph fills, per-player locator ring, boss pattern chip + instruction line.

## What GLM-5.3 changed (exact scope)

### 1) iPad playability / 2.5D readability (client render only)
- `legend-art.js drawWorld`: subtle back-to-front floor gradient, BACK·FAR / FRONT·NEAR labels, retained (calmer) depth ellipse guides.
- New locator ring under **your own** beast (gold; pulses red when you stand inside a danger zone) — computed from the new pure `G.dangerAt`.
- No change to V4 zoom lock, safe areas, touch targets, multi-touch pointer handling or stuck-input paths; `touch-action` guards untouched.

### 2) Combat feel / telegraph clarity (no damage/HP inflation)
- `combat.js zone()`: zones now record `waitMax` so the UI can show time-to-impact.
- `drawZone`: waiting zones now fill amber→red and show a shrinking countdown ring instead of a faint stroke. Applies to all telegraphed zones (boss and player), colour-coded for boss zones.
- **Crown Golem sweep rework**: previously struck on the first frame of the pattern. It now has a 0.45 s wind-up (cast flash) before the same strike; damage/push/range unchanged. `p.swept` guards the single strike and resets on pattern change.
- Charge attack now draws a lane telegraph (arrow line on the floor) during its 0.55 s wind-up.

### 3) Boss / co-op usability
- New pure helper `combat.js bossReadout(p)` (+ `BOSS_TELLS`, `BOSS_ACTIONS`) re-exported from `shared.js`: phase, pattern label, plain-English instruction, wind-up flag, progress, weak-point state. One source of truth for HUD and canvas.
- Boss HUD (`index.html` + `client.js updateHUD` + `style.css`): pattern chip (STALKING / SLAM / ARM SWEEP / CHARGE / CRYSTAL RAIN / PHASE ROAR / STAGGERED) with colour states, an always-visible one-line instruction ("what should we do now"), phase markers at the 65 % / 32 % thresholds on the boss HP track, and the weak-point call-out retained.

### 4) Energy boost clarity (gems untouched)
- BOOST button now shows your live reserve (`ϟ N`) and highlights when any boost is affordable; existing boost panel/rows, costs, durations, spend receipts and the "gems stay permanent" wording are unchanged. Boosts remain temporary reserve spend; gems remain the only long-term currency.

### 5) Performance
- No new libraries, no remote assets. All additions are a few canvas fills/strokes per frame and one string update per HUD tick; reduced-effects mode untouched; effect caps (18/38 drawn) unchanged.

## Files changed

- `beast-kings/builds/astra-legends/combat.js` — `waitMax` on zones, sweep wind-up, `BOSS_TELLS`/`BOSS_ACTIONS`/`bossReadout` export.
- `beast-kings/builds/astra-legends/shared.js` — `BUILD` tag, `dangerAt(g,x,z)`, re-export boss readout API.
- `beast-kings/builds/astra-legends/legend-art.js` — depth bands/labels, telegraph fill + countdown ring, own-player locator/danger ring, boss charge lane.
- `beast-kings/builds/astra-legends/client.js` — boss pattern chip + instruction line, phase markers, danger flag passed to renderer, boost reserve on button.
- `beast-kings/builds/astra-legends/index.html` — GLM 5.3 badge, boss HUD elements, boost reserve element, cache-busts.
- `beast-kings/builds/astra-legends/style.css` — badge, boss chip/hint/phase marks, boost button states.
- `beast-kings/builds/astra-legends/sw.js` — cache version bump only.
- `beast-kings/builds/astra-legends/combat-tests.js` — updated SW-version static assertion + 4 new GLM53 tests.

## Verification (all deterministic, run 2026-09-19)

- `npm test` in `beast-kings/builds/astra-legends`: **green** — 24 Node test groups (19 V4 + `GLM53 build identity…`, `GLM53 boss readout…`, `GLM53 sweep now telegraphs…`, `GLM53 zones expose waitMax and dangerAt…`) and all 24 server/network checks ("ALL 24 CHECKS PASSED").
- `node --check` passed for `combat.js`, `shared.js`, `legend-art.js`, `client.js`, `combat-tests.js`.
- Headless `drawWorld` smoke (stub canvas, boss mode with waiting zones, charge telegraph, both reduced/full paths, danger on/off) executed without runtime errors in Node.
- Gameplay-simulation coverage: sweep no-damage during wind-up then strike; zone `waitMax` ≥ `wait`; `dangerAt` true inside / false outside (x, depth, expired).

## Explicitly NOT changed

- Characters, movesets, move damage/cooldowns, gem economy, boost costs, boss HP/damage numbers, multiplayer protocol, offline/solo flows, arenas, Fluffy/Water Rat atlases, historical builds, review page.

## Unverified / outstanding

- **No physical-iPad testing was performed or is claimed.** Landscape-iPad Safari behaviour (zoom lock, readability, telegraph legibility at arm's length, multi-touch feel) still requires the classroom two-iPad acceptance round with Nathan and Leo.
- No visual browser screenshot QA was run in this session (render changes were smoke-tested headlessly only).
- Real classroom acceptance of the new boss instructions / danger readability is pending; the boss-balance feel after the sweep wind-up should be sanity-checked in one real match.

## Cost / usage

- No cost claims are made here; GLM-5.3 usage accounting will be derived externally from the CLI log.