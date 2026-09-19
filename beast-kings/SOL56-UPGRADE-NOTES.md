# Beast Kings · GPT-5.6 Sol Showcase Upgrade — 2026-09-19

Model / implementation line: **GPT-5.6 Sol**  
Showcase branch: `beast-kings-showcase-20260919`  
Target: `beast-kings/showcase/versions/sol56/`

## What this pass adds

### 1. A solo Beast King roguelike gauntlet

The latest build now has a complete solo progression path in addition to the existing practice, multiplayer battle and co-op boss modes.

The gauntlet order is:

1. Frost
2. Ember
3. Moss
4. Volt
5. Pip + Pebble
6. Fluffy
7. Water Rat
8. Final **BEAST KING**

After each of the first seven wins the player chooses one of three temporary run upgrades. The upgrade pool includes max HP, damage, movement speed, cooldown recovery, combat energy, starting shield and mixed recovery/fury/focus bonuses. Choices stack for that run only.

The final Beast King uses the Apex boss system but is deliberately tuned above the ordinary single-human boss:
- 1,040 HP
- additional attack multiplier
- additional movement speed
- faster skill cadence

This is intended as a solo endgame after seven accumulated upgrades; it is numerically in the range that would normally be approached as a 2–3 player cooperative challenge rather than an ordinary one-on-one beast.

### 2. Beast King certificate

Completing the final fight unlocks a certificate containing:
- player / game name,
- selected Beast,
- browser-local Game ID,
- completion date,
- Beast King title.

The certificate can be saved as PNG and the browser print flow can be used for PDF / paper output.

### 3. Fullscreen and iPad input protection

The showcase build keeps the Sol touch fixes and adds a visible fullscreen control.

Gameplay protections include:
- `maximum-scale=1,user-scalable=no,viewport-fit=cover`,
- gameplay `touch-action:none`,
- gesture and double-tap protection within the game surface,
- pointer capture with `pointerup`, `pointercancel`, `lostpointercapture`,
- safe-area-aware landscape controls,
- native fullscreen where supported, with a full-viewport web fallback.

This is engineering protection against accidental browser interaction. Physical iPad acceptance is still a separate classroom test.

### 4. Chinese / English switching

The latest build can switch the interface between Chinese and English. Dynamic character descriptions, move names/descriptions, progression copy, boosts, shop text and gauntlet/certificate copy are included rather than translating only the outer Hub.

The archive Hub, development log, review form and parent report use the same stored language preference.

### 5. Museum / archive packaging

The public Beast Kings entry now points to a version Hub rather than silently replacing old builds.

The archive preserves:
- Original playable-rule recreation,
- Astra Legends,
- authentic GLM-5.3 comparison upgrade,
- GPT-5.6 Sol latest build.

This is intentional: the product records its iteration history instead of treating the latest output as if earlier work never existed.

## Verification

### Engine / game tests

In `beast-kings/showcase/versions/sol56/`:

`npm test` passed with:
- all existing 42-move combat coverage,
- existing 2.5D and boss coverage,
- all **26** server/network checks,
- three dedicated gauntlet tests:
  - seven-beast sequence and three-choice progression,
  - stacking roguelike stats,
  - final Beast King co-op-tier tuning.

At the final run:
- 16 Node test groups passed,
- 0 failed.

### Browser archive QA

The archive also includes `beast-kings/qa/showcase-smoke.cjs`, which checks:
- Hub Chinese and English,
- development report bilingual content and recorded GLM usage,
- parent report bilingual content,
- review draft save + Word-compatible download,
- original-rule static replay,
- Astra Legends static solo play,
- GLM comparison static solo play,
- Sol gauntlet through all seven upgrade selections to final certificate,
- input-zoom viewport guard,
- fullscreen fallback.

Browser simulation is not presented as physical-iPad acceptance.

## Cost statement

No per-session cash invoice is exposed for this GPT-5.6 Sol implementation, so no cash amount is invented for this pass.

The repository separately preserves:
- historical Astra API-equivalent reference accounting,
- authentic GLM-5.3 execution usage and a public API list-rate reference,
- hypothetical human replacement-cost scenarios clearly marked as estimates rather than money paid.

## Outstanding physical acceptance

Before calling this a polished public demo rather than an engineering-complete classroom build, run:
- at least one complete gauntlet on a physical iPad,
- at least one two-iPad normal battle,
- at least one two-to-three-iPad boss match,
- Chinese/English switch checks on the physical device,
- certificate save / Files or Photos handling on the actual iPad,
- Safari / Add-to-Home-Screen fullscreen feel.

The code path can be verified automatically; fun, comfort and real-device browser behaviour still require Nathan, Leo and classroom observation.
