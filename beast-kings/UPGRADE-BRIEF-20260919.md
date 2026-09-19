# Beast Kings V4 Upgrade Brief — Nathan + Leo

Date: 2026-09-19
Owners / student designers: Nathan + Leo
Development target: `beast-kings/builds/astra-legends/`

## Worktree rule

All V4 work MUST stay inside this worktree:

`/Users/gemstone/Desktop/student-works-beast-kings-v4-20260919`

Branch:

`beast-kings-v4-20260919`

Do not edit, replace, clean, reset, or overwrite the original worktree at:

`/Users/gemstone/Desktop/student-works`

The new worktree already includes the iPad LAN-HTTP startup compatibility fix from today's classroom session and should use that as the baseline.

## What the students said

### Best parts to preserve

Nathan:
- The fighting itself is the best part.
- Combat feedback feels good and makes the game very fun to replay.

Leo:
- Changing beasts and training / practising different skills is fun.
- The game should keep its different beast identities and move sets.

Therefore: do not redesign the core combat from scratch. Preserve the fast combat feedback, distinct skills, training loop, beast switching, gems/progression, and the current visual identity unless a change is required for the new mechanics.

## Priority 0 — Fix iPad browser control and viewing

Current classroom problem:
- Safari can zoom when the player double-taps empty areas.
- Once zoomed, the player loses the correct view and controls become difficult.
- The game does not feel like a stable full-screen iPad game.
- Touch controls need to be easier to hit.

Requirements:
1. Prevent accidental Safari double-tap zoom and gesture interference inside gameplay.
2. Use a stable landscape game viewport on iPad Safari.
3. Respect iPad safe areas and dynamic browser chrome.
4. Gameplay controls must remain fixed, visible, and reachable during combat.
5. Increase touch targets where useful without covering important combat space.
6. Multi-touch must work: movement plus jump/block/attack at the same time.
7. Touch release/cancel must never leave a movement or attack button stuck.
8. Do not disable normal accessibility outside the gameplay surface unnecessarily.

Acceptance:
- Two physical iPads can play for at least one complete round without accidental zoom.
- No stuck movement after touch release or touchcancel.
- No control is clipped in landscape.
- The visible arena remains stable while tapping rapidly.

## Priority 1 — Bigger arena

Student/teacher feedback:
- The current arena feels too small.
- Players cannot meaningfully escape, chase, reposition, or create space.

Requirements:
- Increase usable combat space substantially.
- Keep players readable on iPad.
- Camera/framing may follow the action, but avoid disorienting zoom or constant camera shake.
- Existing attacks must still have understandable range and telegraphs after scale changes.

The goal is not simply to stretch the background. The larger arena must create real tactical space.

## Priority 2 — Add fake-3D movement

Current game mainly allows left/right movement.

Upgrade to a 2.5D / fake-3D arena:
- X axis: left/right.
- Y/depth axis: up/down on the arena floor.
- Jump/fly remains a separate vertical combat state where appropriate.
- Characters can escape, chase, flank, cross paths, and reposition around attacks.
- Rendering order must reflect depth so characters nearer the camera appear in front.
- Collision, melee range, projectiles, area attacks, AI, and target selection must understand both floor coordinates.

Controls:
- iPad movement control must support diagonals naturally.
- Keyboard should support equivalent four-direction movement.

Important:
- Preserve the immediate fighting feel.
- Do not turn the game into free-camera 3D.
- Keep the visual language simple enough for children to read instantly.

Acceptance:
- A player can move left/right/up/down and diagonally.
- A player can intentionally dodge around another beast rather than only through left/right spacing.
- Melee attacks do not hit opponents who are visually far away on the depth axis.
- Area attacks clearly communicate their 2D ground footprint.

## Priority 3 — Cooperative Boss Fight

Nathan and Leo confirmed they want a team mode where players cooperate against a boss.

