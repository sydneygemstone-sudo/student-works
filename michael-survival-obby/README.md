# Michael · Crystal Escape / 水晶逃生

**作品 HUB / Project hub:** https://sydneygemstone-sudo.github.io/student-works/michael-survival-obby/

**直接玩 / Play:** https://sydneygemstone-sudo.github.io/student-works/michael-survival-obby/play.html

课后版 1.1.0，基于 Michael 的想法与最后试玩反馈。固定 3D 跑酷路线，收集至少 8/12 颗水晶并在 300 秒内抵达出口。触屏左摇杆 + 右跳跃，电脑 WASD/方向键 + 空格，支持暂停、重玩、中英文和明暗场景切换。
After-class 1.1.0, based on Michael's idea and final classroom review. Follow a fixed 3D route, collect at least 8 of 12 crystals and reach the exit within 300 seconds. Left stick + right jump on touch, WASD/arrows + Space on computers, with pause, restart, Chinese/English and lighting modes.

`index.html`: 项目展示 / project hub; `play.html`: 自包含游戏 / standalone game; `parents.html`: 家长指南 / parent guide; `review.html`: 本机反馈草稿 / local review draft.

`npm ci && npm run build` 重建 / rebuilds `play.html`. `source/vendor/LICENSE` 保留 / retains Three.js's MIT license. Game assets are generated in code; no remote runtime resources.

详细文档 / Documents: [需求 / Spec](docs/DEVELOPMENT_SPEC.md), [合并 / Merge](docs/MERGE_RECORD.md), [版本记录 / Changelog](docs/CHANGELOG.md), [检查 / Checks](docs/ENGINEERING_CHECKS.md).

原版文件与 SHA-256 在 `archive/`。原版可能不支持触屏和完整双语；推荐玩课后版。详细课堂评估仅在教师私有资料中，不包含于本公开仓库。
Unchanged originals and SHA-256 values are in `archive/`. Originals may lack touch support or full bilingual UI; use the after-class release. Detailed classroom assessment is held privately, outside this public repository.
