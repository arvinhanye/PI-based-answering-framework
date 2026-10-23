# Provider 边界调查（2026-10-23）

> 后续变更（2026-10-23）：本地 24 小时费率过期机制已按用户要求删除；下文涉及有效期/过期拒绝的内容为原实现验收记录，不再代表当前行为。
实测安装：`/usr/local/lib/node_modules/@earendil-works/pi-coding-agent`，0.87.1。`probes/provider.ts` 使用安装包的真实 OpenAI completions adapter、假 key、拒绝发送的注入 fetch；不读取任何凭证、不发送网络。

| 路径 | 最终准入与重试 | 结论 |
|---|---|---|
| openai-completions.js:186–199 | createClient 收到 options.fetch；onPayload 完成后才 SDK create；SDK maxRetries:0；provider retry 显式设0 | 假 fetch 看见钩子修改后的 max_tokens=777；两个独立请求共2次fetch |
| utils/provider-retry.js:76 | 默认 options.maxRetries??0 | 不是“SDK必然隐藏重试” |
| agent-session.js:1844 | compaction 使用 requestModel、agent.streamFunction | 代码证据；尚未端到端触发真实 Pi 压缩/分支摘要/继续生成/fallback |
| extensions/runner.js:961 | before_provider_request 仅替换 payload，throw被捕获继续 | 不能用作拒绝付费的安全边界 |

首选适配器最终 custom fetch。`createBudgetFetch` 提供入口，但通用生产模型请求默认无 verified profile 并拒绝；后续已新增受限文本profile（见budget-pricing.md）；stream=true 尚未提供验证过的流式usage结算，主动拒绝。未自造SSE。会话主模型、其他扩展和普通宿主对话不自动获得本项目预算保护；学习态应切换独立离线provider，不能仅靠 input 拦截宣称全局费用受控。

官方资料于本日浏览复核：[中文模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)、[英文模型与价格](https://api-docs.deepseek.com/quick_start/pricing/)。中文页列 `deepseek-flash` 对应 V4.1-Flash-1017，1M上下文、384K最大输出，高峰输入缓存未命中2元/M、输出8元/M；本文只记录来源，不自动把证据变成长期有效费率。

[Search/Fetch 官方指南](https://api-docs.deepseek.com/guides/search/) 明确固定 `/v1/tools/search`、`/v1/tools/fetch`；按成功结果收费，失败/空结果/超时不收费。中文价格页列各5元/1000次。保守实现不依赖任何临时免费期。

后续补证：[Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/) 的max_tokens规定最大生成数，输入与生成总量受context限制；[Thinking指南](https://api-docs.deepseek.com/guides/thinking_mode/)允许显式disabled。受限profile仅文本、非流式、思考关闭、无工具、1024输出；图像/推理开启仍禁用。价格无官方有效期承诺，本地24小时复核策略到期拒绝。不得把通用UTF8/BPE猜测当字节上界。

随后已使用 Pi 保存的 DeepSeek 凭证完成一次真实生成与两组 Search/Fetch，记录见 `../acceptance/generation-live.json`、`evidence-live.json` 和 `evidence-live-rfc.json`。首组返回华为下架页，暴露并修复可用性判定问题；第二组取得 RFC2328 的已验证编辑勘误原文，涉及邻居状态机中的事件命名。累计按峰值费率估计结算 0.020206 元、未知占额为 0；没有读取供应商账单，不能将此估计说成最终实扣。凭证未输出或写入报告。
