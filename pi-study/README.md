# Pi Study

面向个人本地学习的 Pi 工具包与 CLI。题库通过标准 JSON 导入，模型、Pi 交互与学习核心分离；所有成绩均为**参考成绩**。

当前交付目标是三来源可刷的 MVP。支持客观题快刷、明确提交、草稿恢复、独立/辅助统计、来源筛选、复习调度、题图、备份，以及受预算控制的 DeepSeek 文本讲解和手动查证。简答评分、精学/测验、通用去重迁移及自动证据缓存属于后续完整首版；未实现功能不会注册为可用工具。实际验收状态见 `docs/acceptance/checklist.md`。

## 环境与安装

当前验收平台为 macOS，Node.js >=24；Pi 基线为 0.87.1。PDF 转换使用系统 PDFKit/Vision，通过 Xcode Command Line Tools 的 `clang` 编译本地 helper，不上传题库。

```sh
cd pi-study
npm ci
npm run build
cd ..
pi install --local ./pi-study
pi
```

在这个目录启动 Pi 后输入 `/study`。菜单中选择题库、开始 quick 或按来源开始、提交答案、下一题。普通聊天文字不自动计分。学习态宿主切换到本地 provider，真正联网只通过本包的费用网关；退出学习恢复原模型和工具。其他本地扩展不属于安全隔离范围。

若 Pi 提示项目尚未信任并拒绝修改本地包配置，核对路径后执行 `pi install --local --approve ./pi-study`。本机已完成项目安装，可直接在仓库目录启动 Pi；已打开的旧 Pi 会话需要重启以加载扩展。

独立 CLI 不要求模型凭证：

```sh
node pi-study/dist/cli/index.js help
node pi-study/dist/cli/index.js bank list
node pi-study/dist/cli/index.js start --source first-docx
node pi-study/dist/cli/index.js answer AC
node pi-study/dist/cli/index.js feedback
node pi-study/dist/cli/index.js next
node pi-study/dist/cli/index.js resume
```

多选写 `AC` 或 `A,C`；判断写 `正确/错误`；多空填空用 `|` 分隔，命令内的大小写和空格保留。`--unsure` 记录不确定作答。`hint`、`reveal` 记录辅助状态。原材料缺条件或答案冲突时可练习，但不进入可评分分母。

## 转换与导入

源码和安装包不包含个人题库、转换结果、学习数据或密钥。当前三份材料的本地转换/导入状态在验收报告中记录。新资料先转换为 `schema/question-bank-v1.schema.json`，再导入；“让模型读文件”不等于持久化导入。

```sh
cd pi-study
sh native/build.sh
node converters/first-docx.mjs '/路径/ICT网络赛道1500题带解析.docx' --output './converted/first-docx.json'
node converters/province-docx.mjs '/路径/网络赛道（省赛）.docx' --output './converted/province-docx.json'
node converters/pdf.mjs '/路径/华为网络赛道wlan.pdf' --output './converted/pdf.json'
node dist/cli/index.js bank create '华为 ICT 网络赛道'
node dist/cli/index.js import ./converted/first-docx.json
node dist/cli/index.js import ./converted/province-docx.json
node dist/cli/index.js import ./converted/pdf.json
node dist/cli/index.js sources
```

后续两次导入复用当前题库，三来源仍保留独立出处。PDF 全页处理，支持页 checkpoint；OCR 失败和原件缺答分别报告。标准导入复制原件快照及所有引用资产，临时转换目录移动后仍可学习。现有 DOCX/PDF 转换器针对已验证版式；任意新排版不承诺免配置正确分题。

## 联网与月预算

默认每自然月 10 CNY，Pi 与 CLI、不同题库共享同一个用户财务账本。Pi 中 `/login` 选择 DeepSeek 保存凭证，或在启动进程环境设置 `DEEPSEEK_API_KEY`；不要将密钥写入题库或仓库。

```sh
node dist/cli/index.js budget show
node dist/cli/index.js budget set 10
node dist/cli/index.js explain
node dist/cli/index.js verify 'OSPF 邻居建立 site:support.huawei.com'
```

`explain/verify` 在提交或明确揭晓后开放。MVP 使用 `deepseek-flash`、纯文本、关闭 thinking、非流式、1024 输出 token 上限。一次生成按完整上下文保守预留约 2.106 元；收到用量后按峰值价格估计结算并释放差额，预留金额并非实扣。Search/Fetch 每次手动任务最多各一次。引用正文保存为证据，不自动改答案或分数。

费率卡带核查时间和失效时间；24 小时有效期是本地复核政策，不是服务商不涨价承诺。过期、未知费用、未证明上界时停止新付费请求。超时/断流保留未知占额，不自动释放。具体证据、限制与真实联调记录见 `docs/verification/budget-pricing.md`、`docs/acceptance/`。当前不支持流式付费调用和云端批量 OCR。

每个题库的来源策略可独立设置。费率过期时先核查 DeepSeek 官方价格与计费规则，再编辑示例中的核查时间、有效期和金额，明确确认后导入。仅修改日期不能证明价格未变；输入费率低于当前已验证保守下界时会被拒绝。此限制只阻断付费调用，本地刷题不受影响。

```sh
node dist/cli/index.js source-policy show
node dist/cli/index.js source-policy set examples/source-policy.json
node dist/cli/index.js pricing show
node dist/cli/index.js pricing set '/路径/已核查费率.json' --yes
```

`examples/reviewed-rates.example.json` 是 2026-10-23 的快照，不能作为长期有效报价。金额单位是十亿分之一元（nano CNY），每百万 token 单价与单次费用分开填写。CLI 和 Pi 使用同一当前业务空间配置，月预算账本则跨业务空间共享。

## 数据与恢复

默认数据在 `~/Library/Application Support/pi-study/`。`spaces/default/study.sqlite` 保存业务数据；`finance.sqlite`、identity/revision witness 独立保存预算，不随题库恢复回滚。`--data-dir` 只改变业务目录。

```sh
node dist/cli/index.js stats
node dist/cli/index.js settings exam-date 2026-11-13
node dist/cli/index.js settings timezone Asia/Shanghai
node dist/cli/index.js backup '/路径/学习备份.zip'
node dist/cli/index.js restore '/路径/学习备份.zip' --to '/路径/恢复的新空间'
# 核对预览后，重复上一条并加 --yes
```

示例日期只是设置用法；程序不会默认填写比赛日期。备份含 SQLite 一致性快照、三源原件/JSON、题图、证据和设置，不含可回滚财务库与凭证。恢复写新目录，校验失败保持旧空间。MVP 备份/展开容量上限 512 MiB，条目上限 10 万。

## 开发检查

```sh
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

无需凭证的测试使用明确人工样本或故障服务，不冒充真实账单/人工题库真值。源文件在上级目录存在时另执行真实来源转换回归；本仓库不分发原件。设计与分阶段计划位于上级 `docs/superpowers/`。
