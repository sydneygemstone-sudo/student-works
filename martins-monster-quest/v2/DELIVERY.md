# Martin’s Monster Quest V2 — Wildbound

Independent entry: https://sydneygemstone-sudo.github.io/student-works/martins-monster-quest/v2/

Open index.html directly for the local build; all runtime dependencies are bundled. For a local HTTP entry, serve this directory with `python -m http.server 8786` and open http://localhost:8786/. The test server is temporary and is closed by QA teardown.

Choose a trainer and partner. WASD/arrows or touch arrows move; E/Interact uses nearby locations. You can tap a landmark to walk to it. Start at the hunting glade, weaken to 50% HP, capture, then visit Market or Trail Kitchen. My team offers paid training. Defeat GigaGolem, unlock the gorge and Sky's evolved duel, then face two-phase Stormjaw. Trail map allows travel to unlocked regions. A fountain restores the entire team for free.

V1 and its saves are preserved. V2 uses its own local browser save. Cooking and selling require confirmation and protect the last living partner. Buying costs more than resale; stock follows main progression. No real payment exists.

Validation evidence: qa/results.json and screenshots. The normal recorded flow uses gameplay and UI without changing health, money or victory state. Failure/switch safeguards additionally use a clearly identified low-HP save fixture. These are engineering checks in headless Chrome, not real iPad/Safari, audible sound quality, child acceptance or proof of a normal full campaign clear.

Known limits: region layouts reuse a compact template; quests are deliberately few; no full bilingual UI; final campaign balance and all three boss victories were not manually played end-to-end within the timebox. Visual models are procedural stylized meshes. Sound is synthesized and still needs listening acceptance. See QA.md for actual tested scope and publication receipt.

No classroom recordings, credentials or private family material included. No new service purchases. Task-owned headless browser/server are reclaimed by the test script's finally block; no presentation browser remains open.
