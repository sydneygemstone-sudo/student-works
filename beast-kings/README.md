# Beast Kings · Nathan & Leo

2D 野兽格斗合作作品 / A cooperative creation: a 2D beast fighting game.

[单人试玩 / Solo preview](https://sydneygemstone-sudo.github.io/student-works/beast-kings/builds/astra-evolved/) · [结构化测评 / Structured review](https://sydneygemstone-sudo.github.io/student-works/beast-kings/builds/astra-evolved/review.html)

可选七种角色，包括 Leo 的火龙 Fluffy 和 Nathan 的壬子·水鼠。支持飞行、俯冲、瞬移、格挡、技能、练习任务、宝石升级、科技装备与进化。角色图像为轻量 2D 改编；游戏与 AI Familiar 账号成长独立。

Seven selectable characters include Leo's Fluffy fire dragon and Nathan's Water Rat. Fly, swoop, blink, block, use specials, complete practice/quests, and earn gems for gear and evolution. Artwork is a lightweight 2D adaptation; progression is independent of AI Familiar accounts.

## 联机 / Multiplayer

GitHub Pages 只能提供单人试玩。两至三人联机由家庭电脑运行 Node 服务，所有设备通过自己的 Tailscale 游戏地址进入。示例地址仅为占位；没有公开家庭网络地址。

GitHub Pages serves the solo preview. For two-to-three-player multiplayer, run the Node server on your computer and open its shared Tailscale address on every device. Addresses in this archive are placeholders.

```sh
cd builds/astra-evolved
npm ci
npm start
```

The local game opens at http://localhost:8765. For HTTPS/offline installation, configure your own Tailscale Serve route to this port. Keep the host online for multiplayer. Saves are local to the device/browser/address; switching from the private host to this preview creates a separate save.

离线收益来自实际完成练习和任务，没有挂机收入、付费购买或真实货币奖励。 / Offline earnings come from completed play, with no idle income, purchases or real-money rewards.

## 日志与下次迭代 / Logs and next iteration

- [双语开发日志 / Bilingual development log](CHANGELOG.zh-en.md)
- [已用预算口径 / Cost reconciliation](COST-REPORT.zh-en.md)
- [100 AUD 与周额度 / Next-budget analysis](BUDGET-NEXT.zh-en.md)
- [使魔角色说明 / Familiar characters](FAMILIARS.zh-en.md)
- [结构化测评模板 / Playtest template](PLAYTEST.zh-en.md)
- [工程验证及限制 / Engineering checks and limits](QA-EVOLVED.md)

下次先玩一轮，再填测评：设备和网络、九项通过/失败/未测、一个问题的复现步骤、预期与实际、优先级、老师验收决定。表单自动保存在设备，可导出 Markdown/JSON，不会自动上传。没有代填孩子评价。

Play one round, then record devices/network, nine pass/fail/untested checks, one issue with reproduction steps and expected/actual behavior, priority and teacher acceptance. The form saves locally and exports Markdown/JSON without automatic upload. Child feedback is never prefilled.

20 engine/server checks, two-profile Familiar browser checks and seven review-form checks passed. Physical iPad acceptance remains pending. Run engine checks with `node --test server-tests.js` inside the evolved build.

Original `builds/astra` and `builds/antigravity` sources are preserved for comparison. Dependencies, runtime logs, account data, private host addresses and raw classroom/session recordings are excluded.
