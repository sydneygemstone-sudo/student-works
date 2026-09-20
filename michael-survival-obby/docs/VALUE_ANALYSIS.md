# Michael · AI development value / AI 开发价值

## Headline / 核心量化
- Final family release rebuild labour / 正式家庭版重建劳动等价: **~A$1.0k–2.0k**
- Three-model R&D package + integrated release / 三模型研发学习包: **~A$2.5k–5.0k**
- These are alternative views and must **not** be added together / 两个数字是不同视角，不能相加。

## Token evidence / Token 证据
Exact provider-billed session tokens have **not** been recovered from project-scoped request receipts. Unknown is not zero.
目前尚未从项目级请求回执中恢复三个课堂版本的真实计费 Token；未知不能写成 0。

What we can reproduce from the frozen source is the delivered custom-text footprint:
- GLM: ~3.9k token-equivalent
- Claude: ~8.4k token-equivalent
- Codex Astra: ~7.9k token-equivalent
- Integrated 1.1: ~19.9k token-equivalent

Method: custom text characters ÷ 4, excluding vendored Three.js and duplicate release bundles. This is **not** provider tokenization or hidden reasoning/input usage.
方法：自定义文本字符数 ÷ 4，排除第三方 Three.js 与重复发布包；这不是供应商计费 Token，也不包含隐藏推理与输入上下文。

## Current price references / 当前价格参考
- Claude Fable 5.1: US$10/M input, US$0.25/M cache read, US$50/M output.
- GPT-6 Astra: US$10/M input, US$1/M cached input, US$12.50/M cache write, US$50/M output.
- ZCode Coding Lite: list US$18/month, displayed promotional US$12.6/month, 10,000 credits/week. No standalone GLM per-token tariff is used here.

For scale only, if the frozen source footprint itself were charged purely as output: Claude ~US$0.42 and Astra ~US$0.395. This is **not the actual task bill** because it excludes prompts, reasoning, tool results, retries and caches.
仅用于理解数量级：如果只把冻结源码体积当作输出 Token，Claude 约 US$0.42，Astra 约 US$0.395；这不是实际任务账单。

## Human rebuild equivalent / 人类程序员重建等价
The labour model uses Sydney 2026 salary data: JavaScript Developer median A$125,350 and Senior Full Stack JavaScript Developer A$163,500, plus 12% super, over 1,976 working hours/year. That gives ~A$71.05–92.67/hour.
人工模型采用 2026 Sydney 工资中位数，加 12% super，折合约 A$71.05–92.67/小时。

| Scope / 范围 | Hours / 工时 | Labour equivalent / 劳动等价 |
|---|---:|---:|
| GLM classroom prototype | 5–8 h | A$355–741 |
| Claude classroom prototype | 8–12 h | A$568–1,112 |
| Codex Astra classroom prototype | 8–12 h | A$568–1,112 |
| Integrated family release 1.1 | 14–22 h | A$995–2,039 |
| Three-model R&D + integrated release | 35–54 h | A$2,487–5,004 |

This is a conservative employee-labour replacement model, not a contractor quote or sale price. It excludes contractor margin, GST, equipment, management, paid leave and profit.
这是保守的人力替代价值，不是外包报价或商品售价。

## Why show both numbers? / 为什么要同时展示
AI marginal generation can be cheap while the **product value comes from specification, comparison, iteration, testing, accessibility, bilingual delivery and publishing**. The lesson is not “AI made a game for cents”; it is that a child can direct a workflow that normally represents many hours of professional engineering.
AI 的边际生成成本可以很低，但真正的产品价值来自需求表达、比较、迭代、测试、适配、双语和发布。学生看到的不是“几毛钱生成一个游戏”，而是自己正在指挥原本需要很多工程小时的工作流程。

## Sources / 来源
- https://www.anthropic.com/claude/fable
- https://developers.openai.com/api/docs/models/gpt-6-astra
- https://openai.com/index/gpt-6-astra/
- https://zcode.z.ai/en
- https://www.roberthalf.com/au/en/job-details/javascript-developer/sydney
- https://www.roberthalf.com/au/en/job-details/senior-full-stack-javascript-developer/sydney
- https://www.ato.gov.au/businesses-and-organisations/super-for-employers/paying-super-contributions/how-much-super-to-pay
