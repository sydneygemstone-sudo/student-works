# 版本记录 / Release notes

## 1.2 Teaching Lab · 2026-09-21
家庭测试后的下一课新增“从体感到可执行需求”难度设计教学实验。标准版 1.1 不替换；新增 `preset=vague-hard` 参数硬调对照：10/12 水晶、180 秒、略低玩家速度、更高重力、更低跳跃力度、减半 Coyote time / Jump buffer、更高追兵压力。此版本故意同时改动多个难度轴，用作“更难不等于更好玩、模糊需求无法诊断因果”的课堂 A/B 反例。新增带来源引用的 HTML 教学页与下一课备课记录；私人家庭聊天截图不进入公开仓库。

Adds a post-home-test difficulty-design teaching lab without replacing the recommended 1.1 build. The `preset=vague-hard` comparison deliberately tightens several axes at once—10/12 crystals, 180 seconds, slightly lower player speed, higher gravity, lower jump force, halved coyote/jump-buffer windows and stronger pursuit—to demonstrate that “harder” is not the same as “more fun,” and that vague requests make causality hard to diagnose. Also adds a cited HTML lesson and next-lesson teaching notes. Private home-chat screenshots are not committed.

## 1.1.0 · 2026-09-20 · 课后版 / After-class edition
三个课堂原型已探查并归档，以 Astra 为底座进行功能整合。玩家从 7.6 提速到 8.8（约 15.8%）；敌人速度不改。添加模拟摇杆、多指跳跃、完整中英文、明暗场景切换、发光路标、跳跃容错、教师私有评估分离、家长展示和本机测评草稿。
Investigated and archived all three classroom prototypes, integrating features into the Astra base. Player speed increases from 7.6 to 8.8 (about 15.8%); enemy speed stays unchanged. Adds an analogue stick, multi-pointer jumping, full Chinese/English, lighting modes, glowing beacons, jump forgiveness, separate private teacher notes, a parent showcase and local review drafts.

学生原话以本课对话为依据；未把教师提示后出现的触屏需求说成学生独立提出。具体数量和速度是工程默认值。原版“已测试”描述仅为历史记录，新版结果单独列出。
Student feedback is based on this lesson's conversation. The teacher-prompted touch requirement is not presented as the child's independent discovery. Counts and speed are implementation defaults. Original test claims are historical; this edition has its own check record.

## 1.0 · 同日课堂原型 / Same-day classroom prototypes
GLM、Claude、Codex Astra 独立实现同一核心 brief；保留三个不变源码快照。
GLM, Claude and Codex Astra independently implemented the core brief; all three unchanged source snapshots are retained.
