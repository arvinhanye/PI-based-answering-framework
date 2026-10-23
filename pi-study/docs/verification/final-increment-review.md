# 最终增量审查

审查原最终结论：**原 P1 已复核关闭；本次增量审查没有未关闭的 P0/P1/P2。** 此审查只写本报告，未改源文件、读取凭证或发出付费请求。

修复结果（主任务追加）：QuestionView 已改为 `issueCount`，自由 `issues` 只存在于解锁后的 FeedbackView。新增真实失败回归后修复，覆盖 next/inspect/resume；13 项 core 测试与类型检查通过。三来源真实 CLI 子进程验收进一步断言题目 JSON 不含 answer/explanation/issues，已通过。原发现保留作为审查记录。

## P1：答前 QuestionView 暴露自由文本 issues，绕过反馈可见性约束

- 根源：`src/study/service.ts:44`，答前投影直接返回 `issues: q.issues`。
- 输入允许：`src/import/validation.ts:6`，issues 是任意字符串数组，未限制为安全固定代码。
- CLI 暴露路径：`src/cli/commands.ts:36`、`:49`、`:52`、`:53` 复制完整 QuestionView，`--json` 输出包含该字段。
- Pi 暴露路径：`src/adapters/pi/ui.ts:51` 恢复会话后显示完整 resume 快照。通常的 formatQuestion 和只读 study_question 投影虽不显示 issues，但恢复路径仍显示。

可重现：导入合法 ready 单选题，`issues: ['原件参考答案是A；需复核']`，开始会话并取得下一题，尚未提交/揭晓即可读取上述答案。审查用临时目录、实际 composition/service 源码打包运行：输出 `{"preAnswerIssues":["原件参考答案是A；需复核"]}`，随后同一展示 `feedback()` 正确拒绝并报“提交或明确揭晓后才可查看反馈”。因此真正的反馈锁仍有效，但另一投影泄漏了相同秘密。

建议从所有答前投影移除自由 issues，仅显示 issueCount 或严格定义的安全代码；完整 issues 保留在允许反馈后。覆盖 CLI JSON 开始/查看/恢复和 Pi 恢复的回归用例。既有三源 issues 恰好仅含代码，不能作为通用导入边界的保障。

## 增量范围与检查

检查了预算配置校验、CLI pricing/source-policy/help、来源语义重复检测、内容哈希快照、LearningService 外部取消信号与 Pi 取消对话框衔接。配置拒绝低于核查底线的价格、过期/超长有效期、非官方来源和非受限生成配置；导入冲突比较排除了本地打包路径而保留题目语义；取消继续保留已 dispatch 的未知占额。没有发现上述增量的另一个具体阻断。

实际运行：

`npm test -- tests/unit/pricing-config.test.ts tests/integration/import-idempotency.test.ts tests/integration/json-import.test.ts tests/integration/learning.test.ts tests/integration/pi-session.test.ts tests/integration/cli.test.ts`

结果：**6 文件，65 测试通过**，其中 pricing-config 36、Pi 17、Learning 2、CLI 4、两组导入各 3。另执行上文独立泄漏探针。没有用单元测试替代真实付费账单、真实 Pi 人工交互或故障断电验收；此前全量审查结果未在本次重复检查。

## 修复复核：P1 已关闭

实际源码 `src/contracts.ts:24` 与 `src/study/service.ts:44` 已将答前自由文本 `issues` 替换为 `issueCount`，反馈 DTO 继续保留完整 issues。CLI JSON 与 Pi resume 都消费这一安全投影，原泄漏路径已在核心消除。以上原发现保留作审计记录。

仅重跑针对性测试，未重跑全套：

`npm test -- tests/integration/core.test.ts tests/integration/pi-session.test.ts -t 'free_text_issues|failed original model restore|throwing original model restore'`

**3 项通过，29 项按过滤跳过。** 泄漏回归覆盖 next/inspect/resume 无秘密文本、无 issues 字段、保留数量，以及答前 feedback 拒绝、揭晓后自由 issues 可见。另核对 Pi 原模型恢复返回 false/抛错时保持 active 与禁用工具、继续拦截输入，shutdown finally 关闭应用；对应两项测试通过。本审查未独立重现有凭证真实 Pi trace，不把其作为本次自动测试证据。未发现新阻断，审查完成。
