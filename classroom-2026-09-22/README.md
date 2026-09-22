# Classroom Studio · 2026.09.23-r4

Class: 22 September 2026. English + simplified Chinese. Original classroom folders are retained locally and are not deleted by this release.

## Project decisions

[Kehan HUB](kehan-hub.html) · [Two-branch assessment](kehan-comparison.html)

Keep BOTH latest branches. Claude retains real mothership/shuttle exploration; Astra retains the more direct ice/fire combat. Both have revised touch controls. This is not a claim that two games were completely fused into a new one.

[Harrison × Zavier HUB](harrison-zavier-hub.html) · [Retained/rejected assessment](harrison-zavier-comparison.html)

Retain Astra. Reject Opus after the teacher's report of two repairs that still failed classroom use. Existing local tests and screenshots do not override the failure to establish usable three-iPad classroom play. The rejected candidate has a screenshot and analysis, no playable entry, and its development cost remains in the ledger.

## r4: left utility rail and double-tap protection

All three retained games use a vertical left-side toolbar. The joystick occupies a separate zone, preserving instructions and action buttons. Buttons are at least 44 CSS pixels; the toolbar uses 48-pixel targets.

A shared early-loaded gesture guard protects game surfaces from double-tap zoom. Game input still uses independent pointers; normal menu buttons, language, pause and name entry remain usable. Reading pages retain normal browser accessibility. Dynamic stylesheet injection and offline packages use the same versioned assets.

This revision has 48 passing WebKit/Chromium gesture/layout checks at 1024×768, 768×1024 and 844×390; a separate Claude multi-touch test passes 4 checks; actual extracted packages pass 7 checks. The first broad Chromium regression encountered one navigation timeout; the targeted rerun and WebKit package tests are retained alongside that first-attempt note. These checks are not physical iPad certification.

## At home

Open either HUB directly on iPad, then choose a retained build. Landscape is recommended. No Node.js, teacher computer or multiplayer service is required on iPad.

The offline ZIP downloads are for computers with Node.js already installed. Kehan's ZIP includes two current branches. Harrison/Zavier's ZIP includes the selected Astra branch only. Each includes a local launcher and all runtime assets. Initial website loading needs internet; the included computer package does not.

## Balance and controls

Kehan Claude: eliminate duplicated lateral flight input; left stick moves, right-side drag looks; independent multi-touch shoot/ice/jump; pause/focus cleanup; stage-specific retry. Astra: preserve combat, touch pause, safe areas and elapsed-time simulation.

Harrison/Zavier: camera follows the smoothed character position, with frame-independent interpolation. Bot attack intervals are 1.8 times longer (about 44% less frequent); one super per wave, doubled bot super cooldown, target decisions every 0.7 seconds. Human cooldowns remain unchanged. Boss phase HP is 440 instead of 340; contact damage 22 instead of 19; slam damage 40 instead of 34, with a warning at the player's recorded position before impact. Elite density and rescues were calibrated after an overly difficult first pass.

## Budget and evidence

Kehan: approved A$50; original logged development 4,996,170 tokens, API-equivalent A$12.10.
Harrison/Zavier: approved A$100; original logged development 11,988,696 tokens, API-equivalent A$22.27.

[Cost data](costs.json) retains the original verified session counters, cache breakdown, published-rate sources and the 22 September reference conversion. These amounts are API-equivalent valuation, not an extra subscription invoice. Current ChatGPT controller usage has no provider receipt and is marked unmetered, not zero. Subscriptions and tax are not allocated without invoices.

[Acceptance](acceptance.json) links the touch/WebKit, bilingual HUB, balance and actual extracted-ZIP test results. Simulations and injected scenarios are identified; none is represented as a child or human playthrough. A physical iPad has not been tested.

## Privacy

Only first names, project summaries, game screenshots and aggregate development counters are public. No student voice recordings, voice clones, full classroom transcripts, raw AI session logs, credentials or private contact details are included. Naomi's private voice workflow is outside this release.
