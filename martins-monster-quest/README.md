# 🎮 Martin's Monster Quest 3D — 抓宠进化与雷霆决战

> **专为 Martin 打造的高品质 3D 萌宠捕捉与进化对战 RPG！**  
> 包含 3 种 3D 角色选择、14 种高精度原创 3D 怪物、三大连贯生态地貌（翡翠山谷 / 低语峡谷 / 雷鸣之巅）、3D 随行萌宠跟随漫步、经典 3/4 越肩对战运镜、多技能战术决策池、Chapter 1.5 劲敌进化决斗、3D Mega 超级进化、以及双阶段觉醒最终泰坦决战！

---

## 🌐 线上免安装即开即玩 (Online Play for iPad, iPhone & PC)

- **学生作品合集大厅直达（推荐，与所有同学作品并列）:**  
  👉 [https://sydneygemstone-sudo.github.io/student-works/martins-monster-quest/](https://sydneygemstone-sudo.github.io/student-works/martins-monster-quest/)
- **学员作品总入口:**  
  👉 [https://sydneygemstone-sudo.github.io/student-works/](https://sydneygemstone-sudo.github.io/student-works/)
- **独立项目地址:**  
  👉 [https://sydneygemstone-sudo.github.io/martins-monster-quest/](https://sydneygemstone-sudo.github.io/martins-monster-quest/)
- **详细研发档案与迭代日志:**  
  👉 [DEVLOG.md](DEVLOG.md)

*无需安装任何 App 或插件，打开网页即可在 iPad / 电脑上满屏畅玩！*

---

## ⚡ 快速本地离线启动 (Quick Local Launch)

### 方式 1：双击直接打开
双击本目录下的 `index.html`，或者在终端运行：
```bash
open index.html
```
*所有 3D 引擎库与样式已全部本地化，断网环境下亦可 100% 正常游玩。*

### 方式 2：局域网轻量 Web 服务器（同一 Wi-Fi 下的 iPad 访问）
```bash
python3 -m http.server 8888
```
在 iPad Safari 中输入 `http://<你的电脑局域网IP>:8888` 即可通过触屏畅玩。

---

## 🌟 游戏核心系统与玩法特色 (Features)

### 1. 3D 训练师角色与表情互动 (3D Trainers & Live Mood)
- **Martin (马丁):** 标志性红色探险帽与蓝色训练师风衣，勇敢坚定。
- **Sky (天穹):** 苍翠林地头巾与绿色巡林斗篷，大自然守望者。
- **Leo (里奥):** 黄金防风镜与紫金运动卫衣，高科技神兽调查学者。
- 画面左上角带有动态 3D 头像表情 Widget，轻点可让角色做出挥拳鼓励与欢呼动作！

### 2. 三段式完整进化树与 3D MEGA 进化 (3-Stage Evolutions)
三大初始神兽伙伴均拥有完整的 3 阶段成长路径：
- 🔥 **火系分支:** `Flameling` (烈焰幼兽) ➔ `Pyrowhisker` (烈焰灵猫) ➔ `Pyrostryke` (巨翼烈焰龙王 🐲)
- 🌿 **草系分支:** `Leafbit` (叶灵兔) ➔ `Thornhare` (荆棘刺兔) ➔ `Floraknight` (蔷薇圣骑士 🛡️)
- 💧 **水系分支:** `Aquapup` (水灵犬) ➔ `Hydrofang` (激流海兽) ➔ `Leviaking` (深海帝王龙 🌊)
- **3D 实体萌宠同行 (Follower):** 选定的宠物化为实体 3D 模型在训练师身后实时跟随奔跑，靠近按下 **[A]** 键可进行转圈互动；进化后大世界追随模型同步变更为巨型终极形态！

### 3. 三大连贯生态地貌大世界 (Three Connected Biomes)
- **翡翠山谷 (Emerald Valley, Z: 12~0):** 绿色草坪、研究员小屋红瓦房、繁花草甸、以及闪烁着爱心治疗光芒的**生命之泉**（踏入即满血复活）。
- **低语峡谷 (Whispering Gorge, Z: 0~-7.5):** 两侧耸立着险峻岩石峭壁，古代石门拱券处镇守着守门巨灵 **Giga-Golem 🗿**；后方设有劲敌对决擂台。
- **雷鸣之巅 (Thunder Peak, Z: -7.5~-15):** 暗紫黑曜石地面、发光紫水晶高耸石柱，云端浮空祭坛上盘旋着最终泰坦 **Stormjaw ⚡**。

### 4. 经典 3/4 越肩战术对战运镜 (Cinematic 3/4 Perspective)
- 彻底解决平视死板与晃动眩晕问题，采用经典 3D RPG（如《宝可梦传说》）的对角线 3/4 视角。
- **Martin 站在左下前景指挥**，**我方怪兽居中左青色阵法**，**敌方怪兽居中右赤红阵法**。
- 敌我血条 UI 智能避让于左上与右下角，零任何模型遮挡。战斗中镜头绝对刚性锁定，画面清晰稳定。

### 5. 多技能池战术与元素克制 (Move Pools & Elements)
- 点击 `⚔️ FIGHT` 展开技能抽屉，根据等级自由挑选 3 种专属战术招式。
- 涵盖火、草、水、电、岩、龙等多属性克制（克制带来 $1.5\times$ 高伤，$0.7\times$ 微弱）。
- 升级可自选 5 大加护特质（Perks）：陨石暴击、泰坦免伤、吸血反哺、雷霆连击、元素狂怒。

### 6. Chapter 1.5 劲敌决斗与 Chapter 2 双阶段泰坦 BOSS
- 突破守门石怪后，在低语峡谷遭遇劲敌 Sky 的阻拦。击败其二阶宠物后激活远古钥石共鸣，当场爆发 **3D MEGA 超级进化**！
- 决战雷鸣之巅：终极 Boss **Stormjaw** 拥有狂暴双阶段。一阶段空血后触发 **Titan Awakening** 紫雷觉醒并回满生命，释放终极灭世风暴！

---

## 🕹️ 操作方式指南 (Controls)

### 📱 iPad / 平板触屏 (Touch Controls)
- **虚拟十字键 (D-Pad):** 屏幕左下角，滑动或点击控制上下左右走位。
- **点击地面导航:** 触摸 3D 地面任意一点，角色智能朝目标点走去。
- **动作按键:** 
  - 绿色 **[A]** 键：大世界互动、对话确认、对战选中技能。
  - 红色 **[B]** 键：取消、返回上一级菜单、逃跑。
- **界面优化:** 针对 iOS Safari `100dvh` 进行专门布局保护，防止误触 Safari 工具栏。

### 💻 电脑键盘 (Desktop Controls)
- **移动方向:** `W` `A` `S` `D` 或 `↑` `↓` `←` `→` 方向键
- **确认 / 互动 [A]:** `Space` 空格 / `Enter` 回车 / `Z` 键
- **取消 / 撤退 [B]:** `Escape` / `R` 键
- **战斗数字快捷键:**
  - `1`: 展开技能 / 释放第 1 技能
  - `2`: 释放第 2 技能 / 投掷精灵球
  - `3`: 释放第 3 技能 / 切换出战精灵
  - `4`: 退出技能菜单 / 逃跑

---

## 📚 研发历程与档案 (Dev Log)

完整的时间线、对话记录、算法实现细节详见：  
👉 [DEVLOG.md](DEVLOG.md)
