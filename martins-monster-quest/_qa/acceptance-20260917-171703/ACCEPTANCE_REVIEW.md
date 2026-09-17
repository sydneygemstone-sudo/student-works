# Martin's Monster Quest — 独立验收报告
日期：2026-09-17，Sydney；被验收项目：`/Users/gemstone/dev/martins-monster-quest`。
结论：核心玩法通过；本轮完整验收状态为 CHANGES_REQUESTED。保留成果，只修复下述三个问题后回归，不重做、不扩功能。
## 已实测通过
| 项目 | 证据 |
|---|---|
| 启动与选择 | HTTP 200；从标题、人物/初始伙伴选择、剧情进入地图；Chromium 与 WebKit 均完成启动。 |
| 移动与遇敌 | 真实键盘操作走到 (5,11)，触发 Leafbit 战斗；WebKit 方向键按住事件使角色从 (10,16) 到 (10,14)。 |
| 攻击反馈 | 敌方 HP 从24降到12；实际出现 -12 飘字和受击 shake 类；见04-attack-feedback.png。 |
| 捕捉与治疗 | 捕获 Leafbit，队伍增至2只；走进治疗区域后两只伙伴分别恢复29/29和24/24 HP。 |
| 训练与胜利 | 击败 Aquapup 和 Leafbit，将 Flameling 练到3级45HP/17攻击；正常攻击击败65HP的Stormjaw；出现 MARTIN WINS 并可重新开始。 |
| 挑战与失败 | 新局1级伙伴、不改随机数，绕过野怪直奔首领后失败；出现失败页；点击复活后恢复29/29HP并回到地图。 |
| iPad尺寸 | WebKit 26.0，触屏配置，1024×768横屏和768×1024竖屏；启动、选项点击、方向事件及布局检查通过；不等于实体iPad验收。 |
## 必须修复的三个问题
**P1 — 剧情页越界输入导致运行异常。** 进入剧情但不要点 LET'S EXPLORE；键盘依次左3、上3、左2、上2。角色仍会在剧情后移动并碰到Leafbit。实测 state=BATTLE、party.length=0、剧情仍显示，并报 `Cannot read properties of undefined (reading 'hp')`。`loop`在STORY状态执行地图更新，战斗缺少队伍就绪检查。见10-story-input-bug.png。
**P1 — 换宠允许派出0HP伙伴。** 在独立测试页建立“当前宠物存活、第二只Leafbit为0HP”的边界夹具，再通过真实SWITCH按钮操作，实测 activeIndex=1、activeHP=0、提示 Sent out Leafbit。应只在存活且非当前伙伴中选择；无候选时禁用按钮且不消耗回合。见07-fainted-switch.png。
**P2 — 触控取消后方向键粘住。** WebKit中发送touchstart再touchcancel，实测 game.keys.ArrowUp仍为true。需在touchcancel、失焦及页面隐藏时清除按键；回归正常按住/松开行为。
## 测试边界与不能冒充已完成的事项
主线通关固定Math.random=0.5以便复现；使用真实UI、键盘和原始计时，没有注入血量、攻击力、等级或胜利状态。独立失败测试使用自然随机。换宠检查使用明确构造的浏览器内存夹具；触控取消用事件模拟。
正常主线及WebKit启动路径未捕获JS异常；剧情边界路径确实捕获异常，不能声称全流程零错误。没有实体iPad网络/扬声器实测，没有全面压力测试。
刷新后实测回到TITLE且party为空：没有持久存档。升级已实现；独立形态进化未在本轮确认。两项不擅自加入本次小修范围。未取得AGY计费回执，2 AUD实际开销未核验；也不能仅凭文件修改时间证明完整开发耗时。
## 版本与证据
本次game.js SHA256：`9afd5937f0dbe5dd258038f6e1b4eeb7e7157182ed2b1205d3845c18f9912d6b`。
index.html SHA256：`16061a8d84d0f3f5e33b4f04f53ed2c43674c3e94b8ae5ef2946605b9da2e950`；style.css SHA256：`1df24235acc46dba41dea77c7e38b6a44aa60bc7ab1e613341dccf62e3171f67`。
完整结构化记录：同目录`results.json`；截图：01至10的PNG；最小返工要求：`AGY_FIX_BRIEF.md`。验收未修改游戏源文件或README，也未启动开发Worker。
运行入口：Mac本机`http://127.0.0.1:8888/`。同Wi-Fi候选入口`http://192.168.1.108:8888/`，后者未从实体iPad验证；README的8080仅为另起服务器的示例，不是本次发现的运行端口。
