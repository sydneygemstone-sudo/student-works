# Beast Kings Showcase · Git Archive Build Log / Git 作品档案构建日志

Date: 2026-09-19  
Branch: `beast-kings-showcase-20260919`

## Goal / 目标

把 Beast Kings 从“一个最新版游戏页面”升级为 Naomi 标准的可公开作品档案：

- 全站中英切换；
- 不覆盖旧版本，Hub 可对比版本演化；
- 真实保留 Astra / GLM-5.3 / GPT-5.6 Sol 的来源；
- 最新版增加单人 Roguelike Beast King 终局；
- 试玩测评可在 iPad 保存为文档或通过邮件 App 发送；
- 家长能看懂开发难度、Human ↔ Agent loop 与产品化路径；
- 开发 Brief、失败、测试、模型用量和人工替代成本全部可查。

## Version provenance / 版本来源

| Hub item | Source |
| --- | --- |
| Original | 2026-09-12 Astra prototype rules; GitHub Pages archive includes a local solo recreation because the original implementation requires its Node/SSE server. Original server source remains preserved. |
| Astra Legends | Existing Legends 3.0 build: seven beasts, 42 move definitions, Familiar atlases, progression, offline solo and multiplayer server. |
| GLM-5.3 | Authentic protected GLM-5.3 Codex run from the V4 baseline. Not an Astra build relabelled as GLM. |
| GPT-5.6 Sol | Independent Sol enhanced worktree plus the new solo gauntlet, bilingual product shell and certificate flow. |

## Authentic GLM route / GLM 真实性

The first GLM attempts were not hidden:
- one run failed when a required visual MCP could not initialise;
- one retry hit the route's five-hour usage limit;
- after reset, the protected GLM-5.3 coding route completed the comparison refinement.

Verified GLM output:
- boss telegraph/readability improvements,
- depth floor guides and player locator,
- boss pattern instruction HUD,
- clearer Energy reserve presentation,
- preserved V4 game mechanics,
- 24 Node test groups + all 24 server/network checks green.

The GLM branch is separately committed as `beast-kings-glm53-20260919`.

## GLM execution usage / GLM 调用用量

The completed GLM turn reported:
- input: 19,164,679 tokens,
- cached input: 18,491,264,
- uncached input: 673,415,
- output: 26,336,
- reasoning output: 8,027 (already included in output; not double-counted).

A public API list-rate reference produces approximately US$5.87 for that logged workload. It is **not** claimed as the actual protected Coding-route invoice.

See `GLM53-USAGE.json`.

## Human replacement-cost scenarios / 人工替代成本场景

The parent/development pages use deliberately labelled scenario estimates, not wages paid or vendor quotes:

- classroom prototype: A$1.8k–4.9k,
- current feature set: A$6k–16k,
- additional product polish: A$16.5k–54k+.

The assumptions and hourly-rate ranges are shown next to the numbers so a reader can challenge them rather than treating them as a valuation.

## Privacy / 隐私

The public archive does not include:
- AI Familiar credentials,
- private chat logs,
- API keys,
- private network addresses as publication instructions,
- children’s hidden assessment records.

Playtest drafts remain browser-local unless the user explicitly downloads or sends them.

## Acceptance boundary / 验收边界

Automated tests establish implementation behaviour. They do not establish:
- whether Nathan or Leo prefer one model's version,
- whether real Safari touch feels good,
- whether the game is balanced for children,
- whether a parent wants to share or purchase a polished edition.

Those remain human acceptance questions.
