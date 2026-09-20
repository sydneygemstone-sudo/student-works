# 工程检查记录 / Engineering check record

**Release 1.1.0 · 2026-09-20 · 47 passed / 0 failed**

本记录描述实际完成的工程检查，不代替 Michael 的游戏评测，也不代表已在实体 iPad 上通过验收。
This record describes completed engineering checks. It does not replace Michael's review or claim acceptance on a physical iPad.

## 环境 / Environment
Windows 上的 Chrome 153.0.8010.48，Playwright 驱动正常浏览器启动。桌面视口 1440×900；触屏模拟 1180×820；手机视口 390×844 和 844×390。未进行真实 Safari、真实 WebKit 或实体 iPad 测试。
Chrome 153.0.8010.48 on Windows, launched normally through Playwright. Desktop viewport: 1440×900. Touch simulation: 1180×820. Phone viewports: 390×844 and 844×390. No physical-iPad, Safari or WebKit test is claimed.

## 已通过 / Passed
| 范围 / Area | 实际证据 / Evidence |
|---|---|
| 启动与脚本 / Startup | 游戏初始化成功，开始按钮可用；全程没有 JavaScript 页面错误 / Successful initialization and usable Start button; no JavaScript page errors |
| 主循环 / Core loop | 自动玩家只使用移动与跳跃，收集 12 颗水晶并通过出口；这项通关没有使用传送或改分 / Movement-and-jump-only automated agent collected all 12 crystals and exited, without teleporting or changing its score |
| 胜负规则 / Outcomes | 被抓、掉落、超时、未集齐水晶不能通关、重开复位 / Caught, fall, timeout, quota-gated exit and complete reset |
| 速度参数 / Speed | 玩家 8.8，敌人速度上限仍为 8.5；其余追逐公式未为本次提速另行调慢 / Player 8.8; enemy cap remains 8.5, with no separate chase slowdown |
| 暂停 / Pause | 时间与敌人冻结；暂停时触屏操作层隐藏；继续可操作 / Time and enemies freeze; touch layer hides while paused; resume works |
| 多指触控 / Multi-touch | 通过浏览器触摸事件同时操作左摇杆和右跳跃，玩家既前进也起跳 / Browser touch events operate stick and jump simultaneously; player moves and jumps |
| 输入取消 / Cancellation | touchCancel、离开焦点后输入清空，游戏暂停，不残留方向 / Touch cancellation and blur clear input and prevent stuck movement |
| 双语 / Bilingual | 游戏菜单、辅助标签、暂停和结果；总 HUB、独立 HUB、家长页、测评页均能切换；无缺失翻译键或替换乱码 / Game menu, accessible labels, pause, results and all four public pages translate without missing keys or replacement characters |
| 屏幕适配 / Layout | 两种手机方向均无页面横向溢出，继续按钮在可访问范围 / No document horizontal overflow in either phone orientation; Resume is reachable |
| 测评草稿 / Review draft | 草稿刷新后保留；清除能删除；明确提示未发送 / Draft persists on reload, can be cleared, and explicitly says it has not been sent |
| 运行资源 / Runtime resources | 游戏没有请求外部引擎、字体或素材；普通网址不暴露 QA 改状态接口 / No external game engine/font/asset requests; normal URL exposes no QA state-mutation interface |

详细机器回执：[qa/checks.json](../qa/checks.json)。可复用脚本：[qa/check.cjs](../qa/check.cjs)。
Machine-readable receipt: [qa/checks.json](../qa/checks.json). Reusable test: [qa/check.cjs](../qa/check.cjs).

## 修复后才发布 / Fixed before publication
单 HTML 打包时，字符串替换曾错误解释压缩代码中的美元符号替换模式；已改用回调插入，并重新执行启动与完整检查。暂停时触控层曾仍显示；已修复，并验证不会遮挡暂停操作。
Single-HTML packaging initially interpreted dollar replacement patterns in minified code. Callback insertion fixes this; startup and the complete suite were rerun. The gameplay touch layer also remained visible during pause; this was fixed and retested.

## 不夸大的结论 / Limits of the result
自动通关使用确定性几何和固定物理步进，是“关卡可完成”的工程证据，不是孩子完成速度、难度评分或真实设备帧率。规则边界测试使用 QA 接口构造失败场景，不冒充全部由真人操作。网页的五分钟是上限，不保证每局需要玩满五分钟。
The deterministic automated route is evidence that the level can be completed, not a child's completion time, difficulty rating or real-device frame rate. Boundary checks use the QA interface to construct failure cases; they are not all human-played runs. Five minutes is a time limit, not a promised minimum play duration.

实体 iPad 上仍需确认：摇杆与跳跃手感、提速后会不会冲过头、不同机型性能、横竖屏使用体验。Michael 的本轮任务是给出一条具体反馈，而不是必须通关。
A physical iPad still needs review for control feel, speed-related overshooting, device performance and orientation experience. Michael's task is to give one specific observation, not necessarily to win.

本次测试脚本的浏览器和临时 HTTP 服务均已关闭；这里只声明该脚本的资源回收，不涵盖其他机器或历史课堂服务。
The test script closed its browser and temporary HTTP server. This statement does not cover other machines or historical classroom services.

## 复现 / Reproduce
在作品目录运行 `npm ci`，再运行 `npm run build`。测试需要独立安装 Playwright 与 Chrome，然后运行 `node qa/check.cjs`；也可通过 `PLAYWRIGHT_MODULE` 指定已安装的 Playwright 路径。测试时不要修改其他学生项目的依赖。
From the game directory, run `npm ci`, then `npm run build`. Testing needs a separate Playwright installation and Chrome; run `node qa/check.cjs`, or set `PLAYWRIGHT_MODULE` to an existing installation. Do not alter another student's dependencies to run these checks.
