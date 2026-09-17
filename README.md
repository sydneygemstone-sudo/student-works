# 学员作品 · Student Works

这里是课堂与家庭里「一句话下单 → AI 交付」的学生作品集：学生用一句话（或回答三个问题）提出需求，AI 负责设计、实现、测试并交付一个能直接玩的作品。仓库公开，所有作品都可以在浏览器里直接玩，也可以下载后离线打开。

隐私口径：本仓库只写学生的名字（Naomi、Victory、Alex、Martin），不写姓氏，除年龄之外不记录任何个人信息，不写邮箱；老师 / 家长一律只称 Dean。

- 总入口（在线玩）：<https://sydneygemstone-sudo.github.io/student-works/>
- 仓库：<https://github.com/sydneygemstone-sudo/student-works>

## 作品清单

| 作品 | 学员 | 日期 | 在线玩 | 源码目录 | 说明 |
|---|---|---|---|---|---|
| ⛵ 珊瑚船员 · Coral Crew | Leesha、Quentin | 2026-09-17 升级 | <https://sydneygemstone-sudo.github.io/student-works/coral-crew/> | [`coral-crew/`](coral-crew/) | 局域网 3D 双人合作探险：海盗守船切瓜开炮、潜水员深海探宝避鲨，带北海巨妖 Kraken 首领战、水下采珠、黄金工坊升级与 Game Master 教师控场出题协议。双 iPad 局域网自动联机扫码即玩。详见 [coral-crew/README.md](coral-crew/README.md) |
| 🎮 Martin's Monster Quest 3D | Martin | 2026-09-17 | <https://sydneygemstone-sudo.github.io/student-works/martins-monster-quest/> | [`martins-monster-quest/`](martins-monster-quest/) | 3D 抓宠进化与雷霆决战：带 3D 训练师指挥台、跟随神兽伙伴、Mega 进化、被动加护与双阶段 Boss 战。iPad/PC 均可玩。详见 [martins-monster-quest/README.md](martins-monster-quest/README.md) |
| 🐻🐰 小动物回家 | Naomi | 2026-08-25 | <https://sydneygemstone-sudo.github.io/student-works/naomi-pet-rescue/> | [`naomi-pet-rescue/`](naomi-pet-rescue/) | 两人同机轮流的合作桌游：小熊和小兔在暴风雨到达前把 8 只走丢的小动物送回家，一局约 10 分钟。详见 [naomi-pet-rescue/README.md](naomi-pet-rescue/README.md) |
| 🥊 Victory vs Alex · 拳击 | Victory、Alex | 2026-08-17 | <https://sydneygemstone-sudo.github.io/student-works/victory-vs-alex-boxing/> | [`victory-vs-alex-boxing/`](victory-vs-alex-boxing/) | 一句话下单的 2D 双人拳击格斗：连击、闪避、体力、KO 演出，需要实体键盘。详见 [victory-vs-alex-boxing/README.md](victory-vs-alex-boxing/README.md) |
| 🥋 Leo vs Nathan · 格斗 | Leo、Nathan | 2026-08-15 | <https://sydneygemstone-sudo.github.io/student-works/leo-vs-nathan/> | [`leo-vs-nathan/`](leo-vs-nathan/) | 一句话下单（原文：make a fihgting game，2 characters， Leo and nathan）由 Claude Fable 5 一次成型的双人格斗，需要实体键盘。详见 [leo-vs-nathan/README.md](leo-vs-nathan/README.md) |

## ⛵ 珊瑚船员 · Coral Crew（Leesha & Quentin，2026-09-11 课堂立项，2026-09-17 深度升级）

双 iPad 局域网联网 3D 实时合作游戏，由 Leesha（海盗）与 Quentin（潜水员）在 Dean 老师的主持下共同创作。

### 核心分工与双人合作机制
- 🏴‍☠️ **Leesha（海盗）**：在船上切西瓜备粮、调配特制西瓜冰沙供队友极速冲刺、开重炮轰退水怪与巨妖触手、投掷西瓜诱饵引开鲨鱼、拉紧绞盘救援潜水员。
- 🤿 **Quentin（潜水员）**：深海潜水探宝、管理氧气罐、用声纳扫描全图宝藏、水泡枪赶走鲨鱼、开合贝壳采出黑珍珠、解开沉船宝箱、运送 5 颗宝石与 2 颗星星回船通关！
- 🦑 **北海巨妖 Kraken 首领战**：巨怪袭击小船，海盗轰触手，潜水员打吸盘弱点，全员协同防御！
- 🪙 **黄金升级工坊**：团队共享金币，可升级双联大炮、旋风脚蹼、铁木装甲与金切瓜刀。
- 🎓 **Game Master 教师控场中枢 (`teacher.html`)**：支持老师出题广播、TTS 自动语音朗读、学生想法分检采纳、实时向游戏注入事件与金币雨。

