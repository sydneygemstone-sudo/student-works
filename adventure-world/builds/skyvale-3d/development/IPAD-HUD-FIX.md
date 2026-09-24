# iPad HUD hotfix — 2026-09-24

Joey reported on the blue iPad that bottom HUD options were outside the visible screen; Dean confirmed all players are on iPad.

Implemented a game shell sized and positioned from VisualViewport, with dynamic-viewport CSS fallback, safe-area spacing, a visible touch joystick even with an attached trackpad, minimum 48px action heights, compact layouts based on visible height, and matching 3D canvas resizing. Inputs use 16px type to avoid focus zoom. Rotation/viewport changes clear movement input. All six actions remain available.

Regression reproduced using the unmodified prior files: with a 560px visible viewport, the original actions ended below its boundary. The public updated build passed geometry and elementFromPoint hit checks for all six actions and the joystick at 1024x560, 1024x500 with a 44px top offset, 1024x420, 768x850, 1194x700 and 507x680. Active CDP touch drag beyond the joystick followed by cancellation returned movement input to zero. All six action buttons accepted real browser touch taps. Zero page errors. These are Chromium simulations; physical iPad Safari still requires classroom readback.

Evidence: qa/ipad-hud-results.json; qa/ipad-landscape-with-toolbar.png; qa/ipad-portrait.png. Prior files retained in development/ipad-hud-before. Public HTML, game.js, ipad.css and viewport.js matched local SHA-256 on readback (development/ipad-hud-live-assets.json).

Current entry: <CLASSROOM_SERVER>/?room=SKY924&v=ipad-hud-1
Existing players need one refresh and rejoin with SKY924. Classroom services were not restarted; existing shared room state is retained. All tests used separate HUD-prefixed rooms, and finally closed task-owned browser contexts and connections. User's in-app tab and other browsers were left untouched.

Implementation references: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport and https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/ . No broad gameplay/server change in this fix.
