# Victory vs Alex · 拳击

一句话介绍：一次性AI交付的2D拳击对战游戏，Victory"铁血君主"对Alex"翡翠飓风"，三回合单挑或双人同键盘对打。

## 怎么打开

- **本地离线**：双击 `index.html`（纯本地、无需联网、零依赖）
- **在线游玩**：https://sydneygemstone-sudo.github.io/student-works/victory-vs-alex-boxing/
- **需要实体键盘**（支持同步按键）；可选手柄（Xbox/PlayStation/Switch兼容）

## 玩法与键位表

### 游戏模式与规则

- **ARCADE（对抗 CPU）**：单人打电脑。选 Victory 电脑自动变 Alex；选 Alex 电脑自动变 Victory。CPU 难度四档：EASY / MEDIUM（默认）/ HARD（CHALLENGER）/ WORLD CHAMPION
- **2-PLAYER LOCAL（本地双人）**：两人共用一个键盘对打（见游戏内说明左右键位分配）
- **比赛时制**：3 回合，每回合 90 秒；败方血量归零为 KO
- **被击倒**：被击倒后进入读秒，狂按按键（MASH）才能爬起来
- **终局结算**：显示双方总伤害与击倒次数，可选直接 REMATCH

### 两位角色

| 角色 | 绰号 | 架势 | 级别 | 超必杀技 |
|---|---|---|---|---|
| **Victory** | "THE IRON SOVEREIGN" | Orthodox（正架） | Heavyweight 215 lbs，臂展 79" | TITAN OVERDRIVE |
| **Alex** | "THE EMERALD HURRICANE" | Southpaw（反架） | Middleweight 175 lbs，臂展 75" | TEMPEST FLURRY |

### 键位表（从代码核实）

| 操作 | 键位 | 说明 |
|---|---|---|
| **移动·左** | A | 向左走 |
| **移动·右** | D | 向右走 |
| **冲刺** | Shift | 快速前进/后退 |
| **刺拳** | J | 快速直拳，能打断对手攻击 |
| **直拳** | K | 中速直拳 |
| **肋下勾拳** | U | 重拳，大量消耗对方体力 |
| **上勾拳** | I | 最高伤害，能将对手打飞 |
| **格挡** | L | 按住吃掉伤害 |
| **闪躲·反击** | Space | 对方出拳时按下触发反击窗口 |
| **超必杀技** | O | 槽满时发动（Victory: TITAN OVERDRIVE / Alex: TEMPEST FLURRY） |
| **暂停/继续** | P 或 Esc | 全局暂停 |
| **静音** | M | 全局静音 |

**双人模式第二玩家键位**：见游戏内说明

## 原始下单指令（一字不改）

```
make a fighting game, Victory vs Alex, boxing fighting.
```
（后追加：快点做出来）

## 制作过程

**日期**：2026-08-17

**完整流程**（共 11 个子智能体，历时约 98 分钟）：
- 3 个建造者并行各造一版 → 每版 2 个评审（技术证伪 + 趣味打分）→ 择优合成 → 终验
- 另有主会话手写的快速版先行交付

**本目录这版**：由 agy（Antigravity CLI）制作，Dean 亲自派单。多文件工程结构：
- `index.html`：游戏主页面、菜单、HUD、胜负判定
- `style.css`：全游戏美术与布局
- `js/` 七模块：
  - `game.js` —— 主游戏引擎与比赛流程
  - `fighters_data.js` —— 角色资料与招式数据
  - `fighter.js` —— 拳手状态机
  - `ai.js` —— 电脑对手决策
  - `ring.js` —— 拳台与碰撞系统
  - `particles.js` —— 打击特效与粒子
  - `audio.js` —— 音效管理

## 预算

**制作成本**（API 牌价等价，实际走 Claude Code 订阅、零额外现金支出）：

全程约 **US$150–190 ≈ A$230–290**

- 输出：约 39–114 万 token
- 缓存读：约 5,900 万 token
- 牌价：Fable 5 $10/$50 每百万 token（输入/输出）
- 汇率：1 USD ≈ 1.52 AUD

此为 2026-08-17 全程的总口径，未单独拆分本 agy 版的份额。

## 六个版本一览

同一句需求、不同 worker/不同侧重，交付了 6 个可对比的版本——本身就是「同样的话，AI 每次答的不一样」的最佳教具。六个版本已全部收录：

| 版本 | worker | 侧重 | 文件 | 在线玩 |
|---|---|---|---|---|
| agy 版 | agy（Antigravity CLI），Dean 亲自派单 | 多文件工程结构 | index.html + style.css + js/ 七模块 | https://sydneygemstone-sudo.github.io/student-works/victory-vs-alex-boxing/ |
| 快速版 | Claude Fable 5 主会话 | 最快交付（约 15 分钟） | versions/quick.html | https://sydneygemstone-sudo.github.io/student-works/victory-vs-alex-boxing/versions/quick.html |
| 手感版 | Fable 5 子智能体（juice） | 打击手感与特效 | versions/juice.html | https://sydneygemstone-sudo.github.io/student-works/victory-vs-alex-boxing/versions/juice.html |
| 深度版 | Fable 5 子智能体（depth） | CPU 对手智能与策略深度 | versions/depth.html | https://sydneygemstone-sudo.github.io/student-works/victory-vs-alex-boxing/versions/depth.html |
| 萌系版 | Fable 5 子智能体（charm） | 萌系画风与儿童友好（评审综合分第一） | versions/charm.html | https://sydneygemstone-sudo.github.io/student-works/victory-vs-alex-boxing/versions/charm.html |
| 合成版 PUNCH PALS! | Fable 5 合成智能体 | 以萌系版为底融合各版优点 | versions/fusion.html | https://sydneygemstone-sudo.github.io/student-works/victory-vs-alex-boxing/versions/fusion.html |
