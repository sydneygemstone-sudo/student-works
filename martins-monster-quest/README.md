# 🎮 Martin's Monster Quest 3D — 抓宠进化与雷霆决战

> 专为 Martin 打造的高品质 3D 萌宠捕捉对战 RPG！
> 包含 3D 角色选择、3D 初始神兽、完整冒险剧情、3D 萌宠同行跟随、3D 广袤大世界探险、超进化系统、以及带有 3D 动态运镜与能量法阵的经典回合制对战！

---

## 🌐 线上游玩链接 (Online Play for iPad & PC)

* **直接游玩 (GitHub Pages):** [https://sydneygemstone-sudo.github.io/student-works/martins-monster-quest/](https://sydneygemstone-sudo.github.io/student-works/martins-monster-quest/)
* **独立仓库 (GitHub Repo):** [https://github.com/sydneygemstone-sudo/martins-monster-quest](https://github.com/sydneygemstone-sudo/martins-monster-quest)
* **学生作品主站:** [https://sydneygemstone-sudo.github.io/student-works/](https://sydneygemstone-sudo.github.io/student-works/)

无需安装任何插件，iPad Safari 或任何电脑浏览器打开即可直接游玩！

---

## ⚡ 快速本地启动 (Quick Local Launch)

### 选项 1：直接用浏览器打开
双击 `index.html` 或在终端运行：
```bash
open index.html
```

### 选项 2：局域网 Web 服务器（供同 Wi-Fi 下的 iPad 访问）
```bash
python3 -m http.server 8888
```
在 iPad 浏览器输入 `http://<你的电脑IP>:8888` 即可畅玩。

---

## 🌟 游戏核心特色 (Features)

1. **3D 训练师角色选择 (3D Trainers):**
   * **Martin (马丁):** 佩戴标志性红色探险帽与蓝色训练师外套，勇敢坚毅。
   * **Sky (天穹):** 绿色头巾与森林巡林客战袍，大自然的追踪专家。
   * **Leo (里奥):** 黄金风镜与紫金卫衣，高科技神兽研究学者。
   * 左上角带有实时 3D 旋转角色头像 Widget！

2. **3D 初始神兽伙伴 (3D Starter Pets):**
   * **Flameling 🔥 (烈焰兽):** 高攻击火系幼兽，专属技能：*Flame Spark* (火花击)。
   * **Leafbit 🌿 (叶灵兔):** 高防御自然系灵兔，专属技能：*Leaf Slice* (飞叶切)。
   * **Aquapup 💧 (碧水犬):** 敏捷平衡水系萌犬，专属技能：*Water Pulse* (水之波动)。

3. **3D 同行跟随系统 (Follower Pet System):**
   * 类似宝可梦金银/心金，你选择的神兽伙伴将化为 3D 实体模型，忠实地跟在你的训练师身后一同漫步探索！
   * 靠近神兽按下 **[A]** 键可进行抚摸互动。

4. **3D 广阔生动大世界 (Overworld Exploration):**
   * **研究所与温馨小屋:** 红砖瓦顶与明亮窗棂的探险起点。
   * **石板小径与繁花盛开草甸:** 随风摇曳的花丛与微风粒子。
   * **低语草丛 (Tall Grass):** 潜藏着野生萌宠，踩入草丛触发偶遇！
   * **生命之泉 (Healing Spring):** 碧蓝泉水与爱心光芒粒子，踏入瞬间全队血量拉满！
   * **雷霆峰神圣祭坛 (Stormjaw's Peak):** 北方终极 BOSS 风暴巨颚（Stormjaw ⚡）的决战之地。

5. **3D 动态运镜与对战法阵 (Cinematic 3D Battles):**
   * 切入战斗时自动进入 3D 战场模式：**训练师亲自站在后方指挥台**，身旁是**出战的 3D 萌宠**，脚下踩着发光的**魔法光环基座**！
   * 攻击震屏、镜头推进回弹、暴击特写与捕捉球三次摇晃判定！
   * **超进化 (Mega Evolution) 与神兽加护 (Perks):** 战场中可激发超绝进化，大幅强化攻防与绝招特效。
   * 击败野生怪兽获得经验、升级升维提升上限，收服更强大的团队！

6. **双阶段终极 BOSS (Two-Stage Legendary Showdown):**
   * 面对掌管雷电的风暴巨颚 Stormjaw，击破第一阶段后激发狂暴雷霆二阶段！
   * 获胜后荣登训练大师宝座，赢取专属胜利凯歌！

---

## 🕹️ 操作方式 (Controls)

* **iPad / 平板触屏 (Touch Controls):**
  * **虚拟摇杆十字键 (D-Pad):** 屏幕左下方，触控平滑四向行走。
  * **点击地面移动:** 触摸屏幕任意地面即可智能导航行走。
  * **右侧虚拟按键:** 绿色大按钮 **[A]** 进行互动/确认/攻击，红色按钮 **[B]** 逃跑/取消。
  * **全屏优化:** 针对 iOS Safari 100dvh 与手势缩放进行了深度自适应。
* **电脑键盘 (Desktop):**
  * **移动:** `W` `A` `S` `D` 或 `方向键`
  * **互动 / 确认 / 攻击 [A]:** `Space` 空格 / `Enter` 回车 / `Z` 键
  * **取消 / 撤退 [B]:** `Escape` / `R` 键
  * **快捷对战热键:** `1` (攻击), `2` (捕捉), `3` (换宠), `4` (逃跑)

---

## 🛠️ 技术架构

* **渲染核心:** 纯前端 WebGL (Three.js r128 本地内置，零外部 CDN 依赖，断网也能玩)
* **逻辑控制:** 原生 ES6 JavaScript 无冗余框架，60FPS 高帧率流畅体验
* **音效设计:** Web Audio API 实时合成 8-bit 复古对战音效与治愈音
* **适配平台:** iOS Safari, iPadOS, Chrome, Firefox, Edge, macOS/Windows
