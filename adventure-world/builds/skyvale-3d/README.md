# 云间奇遇 / Skyvale — recovered classroom branch

Date: 2026-09-24. This is a server-dependent development candidate, not a GitHub Pages multiplayer service.

Showcase: ../../../classroom-2026-09-24/trio-hub.html

The latest public/ files include the iPad HUD patch. Three prior files remain in development/ipad-hud-before/ for reproduction. Replacing just those three files in a COPY reconstructs the previous HUD; do not overwrite the original.

Run: preinstall Node.js, extract the provided runtime ZIP, then run `node server.mjs` in that folder. Default entry is http://127.0.0.1:18940; PORT can select another port. ws is bundled in the runtime ZIP. The source-only checkout uses `npm ci` first. Third-party licenses are retained. Never connect a test to a live classroom room.

Networking: loopback-only server by default. A teacher-authorized reverse proxy/tunnel is needed for other devices; no persistent public tunnel or room invitation is published here. Max three clients; room progress is memory-only, not a permanent save. No account/authentication service; not approved as an unattended public service.

Evidence: development/QA-DELIVERY.md; development/IPAD-HUD-FIX.md; qa/*.json. The original development report said costs were unavailable; this archive separately recovered usage in the daily HUB. Host paths, process IDs and classroom tunnel identifiers were redacted from newly published metadata. Runtime game logic is unchanged; exact original metadata remains private.

QA scripts use TEST_URL to select an isolated test server and CHROME_EXECUTABLE when a custom browser is needed. Physical iPad acceptance after the patch is still open.
