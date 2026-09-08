# 小动物回家 · Naomi 课堂升级版

本目录是 Codex 独立课堂开发副本，来源为 Naomi 于2026-08-25提出需求的合作桌游。原始作品 `/Users/gemstone/student-works/naomi-pet-rescue/` 保持不变。源文件指纹见 `SOURCE-BASELINE.json`，本次需求与共享接口见 `BRIEF.md`。

## 在家在线玩

[打开 GitHub 在线试玩版](https://sydneygemstone-sudo.github.io/student-works/naomi-pet-rescue/) · [GitHub 备份仓库](https://github.com/sydneygemstone-sudo/student-works/tree/main/naomi-pet-rescue)

## 本地试玩

在浏览器打开 `http://127.0.0.1:18784/`。独立静态服务仅绑定本机，不上传玩家信息，没有账号、数据库或远程模型请求。

如果服务已退出，可运行：

```sh
python3 -m http.server 18784 --bind 127.0.0.1 --directory '/Users/gemstone/Gemstone Kingdom Codex/classroom/naomi-pet-rescue'
```

若端口已被占用，先核对占用者，不停止其他项目的进程。游戏使用同目录脚本和内置资源，也可以在普通浏览器中直接打开 `index.html`。

## 课堂合作玩法

小熊每回合两步、可抱两只；小兔每回合三步、可抱一只。移动到动物处自动抱起，返回中心家园送回。走完步数自动换人，也可以主动结束回合。

新增：石头需绕路，森林消耗2步；礼盒可能给2勇气，也可能使你下次暂停一回合。最多两处绳网开局就标在空森林里，可以绕开；无庇护时花3步进入并拆网，有庇护时花2步并消耗1层盾，拆后不再触发。没有周期空降绳网。

送回每只动物或打开勇气礼盒获得2勇气。获得奖励或轮到队员时，自动用2勇气给当前队员增加2步，每回合一次；不用点加步按钮。多余勇气全部保留，六个圆点仅作显示，旁边数字表示真实剩余量。在家花1步可增加一层庇护，最多2层，抵挡一次雷雨或森林绳网。

默认暴风雨28回合。完整规则与真实验证边界见 `DELIVERY.md`，机器回执见 `evidence/verification.json`。本次修复20项规则用例通过；浏览器实际验证两位队员救回奖励自动加步和森林网拆除。发布前已用修复版实际点击完整通关：救回8只，余5回合；儿童难度与趣味仍需更多试玩。
