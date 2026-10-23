# 费率配置边界

`RateCard` 必须明确version、verified、sourceUrls与模型/操作；调用方只能从可信本地设置提供，网页内容或模型不接受写profile。已内置2026-10-23核验的严格受限卡；不能通过模型或网页改价。

模型卡需contextTokens、inputNanoPerMillion、outputNanoPerMillion、hardOutputIncludesReasoning；费用以上下文全量输入+服务端总输出cap向上取整。字节/分词策略尚未验证，不以猜测放行。1024输出在1M上下文、2元/8元每M的测试卡占额2.008192元（测试数据，不是生产授权）。

Search/Fetch卡分别指定operation与fixedNano；只能对应固定HTTPS provider endpoint。5元/1000次相当于每次5000000纳元。文献事实与本机费率有效性分开：官方价格允许变化，费率数字由用户手动更新，不再按时间阻断。未提供有效profile的通用路线关闭；凭证可用性与费用证明分别检查。


## 受限内置卡追加核验

`reviewedDeepSeekProfiles()`返回 generation/search/fetch 三组费率。**2026-10-23 按用户要求删除本地 review TTL=24 小时机制**，不再要求 checkedAt、validUntil 或 policy；旧配置中的这些字段读取时忽略。费率数字在供应商调价时手动更新。此独立修复暂时保留金额、上下文和来源校验，软记账及其他限制的删除在交互改造规格 §6 中另行完成。

验收将时钟推进到 2026-10-26 和 2030-01-01，内置费率、无时间字段的配置以及带已过期时间的旧配置均可通过校验；模拟传输的 LearningService 讲解可以完成并结算。

[Chat Completions参数](https://api-docs.deepseek.com/api/create-chat-completion/)的max_tokens条款明确生成最大值，且输入与生成总长受模型上下文限制。[Thinking控制](https://api-docs.deepseek.com/guides/thinking_mode/)明确disabled关闭思考。因此仅对text string消息、非流式、thinking disabled、无tools/图像/文件、1024输出开放。1M上下文以1,048,576输入token预留覆盖十进制/二进制标记差异，2元/M输入+8元/M输出得到**2.105344元上界**。这比常见短题实际费用高，但不使用未经证实的分词猜测。

结算读取完整prompt/completion usage，若cache hit/miss数字有效且之和等于prompt，则分开计价；否则使用缓存未命中峰值保守估计。仍按峰值计价，显示“估计已结算金额”，不是供应商最终账单。官方中文缓存命中峰值0.04元/M。未知profile、流式、其他收费字段与扩展功能仍拒绝。
