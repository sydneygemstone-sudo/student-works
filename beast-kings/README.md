# Beast Kings · Nathan + Leo

**Beast Kings** 是 Nathan 与 Leo 的课堂游戏设计与 Human ↔ Agent 迭代项目。主入口现为完整的双语作品档案馆，而不是只指向单一最新版。

**Public hub / 全版本体验中心**  
https://sydneygemstone-sudo.github.io/student-works/beast-kings/

档案馆包含：

- 初版规则的 GitHub Pages 单机重现，以及原始多人服务器源码；
- Astra Legends 重资迭代版：七种 Beast、42 个不同招式、Fluffy / Water Rat 原始使魔图集、成长、任务和三人联机源码；
- GLM-5.3 独立升级版，保留自己的变更、测试和模型执行记录；
- GPT-5.6 Sol 最新版：2.5D 战斗、合作 Boss、Energy 强化，以及单人 Roguelike **Beast King Gauntlet**；
- 通关后按 Game ID / 角色生成 Beast King 奖状；
- 中英双语开发日志、Agent/模型投入记录与人工替代成本场景；
- iPad 试玩测评表，可本机保存草稿、导出 Word/HTML/JSON 或通过系统邮件 App 发送；
- 家长学习与产品化报告。

## Evidence / 证据

历史工程记录仍保留在项目根目录：

- [Legends update / Legends 升级](LEGENDS.zh-en.md)
- [Bilingual changelog / 双语开发日志](CHANGELOG.zh-en.md)
- [Usage reference / 成本与用量参考](COST-REPORT.zh-en.md)
- [Familiar provenance / 使魔来源说明](FAMILIARS.zh-en.md)
- [Classroom upgrade brief / 课堂升级 Brief](UPGRADE-BRIEF-20260919.md)
- [V4 implementation notes / V4 实施记录](V4-IMPLEMENTATION-NOTES.md)
- [GLM-5.3 upgrade notes / GLM 升级记录](GLM53-UPGRADE-NOTES.md)

自动化测试、桌面浏览器和模拟 iPad **不等于**实体 iPad 与孩子的最终验收。试玩反馈中会明确区分“工程验证”和“Nathan / Leo 实际体验”。

## Multiplayer / 多人联机

GitHub Pages 负责静态档案和单机模式。需要实时多人时，使用相应版本目录的 Node.js server，并通过受控局域网 / Tailscale 地址访问。公开仓库不包含私有网络地址、凭证、聊天记录或 AI Familiar 账号数据。
