# Beast Kings — Astra prototype

Local 2D beast arena for Nathan and Leo. Implementation by Astra (GPT-6 Astra), using Node.js built-ins and original Canvas artwork. Working title, beast appearances, balance, controls, and spin interpretation are AI defaults; see the shared SPEC.md for the children's contributions.

## Play

1. Double-click `start.cmd`, or run `node server.js` in this directory. No packages or internet connection required.
2. On both iPads, keep Tailscale connected and open **http://100.64.0.1:8765**. Dean confirmed that both iPads are already on Tailscale. The same-Wi-Fi alternative is http://192.168.1.100:8765. Desktop: http://localhost:8765. Diagnostics: http://localhost:8765/health.
3. Tap **Enter the arena** on each device. First player is Frost, second is Ember. A third device cannot take an occupied slot.
4. Explain the controls in the lobby, choose **Duel** or **Crown Hunt**, and tap **Start round**. Both devices share the same round. Either device can activate teacher pause.
5. At the result choose **New round**, then start again. To change mode mid-round, pause and choose New round first.

Keep the server computer awake. Windows may require allowing Node on the private/local network. This game is intended only for the classroom LAN; it does not provide authenticated teacher accounts.

Network recovery: a temporary connection interruption pauses the shared match and reconnects automatically; tap Resume once both beasts are connected. If the host server restarts, existing tabs automatically rejoin a fresh lobby. A Reconnect now button is available during connection loss. Keep Tailscale active on both iPads. Five additional automated network-recovery checks passed after the initial build.

## Controls and rules

Move with the two arrow buttons, or A/D (left/right arrow keys). Tap the up button/Space to jump; hold for energy-limited flight. Use simultaneous touches to move and attack.

| Action | Key | Damage | Cooldown |
| --- | --- | --- | --- |
| Punch | J | 9 | 0.36s |
| Kick | I | 15 | 0.7s |
| Spin | K | 19, either direction | 2.5s |
| Blink | L | Teleport 230 units forward | 3s |
| Super | U | 23, extended range | 4s |

Duel: 100 HP each, zero HP ends the round; simultaneous final hits produce a draw. Crown Hunt: training targets have 28 HP and respawn. Each defeat grants one charge and +12% damage; five charges wins. Player knockouts in Crown Hunt respawn after about 1.4 seconds, followed by brief invulnerability.

The server decides movement, damage, cooldowns, target awards, winners, and pause state. Inputs expire after 700 ms. SSE pushes state at 30 Hz. Refresh reconnects the same tab's session and pauses the active round; choose Resume when both players are present. Leave releases a player slot immediately. A disconnected slot is available to a new player after 15 seconds. The screen shows a landscape hint in portrait; no orientation lock is required.

## Verification and limits

- Parent coordinator's model rules: 10/10 passed after fixing simultaneous knockout and delayed Crown respawn.
- Parent coordinator reports 8/8 network checks passed, covering shared state, slots, combat, pause, rematch, disconnect, and rejoin.
- `node --check server.js` and `node --check client.js` pass.
- Independent browser viewport verification and artifacts are recorded by the coordinator under the project's `qa/` directory.
- Physical two-iPad multitouch and child/teacher acceptance are **pending**, not inferred from desktop checks.
- Prototype has stylized visual feedback but no sound; it is one arena and one round at a time, without persistent progression.
- No paid services or media were used. Exact token/cost totals are unavailable and not estimated.

Build dispatch: 2026-09-12 06:38:10 UTC. Hard stop: 06:48:10 UTC (ten minutes maximum). Final stopping time is reported in the coordinator's handoff.

Files: `server.js` (authoritative rules and transport), `client.js` (touch and Canvas), `index.html`, `style.css`, `start.cmd`, `package.json`.
