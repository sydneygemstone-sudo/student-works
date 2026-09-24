# Adventure World Assets & License Documentation

All game visual and sound assets are locally authored and procedurally rendered:

## 1. Visual Rendering (Canvas 2D Vector Procedural Graphics)
- **Engine**: Pure Canvas 2D procedural path drawing and SVG iconography.
- **Characters**: 3 bespoke cartoon explorers (Sky, Forest, Sunny) designed with distinct hats/hoodies, body colors, and walking/flying/invisible animation frames.
- **Animals**: 6 distinct animals (Lion with golden mane, Crocodile with friendly smile, Giraffe with tall neck and spots, Elephant with curved trunk, Penguin waddling on ice, Shy Owl perched on tree branch) procedurally rendered with breathing and interactive reactions.
- **Park Environment**: Seamless 2.5D illustration-style tiles, water waves, fountain splashes, rainbow slide gradient ribbon, streetlights with radial light cookies, and starry particle systems.
- **Source**: 100% self-contained bespoke code. No external proprietary art dependencies.

## 2. Audio Engine (Web Audio API Procedural Synthesis)
- **Engine**: Built-in HTML5 Web Audio API synthesizer (`src/audio.js`).
- **Sound Effects**:
  - `chime`: Melodic pentatonic notes for stamps and discoveries.
  - `splash`: Filtered white noise with exponential decay for water slide splash.
  - `bark`: Dual harmonic pitch-bend pulses for puppy woofs.
  - `flutter`: Smooth low-pass filtered frequency sweep for flight.
  - `sparkle`: Multi-oscillator twinkling chimes for Star Lights restoration.
  - `click`: Crisp acoustic transient for UI button interactions.
- **Source**: 100% procedural synthetic audio. Zero external MP3/WAV dependencies, guaranteeing 100% offline functionality, fast loading (<100KB total page size), and zero licensing friction.
