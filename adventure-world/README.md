# Adventure World | 彩虹探险乐园

A delightful 2.5D children's park exploration & mystery game co-created by Joey, Mia, and Chloe.
Built with pure HTML5, Canvas 2D, Web Audio API, and modern ES modules. Zero external runtime dependencies.

## 1. Quick Start & Play

### Run Command
```bash
cd /Users/gemstone/dev/adventure-world
python3 -m http.server 8890 --bind 0.0.0.0
```

- **Project Root**: `/Users/gemstone/dev/adventure-world`
- **Port**: `8890` (verified free port on Mac)
- **Local Mac Play URL**: [http://localhost:8890](http://localhost:8890) or [http://127.0.0.1:8890](http://127.0.0.1:8890)
- **Same Wi-Fi iPad Safari URL**: `http://192.168.1.108:8890` (LAN IP verified via `ipconfig getifaddr en0`)
- **Stop Server**: Press `Ctrl+C` in the terminal, or run `kill $(lsof -t -i:8890)`

## 2. Gameplay Features
1. **Daytime Exploration (Collect 3 Stamps)**:
   - **Water Park Stamp (`waterpark`)**: Ride the rainbow water slide from top ladder down into the splash pool and exit safely.
   - **Wildlife Zoo Stamp (`zoo`)**: Walk along the zoo walkways and observe 3 different animals (Lion, Crocodile, Giraffe, Elephant, Penguin, Shy Owl).
   - **Puppy Bestie Stamp (`puppy`)**: Visit the Puppy Meadow, collect a free dog treat from the treat stand, pet the puppy, and feed it a treat.
2. **Voluntary Night Adventure**:
   - Collect all 3 stamps to unlock the "Begin Night Tour" portal.
   - Night features gentle spooky ambiance, soft streetlights, and an infinite-battery flashlight (L).
3. **3 Abilities & 3 Star Clues**:
   - **Sky Star Clue (`sky`)**: Activate Flight (F) to soar over the low barrier to the high observation platform; shine flashlight for 1.0s and interact to collect!
   - **Quiet Star Clue (`quiet`)**: Activate Invisibility (I) and walk quietly along the walkway to the shy owl; shine flashlight for 1.0s and interact to collect!
   - **Trail Star Clue (`trail`)**: Ask the puppy to sniff at the start spot; follow the 3 glowing pawprints to the secret spot; shine flashlight for 1.0s and interact to collect!
4. **Starglow Restoration**:
   - Bring all 3 clues back to the Starglow Console in the Entrance Plaza.
   - Interact to light up the park's starry lights and celebrate!
   - Victory screen allows either continuing free exploration in daytime or starting a fresh adventure.

## 3. Controls
- **Desktop Keyboard**:
  - `WASD` or `Arrow Keys`: Move explorer
  - `E` or `Space` / `Enter`: Interact
  - `F`: Flight (5s duration, 3s cooldown)
  - `I`: Invisibility (8s duration, 4s cooldown)
  - `L`: Flashlight toggle (night only)
  - `1`, `2`, `3`: Switch character appearance
  - `Esc`: Pause game
- **iPad / Touchscreen**:
  - Left Virtual Joystick: Move explorer
  - Right Action Buttons (52px minimum target): Interact, Fly, Invisibility, Torch
  - Top Bar: Avatar quick switcher, sound toggle, language switch (EN / 中文), pause button.

## 4. Architecture & Directory Structure
```text
adventure-world/
  SPEC.md               # Original v1.0 specification
  README.md             # Launch instructions & manual
  index.html            # Main entry point & responsive viewport
  styles.css            # Picture-book styling & touch targets
  src/
    main.js             # Game application & main loop
    state.js            # Explicit FSM (DAY/NIGHT/COMPLETED & UI_STATES)
    input.js            # Unified keyboard + touch joystick
    world.js            # Geometry, collision detection, safe landing, slide physics
    quests.js           # Stamps, clues, hold illumination & victory triggers
    puppy.js            # Companion puppy, ground pathing, sniff pawprints
    render.js           # Canvas 2D isometric rendering & night lighting mask
    save.js             # Schema-validated localStorage persistence
    audio.js            # Procedural Web Audio API sound synthesizer
  data/
    world.json          # Zones, obstacles, landmarks, lamps, visitors
    quests.json         # Constants, stamp criteria, clue criteria
    locale.en.json      # English translations
    locale.zh.json      # Chinese translations
  assets/
    README.md           # Asset licensing & procedural rendering note
  tests/
    run-all-tests.js    # Automated suite covering A01 - A16
  _qa/
    ACCEPTANCE_REVIEW.md# Full test verification & hardware report
    results.json        # Structured test results
    screenshots/        # 6+ actual gameplay browser screenshots
```
