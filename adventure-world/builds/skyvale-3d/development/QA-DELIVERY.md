# QA / Delivery — Skyvale 1.0

- Delivery URL: <CLASSROOM_SERVER>/?room=SKY924
- Development window: 2026-09-24 16:23:52–16:38:52 Asia/Shanghai; new feature work stopped within this window. Final evidence filing follows verification.
- Public HTTPS health readback: ok, skyvale-1.0.
- Public WSS full loop PASS: three independent connections, fourth rejected, distant interaction rejected, all flight rings, three fruit harvests, campfire, all animals and produce, three cabin stages, lobby celebration. Shared final state equal on all three clients; disconnect/rejoin retained progress. Evidence: qa/network-results.json.
- Headless Chromium final check PASS: three separate contexts, keyboard travel, key release stops movement, refresh/rejoin, zero page exceptions. Static scene batching reduced final draw calls to 54. Evidence: qa/browser-results.json, qa/world.png, qa/tablet.png, qa/landing.png.
- Earlier browser movement check FAILED under three software-rendered contexts. Corrected by independent 70ms input transmission and material batching; final travel/release check passed.
- Tablet screenshot captured. Synthetic pointercancel handler smoke check ran, but this does not prove physical touch capture/drag behavior. Physical iPad/Safari, real hardware frame rate, and three children playing together remain NOT TESTED.
- No disaster gameplay or free object editor in this first version. No permanent save database. Room progress is memory-only and resets on server restart.
- Original game and saves untouched. No GitHub publication or unrelated edits.
- Test browser closed in finally; all QA WebSockets closed. No presentation browser, new browser profile, or temporary preview remains. The authorized classroom server and tunnel are retained intentionally.
- Retained service: node server.mjs, PID [private], loopback 18940. Tunnel PID [private]. PID files are authoritative if restarted. stop.ps1 validates process command before stopping only recorded services.
- Current link remains usable while MSI and these delivery services are running. Restart instructions in README.md / start.ps1; a tunnel restart generates a new URL.
- Dependencies: Three.js 0.170.0, ws 8.18.3, Playwright 1.55.0 (QA). No external runtime CDN, accounts, student voice data or classroom transcript published.
- Actual token/cost accounting unavailable; no invented cost claim. Direct current-task execution; no worker delegation.

教务交回摘要：Joey、Mia、Chloe 的 Adventure World 全新 3D 合作版已提供公网试玩入口。大厅连接星环乐园、野外营地和农场；三人共享采集与建屋进度。工程联机与键盘检查通过，待三台真实设备和学生现场试玩。下一轮按反馈优先调整操控/引导，再安排灾难与自由抓取。
