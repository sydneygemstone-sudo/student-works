# 开发日志总结 / Development log

作品 / Project: Beast Kings · Nathan & Leo · cooperation. 日期 / Date: 2026-09-12. 教师 / Teacher: Dean. AI: Astra.

## 最新：使魔选角与公开归档 / Latest: Familiar roster and public archive

Dean 确认可读取今天建立的 AI Familiar 角色，并批准上传到公开 `student-works` 独立游戏目录。核对后新增 Leo 的火龙 Fluffy、Nathan 的壬子·水鼠，共七种选角。两位均支持练习、任务、联机、存档和进化；新增外观是轻量 2D 改编。账号、对话、凭证与钱包不随游戏复制。20 项引擎/服务器检查、两档案的选角/保存/技能/联机同步检查通过，实体 iPad 验收待进行。旧的“Fluffy 等待参考”记录现已被本段取代。

Dean authorized referencing today's Familiar characters and publishing this game in a separate directory of the public `student-works` repository. Leo's fire dragon Fluffy and Nathan's Water Rat join the roster, bringing it to seven choices. Both support solo play, multiplayer, saves and evolution with lightweight 2D adaptations. Accounts, conversations, credentials and wallets are not copied. Twenty engine/server checks and two-profile selection/persistence/special/multiplayer checks passed; physical iPad acceptance remains pending. This supersedes the earlier pending-Fluffy note.

补充 [使魔接入说明](FAMILIARS.zh-en.md)、[100 AUD 预算口径](BUDGET-NEXT.zh-en.md)，并修复 GitHub Pages 子目录下的页面链接与离线缓存。公开演示提供单人练习和任务；联机仍使用家庭电脑的共享地址。测评表继续默认“未测试 / 待验收”。

Added [Familiar integration notes](FAMILIARS.zh-en.md), [the 100 AUD budget analysis](BUDGET-NEXT.zh-en.md), and subdirectory-compatible links/offline caching. The public preview supports solo practice/quests; multiplayer uses the computer-hosted shared link. Review fields still default to untested/pending.

## 从创意到第一轮 / From idea to the first round

孩子提出野兽格斗、飞行和超能力；Dean 帮助明确胜负目标、2D、iPad 与电脑服务器。Astra 将这些选择做成可开始、操作、判断结果、重玩的一轮游戏：双人对战和王冠目标争夺。初版的五分钟说明与十分钟制作记录保留在 SESSION.md。

The children proposed beast battles, flight, and superpowers. Dean clarified victory rules, 2D presentation, iPads, and a computer host. Astra implemented one playable round with a beginning, controls, result, and replay: two-player battle and Crown Hunt. SESSION.md preserves the original five-minute specification and ten-minute prototype record.

## 联机与课堂反馈 / Connectivity and classroom feedback

网络路线从同 Wi-Fi 明确为两台 iPad 使用 Tailscale。Astra 补充连接恢复、暂停、重开与断开处理。后续课堂反馈提到喜欢飞行和俯冲，同时报告卡顿。记录并未确认当时玩的具体对比版本，也未证明问题由网络引起。工程测试和孩子真实验收分开记录。

The connection requirement changed from same-Wi-Fi access to two iPads using Tailscale. Astra added recovery, pause, replay, and disconnect handling. Later classroom feedback praised flight and swooping and reported lag. The record does not identify the comparison build played or establish the network as the cause. Engineering checks are separate from child acceptance.

## Evolve 课后升级 / Evolve after-class upgrade

| 采用的方向 / Adopted direction | 实际实现 / Implementation |
| --- | --- |
| 更多玩家 / More players | 两至三人联机；第四人旁观 / Two-to-three players; fourth connection spectates |
| 角色与动作 / Characters and moves | 五种角色、双兽组合、特殊技能、蹲下格挡 / Five beasts, paired combo, signature powers, crouch/block |
| 大厅与练习 / Lobby and practice | 三个背景、目标练习、AI 单人任务 / Three backgrounds, target practice, AI quest |
| 科技与成长 / Technology and progression | 武器、护甲、工具、永久升级与四阶形态 / Weapons, armor, tools, permanent upgrades and four forms |
| 离线收益 / Offline earnings | 实际完成练习或任务才获得宝石、经验、能量；没有离开时长奖励 / Earn gems, XP and energy by completing play; no time-away grants |
| 流畅度 / Smoothness | 缓存画面、减少特效、限制 UI 更新、移动平滑与有限预测 / Cached artwork, reduced effects, throttled UI, smoothing and bounded prediction |
| 角色外观 / Character appearance | 更有层次的风格化 2D 角色；真实感仍待孩子评估 / More dimensional stylized 2D art; visual preference awaits feedback |

Fluffy 等待 Dean 提供参考，未虚构外观。具体名称、伤害、冷却、价格、奖励和升级门槛由 Astra 补齐，不冒充孩子的逐项决定。

Fluffy awaits Dean's reference; its appearance was not invented. Astra supplied names, damage, cooldowns, prices, reward amounts, and thresholds as implementation defaults, not individual child decisions.

## 验证与限制 / Verification and limits

20 项引擎/服务器测试通过。浏览器验证了三人同步、双指操作、五轮练习收益、购买、进化、刷新保存和 HTTPS 缓存后的完全离线重开；另完成一轮 AI 任务。桌面五秒采样约 60 FPS（中位帧间隔 16.7ms）。**这不是实体 iPad 验收，也不是卡顿已彻底修复的证据。** 详见 [QA-EVOLVED.md](QA-EVOLVED.md)。

Twenty engine/server checks passed. Browser checks covered three-player synchronization, multitouch, five earned practice rounds, purchases, evolution, persistent saves, and complete offline reopening after HTTPS caching. An AI quest was also completed. A five-second desktop sample was about 60 FPS, with 16.7ms median frame interval. **These are not physical-iPad acceptance results or proof that all lag is resolved.** See [QA-EVOLVED.md](QA-EVOLVED.md).

## 本次归档与下一轮 / Archiving and the next round

新增中英双语日志、可复核用量报告、GitHub 问题模板和试玩测评表。游戏大厅常驻测评入口；表单按设备、网络、九项检查、玩家反馈、一个待改问题和老师决定组织。草稿本机自动保存，可导出 Markdown/JSON；新一轮保留旧草稿。默认均为未测试/待验收，不能自动升级为通过。

This pass adds bilingual logs, an auditable usage report, a GitHub issue template, and a playtest form. The lobby exposes a persistent review entry. The form records device/network, nine checks, player feedback, one issue, and the teacher's decision. Drafts save locally and export to Markdown/JSON; new rounds preserve earlier drafts. Defaults remain Not tested/Pending.

下一轮先做一个实体 iPad 对战，记录一项可复现问题，再由 Dean 确认修改目标、时间和预算。预算核算与未能获取的真实扣款见 [COST-REPORT.zh-en.md](COST-REPORT.zh-en.md)。

Next time, complete one physical-iPad round, record one reproducible issue, and have Dean confirm the change, time, and budget. See [COST-REPORT.zh-en.md](COST-REPORT.zh-en.md) for usage and the unavailable actual charge.
