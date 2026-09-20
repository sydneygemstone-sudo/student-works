# 三版本探查与合并 / Three-version investigation and merge
2026-09-20 · Release 1.1.0

| 来源 / Source | 源码事实 / Source facts | 处理 / Integration decision |
|---|---|---|
| GLM | 单 HTML；Three.js r128 CDN；中文；键盘；40 个随机平台；13 颗宝石取 8；速度 8 / One HTML, CDN, Chinese, keyboard, random course, 8 of 13, speed 8 | 原版 ZIP 保留；明亮天空 0x87ceeb 被适配为可切换的明亮场景；不采用不固定的随机关卡 / Archive unchanged; adapt daylight palette; reject nondeterministic route |
| Claude | 本地 r160；game.js + HTML；中文为主；键盘；手工分段、旋转横杆、移动平台；11 取 8；速度 12 / Local runtime, authored stages, sweepers, moving platforms, keyboard, 8 of 11, speed 12 | 原版 ZIP 保留；适配 0.16 秒边缘宽限、0.20 秒跳跃缓冲、发光路标；不把复杂横杆与移动平台塞进首个家庭改版 / Archive; adapt forgiving jump input and beacons; defer the harder mechanics |
| Codex Astra | 本地 Three.js 0.186.0；完整 source/release；英文；固定十二平台；8/12；速度 7.6；触控与暂停 / Vendored source/release, English, deterministic route, touch and pause | 作为整合底座；玩家 8.8，敌人参数不变；新摇杆、双语、家长页、测评表 / Integration base; faster player with unchanged enemies, new joystick and bilingual pages |

这是源码与功能层面的取舍整合，不是保留三套引擎后让家长自己选，也不是未经核验地宣称把所有特性合并完成。
This is a source-level and feature-level integration, not three engines left for parents to choose from, and not a claim that every original feature was merged.

## 历史保持 / History preservation
`archive/` 内是未改动课堂文件的压缩快照；原版内部仍可能只有单一语言或键盘支持。这些原版不属于“最终版完整双语触屏”的承诺范围。`manifest.json` 记录每个原始文件与 ZIP 的 SHA-256。课堂开发日志与教师评估不在公开原版包内。
The archives contain unmodified classroom files, which may still be single-language or keyboard-only. They are historical source snapshots, not the bilingual touch-enabled final edition. The manifest records file and ZIP SHA-256 values. Private development transcripts and teacher assessments are excluded.

## 最后评讲进入版本 / Final review reflected in the release
- “喜欢灯光、水晶和逃到出口” → 保留收集逃生主循环，增加路边光标。
  Enjoyed lights, crystals and the exit → retain collection/escape and add lit route beacons.
- “骷髅追得太快；玩家加一点速度” → 玩家由 7.6 到 8.8；不把敌人也一起调慢。
  Chase too fast; make the player faster → change only player speed from 7.6 to 8.8.
- 教师指出家中没有键盘 → 左摇杆、右跳跃、暂停重玩、多指与取消处理。
  Teacher identifies no home keyboard → left stick, right jump, pause/restart and multi-pointer cancellation.
- 最终中英文与分享 → 游戏、独立 HUB、总 HUB、家长指南、测评页统一语言切换。
  Bilingual sharing → translate game, project hub, collection hub, parent guide and review page.
