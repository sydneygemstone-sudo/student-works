# 100 AUD 预算预估 / 100 AUD budget estimate

日期 / Date: 2026-09-12. 这是下一轮的预算分析，不是充值、账单，也不是已花费 100 AUD。

This analyzes a possible next-round cap; it is not a credit purchase, invoice or claim that 100 AUD was spent.

| 项目 / Item | 已知值 / Known value |
|---|---|
| 假设开发上限 / Proposed development cap | 100 AUD |
| 汇率 / Exchange rate | 1 AUD = 0.7172 USD，RBA 2026-09-11 |
| 美元参考 / USD equivalent | 71.72 USD |
| 账户主周额度最新检查 / Latest main weekly account limit | 已用 1%，剩余 99% / 1% used, 99% remaining |
| 确认的每周总 credits / Verified weekly credit denominator | 接口未提供 / Not exposed |

以本任务 GPT-6 Astra 的标准文本 token 口径，API 参考价为每百万非缓存输入 $10、缓存输入 $1、输出 $50；Codex credits 对应为 250、25、1250。因此，**如果实际执行恰好消耗 71.72 USD 的标准 API 等价文本 token，约对应 1,793 标准 credits**。这是一项有条件的工作量换算，不能当成可购买的订阅额度。Fast 倍率、长上下文、工具和语音会改变计量。

For the GPT-6 Astra Standard text-token reference used here, API rates are $10/$1/$50 per million uncached input/cached input/output tokens, while Codex rates are 250/25/1250 credits. **If execution consumes exactly $71.72 of that Standard API-equivalent text workload, it corresponds to about 1,793 Standard credits.** This conditional workload conversion does not buy subscription capacity. Speed settings, long contexts, tools and voice can change usage.

周占比需要 `1,793 ÷ 账户该周总 credits × 100%`。当前接口只有已用百分比，没有总 credits，且额度在账户所有任务之间共享。因此，现有证据不足以可信地预测“会用掉多少百分比”；不能用月订阅价格除以四、也不能把其他任务的旧 95% 用量当作本周读数。

The weekly share requires `1,793 / the account's weekly credit allowance × 100%`. The interface exposes used percentage, not that allowance, and usage is shared across tasks. A reliable percentage forecast is therefore unavailable. Dividing a monthly subscription price by four or reusing another task's older 95%-used reading would be misleading.

建议下一轮同时设定：100 AUD 标准 API 等价参考上限、最多 5 个周额度百分点的执行上限、一次完成一个可验收问题。**5 个百分点是建议的停止线，不是预测值或硬性计费限制，也不保证整个升级清单能在其中完成。** 当前读数 1% 时，6% 可作为软停止检查点；其他任务同时运行、整数显示和用量延迟会影响差值。开始和结束保存额度快照，中途按小批次检查。这里只完成分析，没有自动授权下一轮消耗至此上限。

Suggested next-round controls: a 100 AUD Standard API-equivalent reference cap, a maximum five-percentage-point weekly usage increase, and one reviewable issue per batch. **Five points is a proposed stop threshold, not a forecast or billing-enforced cap, and does not guarantee completion of every upgrade.** Starting at 1%, 6% would be a soft checkpoint; concurrent tasks, integer display and reporting delays affect attribution. Save opening/closing snapshots and check between small batches. This analysis does not itself authorize spending through that cap.

来源 / Sources: [RBA 汇率](https://www.rba.gov.au/statistics/frequency/exchange-rates.html), [GPT-6 Astra API rates](https://developers.openai.com/api/docs/models/gpt-6-astra), [Codex pricing and credits](https://learn.chatgpt.com/docs/pricing).
