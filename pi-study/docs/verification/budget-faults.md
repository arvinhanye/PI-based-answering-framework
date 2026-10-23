# 财务预算故障验证

> 后续变更（2026-10-23）：本地 24 小时费率过期机制已按用户要求删除；下文涉及有效期/过期拒绝的内容为原实现验收记录，不再代表当前行为。
金额内部BigInt纳元，对外十进制string，默认10元/月。时区初始化存储，回拨直接冻结。跨月结算归原始预留周期。降额允许余额变负但不得新发请求。每次重试必须新requestId。

财务库固定独立路径，由root compose决定；WAL、foreign_keys、busy_timeout=5000、synchronous=FULL。短事务BEGIN IMMEDIATE，无网络等待。reserve→dispatch在HTTP前持久化；有验证usage才保守按缓存未命中价结算，无usage/错误/断流/重定向维持unknown占额。已知空Search/Fetch结果才释放。已确认未发送可release；不得以“用户取消”推断免费。

身份marker防删除后新建。额外 `.identity.witness` 持有独立单调revision，每次账本事务持锁比对；旧DB备份替换后与witness冲突而冻结，不能恢复预算。witness在提交前更新，提交中断会有意冻结，需人工核账恢复。业务备份严禁包含财务DB/marker/witness。此机制不抵抗有本机文件写权限的攻击者同时回滚所有独立文件。

已执行：连接及两独立Node进程争抢最后1元仅1个准入、unknown重启保留、原周期结算、时钟回拨、DB丢失、旧DB恢复冻结、幂等结算、可信改额、final payload冻结、多completion字段拒绝、过期/未知费率拒绝、推理cap证明缺失拒绝、307只1次HTTP且unknown、失败后重试另预留、有效usage结算、固定工具空结果释放。

上界仅实现full-context与fixed-request；validated-tokenizer拒绝，未获证明的byte-bound回退full-context。现有受限文本profile仅允许思考关闭/无图/无工具/非流式/1024输出，有效期采用本地24小时复核政策；未提供profile的通用路线仍关闭；正余额也可能不足保守全上下文预留。假transport证明本地门禁，不证明服务商计费。机器突然断电、ENOSPC、锁超时、跨平台未独立故障注入；DB-witness中断优先冻结而非自动恢复。无真实付费调用。
