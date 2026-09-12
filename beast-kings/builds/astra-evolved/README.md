# Beast Kings · Evolve

The current after-class upgrade for Nathan and Leo, created by Astra under Dean's authorization.

## Play

Use [the Tailscale HTTPS link](https://YOUR-HOST.YOUR-TAILNET.ts.net:8443/) on each iPad. Choose a name and beast; join the shared arena on two or three devices, then start once. Battle is last beast standing. Crown Hunt is first to defeat five targets. Pause and reset are shared. A fourth connection can spectate.

Solo practice and the Sentinel Trial start from the lobby or Quests. First open the HTTPS link online and wait for **Offline quests ready**. The saved game can then reopen without a connection for solo play. The host is needed for multiplayer and initial loading/updating.

## Controls and progression

Touch buttons support simultaneous movement, flight, and actions. Hold FLY to ascend while energy lasts. BLOCK crouches on the ground and reduces damage. Each beast has a distinct SPECIAL; Pip & Pebble coordinate as one playable pair. Keyboard: A/D move, Space fly, S block, J punch, I kick, K spin, L blink, U super, O special.

| Completed round | Gems | XP | Stored energy |
| --- | ---: | ---: | ---: |
| Five practice targets | 5 | 12 | 8 |
| Win the AI quest | 12 | 25 | 15 |
| Win a multiplayer round | 10 | 20 | 12 |

Spend gems in Tech base on attack, armor, flight capacity, or equipment. XP evolves the beast at 50, 140, and 300 XP. Stored energy adds flight capacity in later rounds. Time away grants no currency. Equipment changes statistics; evolution adds visible adornments. Fluffy awaits the supplied reference.

Progress is browser-local storage, separate for each origin and device. Clearing browser data removes the save. Offline profiles are suitable for a family game and are not a tamper-proof competitive account economy. No purchases or real-money currency exist.

## Host

Node.js and the locked `ws` dependency run the host. In this directory:

```powershell
npm ci
npm start
```

Or run `start.cmd`, which sets the preferred HTTPS sharing link. Default port is 8765, bound on all host interfaces for the authorized local/Tailscale connections. `PORT` can override it. `PLAY_URL` supplies the preferred link in health metadata. Keep the computer awake and Tailscale connected during multiplayer.

The dedicated private Tailscale Serve route was configured as:

```powershell
tailscale serve --bg --https=8443 http://127.0.0.1:8765
```

Do not reset unrelated Serve routes on this shared computer. This route is for the tailnet, not public Funnel exposure. HTTPS is required for cached offline reopening on iPad; direct HTTP remains usable for connected play.

## Source and verification

- `shared.js`: common rules, AI opponent, combat, equipment, evolution, rewards.
- `server.js`: authoritative three-player host, synchronization, disconnect/pause recovery, static files.
- `client.js`: hub, purchases, touch input, local play, network rendering and reconnect.
- `art.js`: cached character poses and backgrounds; reduced effects default on.
- `sw.js`: saves the shell for offline reopening; excludes health/API requests.

Run `npm test` for 20 engine/server checks. Browser scripts and captures are in `../../qa/`; see `../../QA-EVOLVED.md` for verified results and physical-device limits.
