# Trio World online R2 — R6 multiplayer and completion reviews

Revision: `trio-online-r2-reviews-20260925`.

Canonical project HUB: https://sydneygemstone-sudo.github.io/student-works/adventure-world/hub/

Multiplayer entrance: https://trio-world-opus.sydney-gemstone-games.workers.dev/

Room review dashboard: https://sydneygemstone-sudo.github.io/student-works/adventure-world/hub/online-reviews.html

## 使用说明 / How to play

一人创建房间，系统生成**六位数字**（包括可能的前导零）；私下把房间码或游戏邀请发给另外两位伙伴。大家输入同一个房间码和昵称进入。**每个房间最多3名玩家**，服务器会拒绝第四位；同一玩家不能在两个标签页同时占用身份。查看测评的老师不占游戏人数。

One player creates a room and shares its **six numeric digits** or game-invite link privately with two friends. Each player enters the same code and a nickname. **Maximum 3 players per room**, enforced by the server; duplicate use of a player in two tabs is rejected. Review viewers do not occupy player slots.

三名玩家身份在该房间中保留，断线后用原浏览器重新进入会恢复自己的身份、物品和任务。清理浏览器数据或更换设备后，不能只输入相同昵称就认领旧身份；需要原浏览器，或另建房间。六位数字不是个人恢复凭证，也不是测评全文的访问密码。

The three member identities remain reserved in that room. Rejoining in the original browser restores identity, inventory and task progress. Clearing browser data or using another device does not allow a player to claim an existing identity by name; use the original browser or create a new room. Six digits alone are neither a player-resume credential nor review-reading permission.

## 真正的14个任务 / Fourteen actual tasks

1. 大厅喷泉 / Reach the plaza fountain.
2. 主题乐园 / Enter the theme park.
3. 超级跳 / Use the super jump.
4. 飞行 / Use flight.
5. 三颗星星 / Collect three stars.
6. 野外生存区 / Enter the wilderness.
7. 三个水果 / Pick three fruits.
8. 两根木头 / Collect two wood.
9. 点火或烤火 / Light or enjoy the campfire.
10. 农场 / Enter the farm.
11. 喂养两次 / Feed animals twice.
12. 两个农产品 / Collect two animal products.
13. 共同完成五阶段小屋 / Complete the shared five-stage cabin.
14. **回大厅喷泉互动庆祝** / **Return to the fountain and interact to celebrate**.

原版最后一项只是自由玩耍提示，没有完成条件；本轮为第14项加入真实完成事件。每人独立记录任务完成情况，共享小屋等世界状态仍由房间共同维护。通关后自动打开完整测评表，也可关闭后继续玩，再从左侧“测评”进入。

The old final item was a free-play message without a completion condition. R2 adds a real final celebration event. Completion is recorded per player while shared world state, such as the cabin, remains shared. The full review automatically opens at completion and can be reopened from the left toolbar.

## 完整测评 / Complete review

设备、浏览器和方向；七项1–5分体验评分；难度与是否愿意重玩；最喜欢的部分和理由；改进建议；工程知识与结构化表达复盘；Bug严重程度、操作步骤、预期和实际。评分评价作品，不评价孩子。

Device/browser/orientation; seven 1–5 experience ratings; difficulty and replay intent; favourite part and reason; improvement; engineering and structured-expression reflections; bug severity, reproduction steps, expected and actual results. Ratings evaluate the work, not the child.

草稿仅在本机保存。提交时服务器校验14任务完成情况和必填字段，防止重复提交生成重复记录；后续修改保留版本号。提交结果保存在 Cloudflare Durable Objects，不写入公开 GitHub，不自动发邮件。R2测评没有设置自动清理期限；如需删除，请联系老师处理，不把旧版七天世界清理规则用于新测评。

Drafts remain local. The server validates completion and required fields, deduplicates repeat submissions and tracks revisions. Submitted reviews persist in Cloudflare Durable Objects, not public GitHub or email. No automatic review-expiry policy is configured for R2; request removal through the teacher. The legacy world’s seven-day cleanup rule does not apply to new reviews.

## HUB 动态状态 / Live HUB status

作品首页新增联机入口、说明与“房间测评状态”。同一浏览器显示最近房间的简要情况；详情页在可见时每5秒更新玩家在线状态、0–14任务进度、进行中／通关待填写／已提交、平均分及具体反馈。首页摘要每10秒更新。老师或另一台设备使用私下分享的“测评查看链接”，不需要占据玩家名额。

The work HUB retains its R6 layout and solo editions, adding multiplayer, instructions and Room review status. Recent-room summaries refresh every 10 seconds; the visible detail page refreshes every 5 seconds with online state, 0–14 progress, playing/awaiting/submitted status, averages and complete answers. Teachers or another device use a privately shared review-view link without joining the game.

查看链接持有者可以阅读本房间完整测评。不要公开分享；不填写姓氏、联系方式、地址或其他私密信息。查看权限存于链接片段和浏览器存储，不放在服务端查询参数中。加入游戏和读取测评使用不同的访问机制；不能仅凭六位数字读取测评全文。

Anyone holding the review-view link can read this room’s full reviews. Share privately and omit surnames, contact details, addresses and other private information. The capability is carried in the link fragment/local storage rather than server query parameters. Joining play and reading reviews use separate access mechanisms; six digits alone cannot read review details.

## Engineering and acceptance

The existing `ROOMS` Durable Object namespace and class name `TrioRoom` are preserved. `worker-r1.mjs` retains original legacy 24-hex room handling. New numeric codes map to collision-checked, separate room identities. Shared state, member progress and submitted reviews persist; the original LAN source and R6 solo builds are untouched.

Build: `python3 scripts/trio-online/build.py` followed by `python3 scripts/trio-online/fixes.py`. Deploy the three resulting modules (`worker.mjs`, `worker-r1.mjs`, `review-schema.mjs`) together, retaining existing bindings. The module fingerprint tested locally is recorded in the deployment receipt. Do not deploy the raw generator input in place of the generated Worker.

The isolated acceptance scenario uses three synthetic clients and simulates movement through the normal position/action protocol. It completes all14 tasks, validates submission gating and idempotency, exercises touch-enabled browser form submission and live dashboard updates, and restarts the local Worker runtime to verify persistence. This is not a physical-iPad, complete human playthrough or certified anti-cheat claim.

The live acceptance uses a new synthetic QA room only; it does not access student rooms or restart production. Refer to the separately recorded CI runs and deployment/readback results, not older `QA-REPORT.json` as evidence for this revision.
