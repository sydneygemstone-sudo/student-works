# 预算与用量核算 / Budget and usage report

<!-- LEGENDS COST START -->
**Legends 本轮快照 / This pass: 2026-09-12T13:01:36.869Z** — 新增约 **12.42 USD**，占本轮 35 USD 参考上限 **35.5%**，参考余量 **22.58 USD**。累计各轮约 **52.52 USD**。52 次已记录请求，7,043,242 tokens（输入含缓存）。这不是实际订阅账单；之后收尾不含在固定快照内。[数据](LEGENDS-USAGE.json)

**Legends pass:** approximately **US# 预算与用量核算 / Budget and usage report

2.42** in Standard API-equivalent usage, **35.5% of the US$35 ceiling**, leaving approximately **US$22.58** on that reference basis. All-game equivalent: **US$52.52**. This is not actual subscription billing and excludes later wrap-up calls. Last account-wide weekly display: 3% used, 97% remaining; this cannot be assigned entirely to this game. [Data](LEGENDS-USAGE.json)
<!-- LEGENDS COST END -->

**最新快照 / Latest snapshot — 2026-09-12 19:57 China time:** 当前游戏及构建助手共 182 次已记录请求、19,271,003 tokens，标准 API 文本参考合计 **35.2535 USD（约 35.25 USD / 49.15 AUD）**。包括此前归档和截至快照的使魔接入；不包含此后的发布收尾。真实额外扣款未取得账单，不能把参考金额当作已付款。此快照取代下面较早的合计。[可复核数据 / Data](CURRENT-USAGE-SNAPSHOT.json)

The latest snapshot covers 182 recorded requests and 19,271,003 tokens across this task and its build assistant: **$35.2535 Standard API text-token equivalent**, approximately **A$49.15** at the RBA 2026-09-11 rate. It includes archival and Familiar work through the snapshot, excluding later publication calls. Actual incremental billing is unavailable; this is not money paid. Earlier totals below remain historical checkpoints. [RBA](https://www.rba.gov.au/statistics/frequency/exchange-rates.html)

核算日期 / Reviewed: 2026-09-12. 范围截至本次归档请求之前 / Cutoff: before the GitHub/archive request, 18:55:56 China time.

**更新快照：加上本次双语归档与测评表制作，截至北京时间 19:10 的已记录标准 API 参考合计约 $27.75；真实美元扣款仍无法核实。** 本次归档参考为 $5.805598，之前游戏工作为 $21.947132，按未四舍五入金额相加。收尾快照之后的调用不含在内。

**Updated snapshot: including this bilingual archive and playtest-form work, the recorded Standard API reference totals about $27.75 as of 19:10 China time. Actual USD charged remains unavailable.** The archival turn contributes $5.805598 to the prior $21.947132; totals use unrounded values. Later wrap-up calls are outside this fixed snapshot. See [ARCHIVE-USAGE-SNAPSHOT.json](ARCHIVE-USAGE-SNAPSHOT.json).

**实际美元扣款：无法从当前工具核实。标准 API 文字模型参考成本：$21.95；其中课后 Evolve 升级为 $9.74。这两个金额不是账单，也不能证明实际预算剩余。**

**Actual USD charged: unavailable from the current tools. Standard API text-model reference cost: $21.95, including $9.74 for the after-class Evolve upgrade. These amounts are not invoices and do not establish the remaining actual budget.**

| 项目 / Item | 整个游戏工作 / All game work | 其中 Evolve 升级 / Evolve subset |
| --- | ---: | ---: |
| 已去重模型请求 / Deduplicated model requests | 125 | 43 |
| 输入 tokens（包含缓存）/ Input tokens including cache | 11,592,377 | 4,870,344 |
| 缓存输入 / Cached input | 11,042,432 | 4,664,576 |
| 非缓存输入 / Uncached input | 549,945 | 205,768 |
| 输出 tokens（包含推理）/ Output including reasoning | 108,105 | 60,414 |
| 输入 + 输出 / Input + output | 11,700,482 | 4,930,758 |
| 标准 API 参考 / Standard API reference | $21.9471 | $9.7430 |
| 实际账单 / Actual invoice | 未获取 / Unavailable | 未获取 / Unavailable |

预算上限为 Dean 指定的 **$100**，不是要求花完。现有账户工具显示 Pro 计划，但只返回账户级额度/余额，不能为这一个游戏结算；显示 0% 或零 credit 余额不代表本任务成本为零。没有发起额外的付费媒体生成、托管采购或充值。

Dean specified a **$100 ceiling**, not a spending target. The available account tool identifies a Pro plan and returns account-wide limits/balances, not a task invoice. A displayed 0% or zero credit balance does not imply zero task cost. No extra paid media generation, hosting purchase, or credit purchase was initiated.

## 计算方法 / Method

仅读取当前游戏主任务和其构建助手的本地 `token_usage_record`，按 response ID 去重；没有汇总累计计数器，也没有把缓存或推理 token 重复相加。输入反复包含上下文，因此 tokens 不等于孩子说出的独立字数。原始对话、认证信息和内部请求标识不包含在本报告中。

Only local model-usage records for this game task and its build assistant were read. Response IDs were deduplicated; cumulative counters were not summed. Cached input and reasoning output were not added twice. Repeated context contributes tokens, so this count is not the number of unique words spoken by the children. Raw conversations, credentials, and request identifiers are excluded from this report.

所有已核算模型均为 GPT-6 Astra，单次最大输入 219,679 tokens；按标准 API 每百万非缓存输入 $10、缓存输入 $1、输出 $50 计算。缓存写入记录为零。全项目公式：`0.549945 × 10 + 11.042432 × 1 + 0.108105 × 50 = $21.947132`。[官方模型价格 / Official model rates](https://developers.openai.com/api/docs/models/gpt-6-astra)

All included requests used GPT-6 Astra, with at most 219,679 input tokens per request. The reference uses Standard API rates of $10 per million uncached input, $1 cached input, and $50 output; recorded cache writes are zero. It does not apply a speed-tier multiplier or convert Pro subscription usage into a cash charge. [Codex 计划与计费口径 / Codex plans and billing](https://learn.chatgpt.com/docs/pricing)

未覆盖：前台语音、独立 Antigravity 执行、订阅费用分摊、加速档、工具费用、税费，以及本次归档/测评表制作。因而不能用 `$100 − $21.95` 作为实际剩余额度。

Excluded: frontend voice, independent Antigravity execution, subscription allocation, speed modifiers, tool fees, taxes, and this later archiving/review-form work. Therefore `$100 − $21.95` is not a verified remaining balance.

可复核汇总见 [USAGE-SUMMARY.json](USAGE-SUMMARY.json)，本地提取工具见 [summarize-usage.cjs](tools/summarize-usage.cjs)。下轮开工前记录范围、时间上限、预算、计费来源与开始快照，结束后按相同边界核算。

See [USAGE-SUMMARY.json](USAGE-SUMMARY.json) for machine-readable totals and [the extraction tool](tools/summarize-usage.cjs). Before the next build, record its scope, time ceiling, budget, billing source, and opening usage snapshot; reconcile the same boundaries afterward.
