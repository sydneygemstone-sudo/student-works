# Legends 3.0 · 画面与招式升级 / Art and moves update

2026-09-12 · Nathan + Leo · Astra · Dean 授权串行制作，新增约 35 USD 模型额度上限。 / Serial development authorized by Dean, with an approximately US$35 additional model-equivalent ceiling.

问题：使魔外观与原项目不符，角色招式过于相似。 / Problem: Familiar appearances did not match the source project, and the characters fought too similarly.

## 原使魔造型 / Original Familiar shapes

Fluffy 保留原模型的毛绒圆身、分叉鹿角、短爪、大眼睛与心形魂石；壬子·水鼠保留圆耳、蓝色毛绒圆身、短爪与蓝色魂石。两只均直接使用当前 AI Familiar 模型本地预渲染的 30 帧透明动作图集，在游戏内仅绘制 2D 图片。没有在 iPad 上运行三维模型。

Fluffy keeps the source rig's round fluffy body, branching antlers, short paws, large eyes and heart soulstone. Water Rat keeps the round ears, blue body, paws and blue heart. Each uses 30 transparent pose frames rendered locally from the active AI Familiar rig. The game draws cached 2D images; it does not run a 3D model on the iPad.

其余五种角色重绘为不同轮廓：冰晶狼、熔岩犀牛、森林龟、雷电猞猁和两只小伙伴。三个场景增加石台、刻纹、建筑、树木、水面和光照层次。 / The other five choices have distinct silhouettes: crystal wolf, magma rhino, grove turtle, storm lynx and paired kits. Three arenas gain engraved stone, architecture, trees, reflections and layered lighting.

## 七种打法 / Seven play styles

| 角色 / Beast | 主要区别 / Main difference | U 能力 / Power | O 招牌 / Signature |
| --- | --- | --- | --- |
| Frost | 减速、延迟陷阱 / Slows and delayed traps | Ice lance：穿透两目标 / Pierces two targets | Crystal cage：落点预警后三次冰晶脉冲 / Warned crystal trap |
| Ember | 较慢、重击推开 / Slower, heavy knockback | Lava bomb：抛物线落地爆炸 / Arcing ground explosion | Eruption：依次喷发的三处地面 / Three staggered vents |
| Moss | 长藤、护盾、区域回血 / Vine reach, shields and healing area | Root seed：短暂定身 / Temporary root | Living grove：站在圈内回复，敌人受荆棘伤害 / Hold the grove to heal |
| Volt | 最快移动、三击增伤 / Fast movement, third-claw bonus | Chain bolt：闪电跳到邻近对手 / Jumps between nearby rivals | Afterstrike：前方三道残影依次攻击 / Three delayed forward strikes |
| Pip & Pebble | 延迟补刀、左右夹击 / Echo hits and pincer attacks | Return comet：出去和回来各能命中 / Hits outward and on return | Pincer star：两伙伴合击落点 / Two partners converge |
| Fluffy | 火焰扩散、空中接近 / Fire spread and aerial approach | Dragon breath：四次朝向性扇形龙息 / Four directional cone pulses | Sky dive：跃起后向预警点俯冲 / Leap and dive onto a marker |
| 壬子·水鼠 | 泡泡护盾、水流推开 / Bubble shields and water knockback | Water jet：快速穿透水流 / Fast piercing jet | Bubble prison：困住、浮起、释放爆开 / Capture, float, release and pop |

每只的六个攻击／位移按钮均有独立名称、冷却、形态或效果。选角页的 Move book 解释招数，战斗按钮随角色更新。保留 A/D 移动、Space 飞行、S 蹲下格挡及触屏双指操作。快速轻点会保留到下一次模拟，减少按下和松开恰好落在同一帧时的漏招。

All six attack/escape buttons have character-specific names and behavior, cooldowns or effects. The roster Move book explains them, and combat button labels update with the selected beast. Movement, flight, block and multitouch remain. Short taps are buffered to the next simulation step so a press/release between frames is not lost.

## 验证与验收 / Verification and acceptance

- 21 项既有引擎／服务器回归检查通过。 / 21 engine/server regression checks passed.
- 12 项新增战斗检查覆盖全部 42 招、有限数值、弹道、穿透、预警、回血范围、定身、连锁、回旋二次命中、四段龙息、泡泡释放与暂停。 / 12 combat checks cover all 42 moves, finite state, projectiles, warnings, healing, roots, chaining, returns, breath pulses, bubbles and pause.
- 三个独立浏览器档案互相看见水泡、龙息和残影；暂停冻结技能，重玩清空弹道与区域。 / Three independent browser profiles see each other's bubbles, breath and afterimages; pause freezes and rematch clears combat state.
- 双指移动／飞行及松开、三个 iPad 尺寸的控件、离线重开图集与收益保存通过。 / Multitouch, release, controls at three iPad viewport sizes, offline atlases and earned saves passed.
- 双语测评表新增“使魔还原”项，共十项；草稿、历史、Markdown/JSON 导出和离线填写检查通过。 / The bilingual review now has ten checks including Familiar fidelity; drafts, history, exports and offline edits passed.

工程浏览器为 Windows 上的无头 Edge，不是实体 iPad。首次采样可能包含素材预热和页面切换；后续桌面帧率不能替代 iPad 手感、真实 Tailscale 延迟或三人平衡性验收。奖励浏览器检查使用受控的接近通关状态；不冒充孩子完成了整轮。伤害与冷却是 Astra 的初始平衡值。

Engineering checks use headless Edge on Windows, not a physical iPad. Initial samples may include warming and page transitions. Desktop FPS does not establish iPad responsiveness, real remote Tailscale latency or three-player balance. The browser reward check uses a controlled near-completion state, not a claimed child playthrough. Damage and cooldowns are Astra's initial balance values.

## 下一轮 / Next round

从大厅打开 [结构化测评 / Structured review](builds/astra-legends/review.html)。Leo 先用 Fluffy，Nathan 先用水鼠，各换一只其他角色，完成一轮；记录一个最值得改的问题及复现步骤。测评默认未测试、待老师确认。

Open the review from the lobby. Start with Fluffy and Water Rat, try one other beast each, and complete one round. Record one highest-value problem and how to reproduce it. Checks default to untested and teacher acceptance stays pending.

旧 Evolve 源码保留在 `builds/astra-evolved`。游戏存档键未改变；同一家庭网址会沿用原浏览器进度。公开 GitHub Pages 与家庭网址的存档独立，Pages 提供单人模式，家庭服务提供联机。

The previous Evolve source remains in `builds/astra-evolved`. Save keys are unchanged on the same family URL. Public GitHub Pages has a separate browser save and solo modes; multiplayer runs on the family host.
