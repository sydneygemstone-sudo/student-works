# V2 QA — 2026-09-24

Normal UI playthrough passed: title and Leafbit selection; story movement lock; keyboard movement; synthetic touch direction/cancel; two real captures with normal damage; battle movement lock; exact-monster confirmed sale; paid purchase; confirmed cooking and meal use; earned-money training and evolution/trait; refresh retained team and coins. See qa/results.json for individual steps. No health, coins or win-state mutation was used in that progression.

The first combined test then failed because its low-HP save fixture was overwritten by the normal pagehide autosave before reload. This was a fixture setup error. Setup was corrected to initialize the fixture at document start, and qa/boundary-results.json records the successful rerun: fallen partner disabled, forced living switch, full defeat and revival without lost coins, portrait controls/return, tablet viewport, zero page errors. Original failure evidence is retained rather than replaced.

node --check game.js passed. The UI flow was exercised in headless Chrome with software WebGL; screenshots are local evidence. Synthetic touch and tablet viewport are not physical iPad/Safari acceptance. No human audio listening or normal full three-boss campaign completion was performed. Boss balance, final two-phase encounter and long sessions remain unverified gameplay areas.

Visual QA found overexposure in initial screenshots; lighting and tone mapping were reduced before final boundary/render rerun. The first world/battle screenshots precede that correction; final title, portrait and tablet screenshots use the corrected rendering.

Resources: both test runs closed their task-owned browser and loopback HTTP server in finally. No shared browsers or existing services were stopped. No preview left open.
