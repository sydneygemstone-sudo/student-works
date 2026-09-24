# Wildbound V2 — implementation scope

Martin's individual original monster game. Based on the teacher's confirmed 2026-09-24 V2 brief. Student direction: monsters can be kept and trained, traded at NPC shops, or used for food; no base building. Cooking confirmation, team safeguards, local autosave and other implementation defaults are engineering decisions in the supplied brief, not invented student quotes.

Start: 2026-09-24 07:15:44 UTC. Hard deadline: 07:30:44 UTC. Implementation by the current Astra task; no delegated workers or paid services. Actual token cost unavailable. Historical V1 2 AUD is not V2 cost.

Reference: sydneygemstone-sudo/student-works, main at d14e58142fb72590abba61a248e1228b232ede23. New MSI checkout, initially clean. V1 files read only. All additions confined to martins-monster-quest/v2/. No other student or HUB changes. Existing Pages deployment is main/root; independent V2 publication authorized in this task.

New implementation: explicit exploration/story/shop/kitchen/evolution/battle state ownership, asynchronous battle tokens, independent monster IDs, synchronous validated economy, independent V2 save key. Three.js runtime copied from V1 with its license header retained; no V1 game code copied.

Core: exploration, guaranteed capture below 50% HP, selling, progression-gated buying, confirmed monster-to-meal conversion, actual team recovery, training, evolution, traits, three regions and three sequential main challenges. Keyboard and touch coexist. Failure preserves progression. No account, multiplayer, real payments or construction.

Presentation: full-window procedural 3D, original fox/hare/pup/dragon/stone silhouettes, local generated audio, elemental particles, hit reactions, damage numbers, energy-limited skills, no camera shake.

Timebox reductions: compact reusable regional layout, one common and one rare hunting destination per region, no large side-quest system. No imported character art or recorded narration. English UI. Actual iPad and Martin's satisfaction require later hands-on acceptance.