Add a dedicated co-op boss mode:
- 2–3 human beasts team up.
- One strong boss is the flagship encounter and should feel genuinely different from a normal playable beast.
- Additional boss encounters may reuse existing beasts with larger scale, stronger stats, modified attacks, phases, or combined mechanics to save production cost.
- Boss combat should benefit from the larger 2.5D arena.
- Players should have reasons to spread out, dodge, regroup, and help each other.

Boss design should include several of:
- large telegraphed area attacks,
- charge / sweep / slam patterns,
- phase change,
- temporary weak point,
- summons or hazards,
- team positioning requirement.

Do not make difficulty come only from huge HP.

Acceptance:
- 2–3 iPads can join the same boss encounter.
- Boss attacks are readable and avoidable.
- The team can win through movement and skill use, not just damage spam.
- Round end, replay, reconnect, and pause still work.

## Priority 4 — Crown Hunt becomes a mini-game

Crown Hunt does not need to remain a main competitive mode.

Reframe it as a lighter mini-game accessible from the lobby / mode selection.
It can remain fun and fast, but it should no longer compete with:
- standard Beast Battle,
- practice/training,
- co-op Boss Fight.

Reuse current Crown Hunt logic where possible.

## Priority 5 — Make Energy useful

Current classroom finding:
- Players can accumulate hundreds or thousands of Energy.
- The students could not clearly explain what Energy is for.
- This makes Energy feel like a wasted resource.

New direction:
Energy becomes an arena-session resource for temporary tactical upgrades.

Examples:
- temporary movement boost,
- faster cooldown recovery,
- temporary shield,
- one-round attack modifier,
- healing/recovery option,
- team support buff,
- boss-specific utility.

Rules:
- Spending Energy should create choices, not automatic permanent power creep.
- Temporary upgrades reset appropriately after the match/session.
- Gems remain the clearer long-term progression currency unless there is a strong reason to change that structure.
- UI must clearly explain what Energy buys and how much each choice costs.

Acceptance:
- A new player can explain Energy's purpose after seeing the UI.
- Players have at least two meaningful ways to spend it in or immediately before a fight.
- Energy expenditure is reflected instantly and saved correctly where applicable.

## Music

Fighting music is optional and lower priority.
Nathan and Leo did not identify it as a key need.

Only add music after:
1. iPad control is solid,
2. larger 2.5D arena works,
3. boss mode works,
4. performance remains good.

If added:
- sound must default to a classroom-friendly setting,
- volume/mute must be obvious,
- no remote dependency is required for basic play.

## Performance and engineering constraints

- Physical iPad performance matters more than desktop spectacle.
- Keep Reduced Effects mode.
- Avoid large new dependencies unless clearly justified.
- Preserve offline/solo capability where practical.
- Multiplayer server remains authoritative for shared competitive/co-op state.
- Do not break current profile/progression data unnecessarily.
- Existing Fluffy and Water Rat art must continue to load correctly.
- Existing automated combat/server tests must remain green; extend them for new mechanics.
- Browser simulation is not enough for final acceptance: physical iPad testing is required.

## Suggested implementation order

1. Lock iPad viewport/touch behaviour.
2. Refactor world coordinates from X-only combat spacing to X + depth Y.
3. Expand arena and camera/framing.
4. Update hit detection/projectiles/zones/AI for 2.5D.
5. Re-test existing battle + practice.
6. Add Boss Fight networking/state.
7. Add flagship boss mechanics.
8. Convert Crown Hunt to mini-game positioning.
9. Redesign Energy spending.
10. Polish UI/audio only after gameplay acceptance.

## Definition of done

V4 is ready for Nathan + Leo classroom review when:
- original V3 remains untouched and playable,
- V4 runs from this separate worktree,
- two or three physical iPads can join,
- no accidental Safari zoom interrupts play,
- four-direction floor movement works,
- arena is meaningfully larger,
- normal Beast Battle still feels as responsive as before,
- practice and beast switching still work,
- co-op Boss Fight is playable start-to-finish,
- Energy has a clear temporary-upgrade purpose,
- Crown Hunt is retained as a mini-game,
- automated tests pass,
- Nathan and Leo can each complete one round and give a new best/worst feedback item.