[直接在浏览器在线试玩](https://sydneygemstone-sudo.github.io/student-works/coral-crew/) · [教师主控台](https://sydneygemstone-sudo.github.io/student-works/coral-crew/teacher.html) · [完整玩法与源码文档](coral-crew/README.md)

## 🐻🐰 小动物回家（Naomi，2026-08-25）

**2026-09-08 已更新：**绘本花园、石头森林、礼盒、家园守护；根据试玩反馈，把周期落网改为看得见且可绕开的森林网，勇气改为自动加步并保留全部余量。修复后浏览器整局救回8只、剩5回合；20项规则测试通过。[打开新版](https://sydneygemstone-sudo.github.io/student-works/naomi-pet-rescue/) · [当前玩法与验证记录](naomi-pet-rescue/README.md)。

以下保留首次课堂设计记录。

### 三问三答（原文照录）

| 问 | Naomi 的回答 |
|---|---|
| Naomi，你想怎么玩这个桌游呀？ | 两个人在同一台电脑上轮流玩 |
| 你最喜欢什么主题？ | 小动物 / 宠物 |
| 你喜欢哪种玩法？ | 大家一起合作闯关 |

### 玩法

一句话：两个人在同一台电脑上轮流操作，合作把 8 只走丢的小动物在暴风雨到达之前全部送回家。

角色与胜负：

- 🐻 小熊：一回合走 2 步，能抱 2 只小动物。
- 🐰 小兔：一回合走 3 步，只能抱 1 只小动物。
- 点亮起来的格子就能走（也可用键盘方向键）；走到小动物那里自动抱起，走回 🏠 家自动放下；挨着队友时可以「🤝 递给队友」。
- 每走完一手，🌧️ 暴风雨就近一步；每 4 手打一次雷，一只小动物受惊跑走一格。
- 胜负：合作制，一起赢或一起输。暴风雨到达（28 手）之前把全部 8 只送回家 → 一起赢；否则一起输。

调难度、调时长和 QA 钩子见 [naomi-pet-rescue/README.md](naomi-pet-rescue/README.md)。

### 生产过程时间线（AEST）

- 16:53 Dean 下单：问 Naomi 3 个问题，然后用 ultracode 做一个能玩 10 分钟的简单桌游
- 16:54 三问三答完成（见上）
- 16:56 ultracode 设计工作流启动：3 位设计师并行（铺路寻宝 / 行动点救援 / 记忆翻牌）+ 1 位评审合成
- 17:00 Dean 追加期限：17:20 前做完并直接打开给他们玩
- 17:00 判断工作流来不及，停掉设计工作流，改为主会话直接实现「行动点救援」型设计（小熊/小兔能力不同、可递宠物、暴风雨倒计时、打雷惊跑）
- 17:03 node 模拟 2000 局校准手数与胜率；headless Chrome 截开始/局中/胜利/失败四屏
- 17:04 修两处视觉瑕疵（终局遮罩层级、家格子徽章）并复验
- 17:05 在浏览器打开，交付
- 17:08 Dean 要求「用 ultracode，别自己做」：启动审查修复工作流（真人点击路径 / 规则一致性 / 儿童可用性 / 平衡节奏 4 维审查 → 对抗验证 → 单写者修复 → 复验）
- 17:14 Dean 要求控制时间与预算：4 个审查代理均未完成，停止工作流
- 17:15 终验（文件未被改动、核心可加载、无外链、500 局复跑一致）并收工

历时：从下单到交付 22 分钟（16:53 → 17:15 AEST），其中游戏本体 12 分钟（17:00 → 17:12，含 QA）。

### 预算

| 环节 | 代理数 | 输出 token | 缓存写 | 缓存读 | 牌价等价 |
|---|---|---|---|---|---|
| 设计工作流（已中停） | 3 | 约 19.1k | 约 64.7k | 约 340k | 约 US$2.1 |
| 审查修复工作流（已中停） | 4 | 约 52.3k | 约 415k | 约 1.52M | 约 US$9.3 |
| 主会话直写 + QA（估算） | 主会话 | 约 40k（估） | 约 0.3M（估） | 约 3M（估） | 约 US$9（估） |
| 合计 | 7 个子代理 + 主会话 | 约 111k | 约 0.78M | 约 4.9M | 约 US$20 ≈ A$30 |

- 牌价等价估算，实际走 Claude Code 订阅、零额外现金支出。
- 牌价与换算口径：与课程仓库同口径：Claude Fable 5 牌价 US$10（输入）/ US$50（输出）每百万 token；缓存写按输入价 ×1.25、缓存读按输入价 ×0.1；汇率按 1 USD ≈ 1.52 AUD。
- 子代理数字来自工作流转录文件统计，主会话为估算。
- 仓库整理与发布（2026-08-25 晚）：ultracode 工作流，worker 全部改用 Claude Haiku 4.5（便宜档），4 个代理；此前一次 Fable 5 发布工作流在写完总 README 后即被停止。
- 收齐拳击各版本与 Leo vs Nathan（2026-08-25 晚）：1 个 Haiku 探针全盘扫描去重（约 3.6 万 token、2.5 分钟）+ 4 个 Haiku worker 归档、审核、推送、验收。

### 校准数据

node 2000 局模拟：中位 22 手、P25–P75 19–24、`STORM_STEPS=28` 时启发式胜率约 96%。

### 下一步

- 下周进入 Naomi 的 AI使魔账户作品集。
- 之后继续按「问 3 个问题 → 迭代」的方式开发，每轮问答与改动追加到本 README。

## 🥊 Victory vs Alex · 拳击（Victory、Alex，2026-08-17）

- 原始指令：`make a fighting game, Victory vs Alex, boxing fighting.`（后追加：快点做出来）
- 日期：2026-08-17
- 本仓库收录的是 agy（Antigravity CLI）做的多文件版（`index.html` + `style.css` + `js/`）。
- 同一句需求共 6 个版本已全部收录：[agy 版](victory-vs-alex-boxing/) · [快速版](victory-vs-alex-boxing/versions/quick.html) · [手感版](victory-vs-alex-boxing/versions/juice.html) · [深度版](victory-vs-alex-boxing/versions/depth.html) · [萌系版](victory-vs-alex-boxing/versions/charm.html) · [合成版 PUNCH PALS!](victory-vs-alex-boxing/versions/fusion.html)
- 制作记录与操作说明详见 [victory-vs-alex-boxing/README.md](victory-vs-alex-boxing/README.md)。

## 🥋 Leo vs Nathan · 格斗（Leo、Nathan，2026-08-15）

- 原始指令（一字不改）：`make a fihgting game，2 characters， Leo and nathan`
- worker：Claude（Fable 5）主会话一次成型
- 日期：2026-08-15
- 一句话下单时就包含错别字（"fihgting"应为"fighting"），AI 理解了意图，直接交付了一个完整的、可玩的、支持双人对战与人机模式的格斗游戏。
- 详见 [leo-vs-nathan/README.md](leo-vs-nathan/README.md)。

## 迭代开发约定

1. 每次迭代先问学生 3 个问题。
2. 问答原文记入 README（不改写、不润色）。
3. 生产：AI 设计、实现、测试、交付。
4. 把生产过程（时间线）与预算追加记录到 README。
5. 作品将进入学生的 AI使魔账户作品集。

## 本地打开方式

克隆或下载本仓库后，双击各作品目录里的 `index.html` 即可，离线可玩，无需联网：

- `martins-monster-quest/index.html`
- `naomi-pet-rescue/index.html`
- `victory-vs-alex-boxing/index.html`
- `leo-vs-nathan/index.html`


## 🎮 Martin's Monster Quest 3D（Martin，2026-09-17）

- **需求背景**：课堂下课前 15 分钟立项，限制 2 AUD 算力预算，要求必须真实可玩并支持 iPad 触屏操作。
- **演进历程**：
  1. **Spike 快速原型**：完成三属性初始神兽、大地图遇敌、回合制对战、捕捉与 Boss 战。
  2. **视觉升维要求**：“我们要的 3D 人物呢，我们要更细致的画面，不要只做一个战斗界面就完了”。升级为 Three.js 纯前端 3D 渲染，带 3D 细致面部表情、萌宠实体跟随、大世界花丛与生命之泉。
  3. **现场试玩与排障**：排查修复战斗遮罩层级冲突、DOM 监听空指针、iPad 动态视口（`100dvh`）裁切。
  4. **终极大版本重构 (v1.0)**：解决镜头晃动与深度不足反馈，打造经典 3/4 越肩对战运镜（零抖动、零遮挡）、扩建三大连贯生态大世界（翡翠山谷 / 低语峡谷 / 雷鸣之巅）、扩充至 14 种原创 3D 怪物、三段式超级进化树与多技能战术池、新增 Chapter 1.5 劲敌决斗与双阶段 Awakened Stormjaw 泰坦决战。
- **在线体验**：[打开 Martin's Monster Quest 3D](https://sydneygemstone-sudo.github.io/student-works/martins-monster-quest/)
- **详尽玩法指南**：详见 [`martins-monster-quest/README.md`](martins-monster-quest/README.md)。
- **完整研发档案与对话实录**：详见 [`martins-monster-quest/DEVLOG.md`](martins-monster-quest/DEVLOG.md)。


## Beast Kings - Nathan & Leo (2026-09-12)

[Play / 单人试玩](https://sydneygemstone-sudo.github.io/student-works/beast-kings/builds/astra-legends/) | [Source and bilingual logs / 源码及双语日志](beast-kings/) | [Playtest review / 试玩测评](https://sydneygemstone-sudo.github.io/student-works/beast-kings/builds/astra-legends/review.html)

Seven beasts including Fluffy and Water Rat, practice/quests, upgrades, and a structured review. Multiplayer uses your own computer-hosted Tailscale address; this public preview supports solo play.
