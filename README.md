# 学员作品 · Student Works

这里是课堂与家庭里「一句话下单 → AI 交付」的学生作品集：学生用一句话（或回答三个问题）提出需求，AI 负责设计、实现、测试并交付一个能直接玩的作品。仓库公开，所有作品都可以在浏览器里直接玩，也可以下载后离线打开。

隐私口径：本仓库只写学生的名字（Naomi、Victory、Alex），不写姓氏，除年龄之外不记录任何个人信息，不写邮箱；老师 / 家长一律只称 Dean。

- 总入口（在线玩）：<https://sydneygemstone-sudo.github.io/student-works/>
- 仓库：<https://github.com/sydneygemstone-sudo/student-works>

## 作品清单

| 作品 | 学员 | 日期 | 在线玩 | 源码目录 | 说明 |
|---|---|---|---|---|---|
| 🐻🐰 小动物回家 | Naomi | 2026-08-25 | <https://sydneygemstone-sudo.github.io/student-works/naomi-pet-rescue/> | [`naomi-pet-rescue/`](naomi-pet-rescue/) | 两人同机轮流的合作桌游：小熊和小兔在暴风雨到达前把 8 只走丢的小动物送回家，一局约 10 分钟。详见 [naomi-pet-rescue/README.md](naomi-pet-rescue/README.md) |
| 🥊 Victory vs Alex · 拳击 | Victory、Alex | 2026-08-17 | <https://sydneygemstone-sudo.github.io/student-works/victory-vs-alex-boxing/> | [`victory-vs-alex-boxing/`](victory-vs-alex-boxing/) | 一句话下单的 2D 双人拳击格斗：连击、闪避、体力、KO 演出，需要实体键盘。详见 [victory-vs-alex-boxing/README.md](victory-vs-alex-boxing/README.md) |

## 🐻🐰 小动物回家（Naomi，2026-08-25）

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

### 校准数据

node 2000 局模拟：中位 22 手、P25–P75 19–24、`STORM_STEPS=28` 时启发式胜率约 96%。

### 下一步

- 下周进入 Naomi 的 AI使魔账户作品集。
- 之后继续按「问 3 个问题 → 迭代」的方式开发，每轮问答与改动追加到本 README。

## 🥊 Victory vs Alex · 拳击（Victory、Alex，2026-08-17）

- 原始指令：`make a fighting game, Victory vs Alex, boxing fighting.`（后追加：快点做出来）
- 日期：2026-08-17
- 本仓库收录的是 agy（Antigravity CLI）做的多文件版（`index.html` + `style.css` + `js/`）。
- 同一句需求还有 5 个单文件版本留在课程仓库，未收录。
- 制作记录与操作说明详见 [victory-vs-alex-boxing/README.md](victory-vs-alex-boxing/README.md)。

## 迭代开发约定

1. 每次迭代先问学生 3 个问题。
2. 问答原文记入 README（不改写、不润色）。
3. 生产：AI 设计、实现、测试、交付。
4. 把生产过程（时间线）与预算追加记录到 README。
5. 作品将进入学生的 AI使魔账户作品集。

## 本地打开方式

克隆或下载本仓库后，双击各作品目录里的 `index.html` 即可，离线可玩，无需联网：

- `naomi-pet-rescue/index.html`
- `victory-vs-alex-boxing/index.html`
