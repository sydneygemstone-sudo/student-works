# Classroom version viewer / 课堂原版试玩器

Open:
- `viewer.html?model=glm`
- `viewer.html?model=claude`
- `viewer.html?model=codex-astra`

The viewer fetches the immutable classroom ZIP archives already committed under `../archive/` and unpacks them in the browser. It does not create a second source of truth.

试玩器直接读取 GitHub 中已经冻结的课堂原版 ZIP。GLM 与 Claude 原版只有键盘控制，因此外层提供 iPad 方向与跳跃按钮；这些按钮不修改原作源码，也不计入原模型作品评分。Codex Astra 冻结原版本身已有触屏控制。

JSZip is loaded from jsDelivr only by this comparison viewer; the production family release remains self-contained.
