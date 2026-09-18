# 当前课堂状态

最后更新：2026-09-11，Australia/Sydney。

## 当前定位

| 项目 | 当前值 |
| --- | --- |
| 系统状态 | 已封盘：Dean确认迁移完成，当前本地任务归档；后续入口为MSI games。 |
| 课堂主持 | Dean |
| AI 课堂称呼 | 艾玛（AI 助手，由 Dean 指定） |
| 交互方式 | 当前文字对话；历史课堂记录依据实际收到的转写 |
| 本次主题 | 一起创造孩子想玩、少依赖文字说明、适合不熟练 iPad 操作的游戏 |
| 作品名称与类型 | 《珊瑚船员》：Quentin 与 Lisha 共同创作的双人实时 3D 合作游戏。 |
| 作品路径 / 打开入口 | MSI：`C:\GemstoneKingdom\Prism\ai-bounty-board\games\lisha-quentin\cooperation\coral-crew`；整改复测 http://100.66.207.5:18889/；18888为原版。本Mac保留源记录与交付索引。 |
| 学生名单 | Lisha（L-I-S-H-A）和 Quentin（与 Quentin Tarantino 同拼写），均由 Dean 明确确认 |
| 发言顺序 | 默认每轮 Lisha → Quentin；Dean 的主持插话不占孩子顺序，明确点名或转交问题时优先按老师安排归属；不是声音识别 |
| 当前回合 | R003：十类课堂目录、整课归档与两版运行服务迁移完成。 |
| 当前问题 | 刷新须回主界面；原 iPad 缩放与流畅体验继续复测。相机目标和 GitHub owner 尚待提供。 |
| 已收集创意 | I001–I005：主题、角色与整局目标；I006–I010：双机 3D 合作、食物交接、防守、鲨鱼与加速器、西瓜枪 |
| 已授权制作条目 | 用户直接实施授权下，I001–I010已实现为第一版，细节补齐见delivery/DELIVERY.md |
| 正在运行的制作任务 | 本地迁移任务封盘；MSI项目及游戏服务独立保留。 |
| 金币 / 奖励 | 未启用 |
| 音频能力 | 已收到当前语音对话的转写；未取得原音或可靠说话人标签，不能声称已凭声音区分老师与孩子；独立课堂收音系统尚未接入 |

## 本次制作资源

- 用户指定执行器 / 模型：Astra；用户允许增加并行路线，实际任务数及用量控制待核定。
- 最新资源覆盖：Dean 已明确取消原68%停止线，继续本次有界入口修复；保留累计用量记录，不扩展任务。58基线、10%与68线保留为历史授权，不再作为当前停工条件。
- 时间：半小时是明确课堂交付节点。记录起点 17:36:33，截止 18:06:33（2026-09-11，Australia/Sydney），续接不重置；不代表全部功能已被保证可交付。
- 额度来源、模型价格、任务数、并发与分配：待核定；两个 AI 合作仅为讨论的可能方案，尚未派工。
- 本次审核：用户明确覆盖为可用Antigravity或5.6 Terra/Sol；真实Sol审核已完成并核验rollout终态，结论accepted并按先主链后扩展顺序实施。
- 真实执行回执与用量：Sol与两路Astra实际模型和终态均已核验；delivery/USAGE-RECEIPT.json保存累计输入/缓存/输出。收尾周usedPercent=59，开工58，观察增加1个百分点，不换算为澳元。

## 已确定的工作原则

老师掌握主题和节奏；回答可慢速收集、人工拆分和分配；记录“谁说的”和“改哪里”；明确确认后才制作；展示实际结果并通过试玩继续下一轮。

## 下一步

分类与迁移完成，刷新入口补丁已经部署；交Dean在原iPad继续复测。游戏、介绍、日志、QA与家长入口已在同一作品上线。不要误将18888当整改版，不推断缓存原因。原始录音未收到。GitHub owner未提供，继续保留共同作品，不在本次扩展仓库工作。

## 本次设计约束

- Dean 希望孩子玩桌游或游戏，并提到他们喜欢 Minecraft；这属于老师报告的兴趣背景，尚未确定要制作 Minecraft 或其完整仿制版。
- 老师报告孩子看不懂游戏引导说明，iPad 操作也不熟练。作品应减少阅读负担、采用容易理解的交互，由老师或课堂对话辅助引导。
- Dean 已确定今天合并主题，使用两台 iPad 进行课堂内 3D 联网合作，海盗不下水，两位玩家分工互补。
- 西瓜是维持收集能力的食物资源；危险包括鲨鱼和撞船怪物，应对包含大炮、加速器以及已提出但用途未定的西瓜枪。
- 当前具体缺口与验收提案见 REQUIREMENTS.md；资源方案尚未确定，尚未启动实现批次。

