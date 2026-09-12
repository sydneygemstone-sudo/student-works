# Evolve verification — 12 September 2026

These are Astra's engineering checks, not Nathan/Leo's acceptance of the upgrade. Earlier classroom feedback reports enjoyment of flying and a lag problem, but does not establish which comparison build was played or the cause of lag.

## Passed

- 20 engine/server checks in `builds/astra-evolved/server-tests.js`: three-player combat, Crown Hunt, practice and quest rewards, progression and purchase boundaries, special powers, malformed inputs, slot ownership, spectators, reconnect retention, pause/reset, and static-file restrictions.
- `qa/evolved-acceptance.cjs`: five selectable characters, paired beast and background choice; browser multi-touch events for simultaneous movement/flight and cancellation; five completed practice rounds earn 25 gems and 60 XP and evolve the beast; purchasing with earned gems, insufficient-funds protection, and refresh persistence.
- The same flow: the HTTPS shell caches and reopens with the browser connection disabled, permits a completed practice round with earnings, and preserves earnings after another offline reload. The AI quest has a live opponent; pause freezes simulation.
- Three isolated browser profiles joined the live HTTPS route, started a shared round, observed another player's movement, and paused together. Ten controls fit a 1024 × 768 landscape viewport. Portrait guidance appears at 768 × 1024. No JavaScript page errors occurred.
- `qa/evolved-performance.cjs`: completed an AI quest through keyboard actions with a new profile; received exactly 12 gems, 25 XP, and 15 stored energy. Five-second continuous movement/flight sample: 301 frames, median 16.7 ms, 95th percentile 16.8 ms, reported 60 FPS, reduced effects enabled.
- The private Tailscale HTTPS address responds with its valid certificate; browser acceptance used it without bypassing certificate checks.

## Evidence

- `qa/evolved-acceptance-results.json`, `qa/evolved-performance-results.json`
- `qa/evolved-lobby.png`, `qa/evolved-roster.png`, `qa/evolved-practice.png`
- `qa/evolved-three-player.png`, `qa/evolved-quest-complete.png`

The browser was headless Microsoft Edge on the host with GPU disabled. Touch was simulated by browser touch dispatch, not a physical iPad. The network tests used independent profiles on the same host through Tailscale Serve, not remote physical devices. Desktop FPS does not establish iPad FPS or prove the reported network lag is solved.

## Measures addressing lag

Cached poses and backgrounds avoid redrawing detailed artwork from scratch; reduced effects default on; interface updates are throttled; remote positions are smoothed and local movement is predicted within a bounded window. The server simulates at 60 Hz, sends snapshots at 20 Hz, disables socket packet coalescing/compression, and bounds queued outgoing state. Multiplayer health, damage, outcomes, and rewards remain server-authoritative. Physical testing should determine the next performance change.

## Delivery state and limitations

- The live game uses `builds/astra-evolved` on port 8765 through the dedicated Tailscale HTTPS route on 8443. The empty QA room was reset for the next players.
- Final server-source metadata/static-file hardening was verified in isolated tests. The existing live host was left running, so that last server-only revision takes effect on its next normal launch. Current gameplay uses the completed engine; browser assets were verified from the live service.
- Saves stay on the same browser/device/origin. No cloud save transfer is implemented. Private browsing or clearing site data can remove progress.
- Fluffy awaits Dean's reference. Character art is more detailed and dimensional but remains stylized 2D art.

## Next classroom acceptance

1. On two iPads with Tailscale enabled, open the HTTPS link, choose names and different beasts, and join/start one shared round. Optionally add Dean as the third player.
2. Fly and attack simultaneously; pause together; finish and replay. Observe delay and control responsiveness on the actual iPads.
3. Complete practice, see earned gems, purchase an upgrade, and refresh. After **Offline quests ready**, disconnect and reopen for a solo round.

Record the device, action, observed result, and one next improvement. Teacher acceptance of Evolve: pending.

## Bilingual review form verification / 双语测评表验证

`qa/review-check.cjs` passed seven checks without JavaScript errors: lobby entry and nine untested defaults; refresh persistence; bilingual Markdown export; structured JSON export without accepting the game; previous-draft preservation; full offline reopening and editing; portrait layout without horizontal overflow. Evidence: `qa/review-results.json` and `qa/review-form.png`. Test data is explicitly synthetic QA input.

七项浏览器检查通过：大厅入口、未测试默认值、刷新续填、双语报告与结构化数据导出、保留旧轮次、断网重开续填，以及竖屏无横向溢出。老师验收仍为待确认。
