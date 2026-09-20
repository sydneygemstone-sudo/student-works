# Michael · 水晶逃生 / Crystal Escape
## 开发需求定稿 / Development specification
版本 / Version: 1.1.0 · 2026-09-20

### 1. 产品目标 / Product goal
把 Michael 的课堂创意和最后一轮试玩反馈，变成家中可用 iPad 打开的 3D 跑酷作品。它是首个课后迭代，不是大型成品或已获孩子认可的最终难度。
Turn Michael's classroom idea and final review into a 3D obstacle game that opens on an iPad at home. This is the first after-class iteration, not a large finished product or child-approved final difficulty.

### 2. 需求来源与归属 / Requirements and attribution
- 学生提出：生存跑酷、骷髅追逐、跳跃、收集物品、五分钟完成；后续试玩提到水晶、灯光和出口。
  Student: survival obstacle course, skeleton chase, jumping, collecting, and a five-minute limit; later review referred to crystals, lights and the exit.
- 已确认玩法：在时限内集齐要求数量并抵达出口。最早谈到骷髅射击，但最终确认的是追逐与逃生，不加入射击或反击。
  Confirmed loop: collect the required amount and reach the exit before time runs out. Shooting was mentioned early, but the confirmed brief is chase and escape, without shooting or combat.
- 学生反馈：喜欢收集水晶、跑向出口而不被抓；部分地方偏难，追问后指出骷髅过快，选择提升玩家速度。
  Student feedback: enjoyed crystals and reaching the exit without being caught; after follow-up, identified chase speed as the difficulty and chose a faster player.
- 教师补充：面向 iPad/手机，不能依赖键盘；最终作品及 HUB 完整中英文，可展示、可测评。
  Teacher: iPad/phone use must not depend on a keyboard; the final game and hubs need full Chinese/English and home showcase/review support.
- 实现默认值，不冒充学生指定：12 颗中取 8 颗、玩家速度 8.8、十二块固定平台、游戏标题。
  Implementation defaults, not student-specified numbers: 8 of 12 crystals, speed 8.8, twelve fixed platforms, and the game title.

### 3. 规则与边界 / Rules and scope
| ID | 要求 / Requirement | 可观察的通过条件 / Observable result |
|---|---|---|
| R01 | 真 3D 平台跑酷 / True 3D platform course | 第三人称跟随镜头，平台与障碍有空间深度 / Third-person camera and spatial platforms |
| R02 | 移动与跳跃 / Move and jump | 电脑方向键/WASD/空格；触屏摇杆与跳跃可并发 / Keyboard and simultaneous touch controls |
| R03 | 骷髅持续追逐 / Skeleton pursuit | 不动可被抓，正常前进可拉开距离 / Idle player can be caught; forward movement gains distance |
| R04 | 五分钟时限 / Five-minute limit | 从开始计时，暂停冻结，归零失败 / Start at 300 seconds, freeze when paused, lose at zero |
| R05 | 收集水晶 / Crystal collection | 每颗只计一次，HUD 更新；重开恢复 / Count each once; update HUD; restore on restart |
| R06 | 双条件胜利 / Two-part win rule | 至少 8 颗 + 出口，数量不足给双语提示 / At least eight plus exit; locked-exit hint otherwise |
| R07 | 明确失败 / Clear failure | 被抓、掉落、超时有独立原因并可点按重试 / Distinct caught/fall/time outcomes with touch restart |
| R08 | 玩家提速 / Faster player | Astra 7.6 → 8.8，约 +15.8%；敌人速度公式不变 / Speed +15.8%; enemy formula unchanged |
| R09 | 输入容错 / Jump forgiveness | 0.16 秒边缘宽限、0.20 秒跳跃缓冲；按住不自动连跳 / 0.16 s coyote, 0.20 s buffer, one jump per press |
| R10 | 触控安全 / Touch robustness | 多指操作，松开/取消/失去捕获/离开页面不粘方向 / Multi-pointer; release/cancel/lost capture/blur clear input |
| R11 | 完整双语 / Full bilingual release | 菜单、HUD、教程、结果、错误、ARIA、HUB、家长页、测评页 / All menus, status, results, errors, labels and public pages |
| R12 | 云端访问 / Hosted access | HTTPS 静态页面，不依赖教师电脑和局域网 / HTTPS static page without the teacher's machine or LAN |
| R13 | 本机测评草稿 / Local review draft | 复制/清除，明确尚未发送；不假装服务器提交成功 / Copy/clear; explicit not-sent status |
| R14 | 可追溯合并 / Traceable integration | 三原版 ZIP + SHA-256；源码与构建脚本齐全 / Three original ZIPs, hashes, source and build script |
| R15 | 隐私 / Privacy | 公开仅名字和作品；详细评估独立教师私有资料 / First name and work public; detailed assessment private |

### 4. 技术与合并 / Technology and integration
Astra 是底座：Three.js 0.186.0 的实际 vendored 源码及 MIT 许可证保留；固定关卡、1/120 秒物理步进、触屏输入、暂停与单 HTML 发布结构继承。Claude 的跳跃容错与路边发光灯柱做了适配；GLM 明亮天空配色作为切换模式。
Astra supplies the base: vendored Three.js 0.186.0 and its MIT license, deterministic route, fixed 1/120-second simulation, touch input, pause and single-HTML packaging. Claude-inspired jump tolerance and roadside beacons are adapted; GLM's daylight palette becomes a toggle.

运行 `npm ci && npm run build` 重建 `play.html`。构建时可能下载固定版本 esbuild 0.25.12；游戏运行不请求外部引擎、字体或资源。静态 HUB 页面使用同目录资源。
Run `npm ci && npm run build` to rebuild `play.html`. Building may fetch pinned esbuild 0.25.12; playing loads no external engine, font or asset. Static hub pages use same-directory resources.

### 5. 课后家庭测试 / Home test
先用触屏玩两局，分别关注“加速会不会冲过头”和“边移动边跳是否可靠”。记录具体平台、动作、结果与一个建议。无需赢才能完成测评；不可把自动通关当成学生体验已通过。
Play two touch-controlled runs, concentrating on speed/overshooting and simultaneous move+jump. Record the location, action, outcome and one suggestion. Winning is not required; automated completion is not student acceptance.

### 6. 本次不做 / Out of scope
不做账号、聊天、排行榜、多人联网、支付、自动发送家长消息、战斗、复杂养成或硬件手柄支持。保留未来扩展可能，不算本版交付承诺。
No accounts, chat, leaderboard, multiplayer, payments, automated parent messages, combat, complex progression or hardware-controller support in this release.

### 7. 验证分层 / Verification layers
源码检查、浏览器自动测试、公开部署检查、实体 iPad 体验与学生验收分开记录。详细结果见 ENGINEERING_CHECKS.md；未测设备不写“已通过”。
Keep code checks, browser automation, hosted deployment, physical-iPad experience and student acceptance separate. See ENGINEERING_CHECKS.md; do not label untested devices as passed.

技术接口参考 / Technical interface references:
- MDN Pointer events: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- MDN touch-action: https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