## 恢复说明

先看本页和 delivery/CLASSROOM-QA-20260911.md，再按需查交付记录、BACKLOG 与 ROUNDS。Dean 是老师，AI 称呼艾玛。Lisha 最初提出海盗和西瓜；Quentin 最初提出潜水员和水下寻宝；孩子已在试玩中交换角色。第一版工程验证通过，课堂有好玩与通关反馈，同时有缩放、上手和性能等问题。后续修订不删除原始需求与历史纠错，也不把工程测试等同于所有课堂问题已解决。

## QA 整改更新（2026-09-11）

本次由独立可见任务在原项目 game/ 实施，Astra 制作、真实 Sol 整改审核通过（非沿用第一版审核）。姓名现用 Quentin / Lisha；历史原文保留。新版本独立 MSI 18889 复测，18888 未覆盖。新增双准备学习安全、教师口令暂停、零饥饿停止移动与救援西瓜、流畅档、触控修复、独立拾取/交付反馈、同作品介绍/日志/QA/家长入口。实际工程验证与复测入口见 delivery/REVISION-DELIVERY.md；实体旧 iPad 待 Dean 复测，相机目标与私有 GitHub owner 待提供。

## R003 · MSI课堂分类与归档完成（2026-09-11）

Dean明确要求在Prism下建立与ai-familiar并列的AI作品目录，十类角色文档采用暂定产品分类。实际作品归属为 `C:\GemstoneKingdom\Prism\ai-bounty-board\games\lisha-quentin\cooperation\coral-crew`。两版服务已迁移，18888/18889不变；完整文件校验、隔离恢复演练、MSI和Mac经Tailscale双客户端检查通过。旧根目录移入作品恢复区，空根Devlog删除。学生名为Lisha和Quentin，等级未指定。全部结果见delivery/l-tree-reorganization/DELIVERY.md；此路径在Mac工作区，MSI对应docs/devlog/REORGANIZATION-20260911.md。AI使魔应用调用CLI、实体iPad和GitHub仍按各自验收边界处理。

## 后续连接与项目入口（2026-09-11）

Tailscale复发已修复并有真实App connected/initialized证据；后续默认msi-win TS，不走LAN回退。目标远程项目为C:\GemstoneKingdom\Prism\ai-bounty-board\games；目录已就绪，尚待用户在App添加项目登记，因为现有工具没有Add Project入口。详见delivery/connection-diagnostics/TS-REPAIRED.md。

## MSI模型运行端更新（2026-09-11）

MSI的SSH运行端已升级0.154.0并重启，TS App连接与初始化通过，远程模型目录现有可见GPT-6 Astra。games项目已登记并已有真实MSI任务记录。证据见delivery/connection-diagnostics/CODEX-UPGRADED.md。

## R004 · 迁移封盘（2026-09-11）

Dean 已确认本次项目迁移完成，要求封盘并归档当前任务。本地 game master 停止作为开发入口，后续工作在 MSI 的 games 远程项目继续。

- 远程项目：C:\GemstoneKingdom\Prism\ai-bounty-board\games
- 作品目录：games\lisha-quentin\cooperation\coral-crew
- 默认连接：msi-win，Tailscale；不自动回退 LAN。
- MSI SSH Codex 已升级 0.154.0；App 连接初始化通过，远程模型目录可见 Astra。
- 服务入口：原课堂版 http://100.66.207.5:18888/；整改版 http://100.66.207.5:18889/。
- 本次封盘不重启或修改游戏服务，也不修改正在运行的 MSI 任务。
- 本地源记录保留。当前工具没有移除 App 项目条目的接口；本机 game master 项目条目仍需从项目菜单移除。任务归档由 App 专用工具执行，其回执为准。
- 迁移与更新证据见 delivery/l-tree-reorganization/DELIVERY.md 和 delivery/connection-diagnostics/CODEX-UPGRADED.md。

历史待验收项继续随 MSI 作品保存：旧 iPad 实体复测、AI 使魔实际 CLI 调度集成、GitHub 私有仓库归属。本次封盘不将这些事项记为已完成，不自动启动新工作。
