# Pi Study

> **组员请先看 [用户手册](../docs/user-guide.md)**，里面有安装、导入题库和刷题的完整步骤。本文是开发与维护说明。

个人本地刷题包，支持 Pi 对话和独立 CLI。三份题库通过标准 JSON 导入；成绩是学习参考分，原件有缺答、冲突或结构问题的题不计分。

当前支持客观题快刷、直接作答、撤销、错题复习、跨会话恢复、多题库、题图、备份，以及 Pi 原生 DeepSeek 流式讲解和连续追问。后续优先补进度统计、考点标签与薄弱点选题，再安排测验与联网查证；重复题合并、新资料转换和 Pi 备份入口按需开展。简答评分、精学、资料升级迁移及通用导入等已移出完整首版，具体范围见 [路线图](../docs/superpowers/plans/2026-10-23-pi-study-roadmap.md)。

## 安装与使用

Node.js >=24，Pi 0.87.1；当前实际验收平台为 macOS。PDF 转换用系统 PDFKit/Vision，需要 Xcode Command Line Tools。

```sh
cd pi-study
npm ci
npm run build
cd ..
pi install --local ./pi-study
pi
```

升级构建后退出并重启 Pi，加载新扩展；输入 `/study` 直接看到当前题。首次会问比赛日期，可以留空或 Esc 跳过。程序不默认填写日期。

| 输入 | 操作 |
| --- | --- |
| `/study` | 继续当前轮；没有会话时从全库开始 |
| `/study 1500`、`/study 省赛`、`/study pdf` | 按来源开一轮 |
| `/study 错题`、`/study 省赛 错题` | 只刷尚未独立答对的错题 |
| `/study 1500 随机` | 新题打乱，复习题仍优先 |
| `A`、`选B`、`AC`、`a c`、`A,C` | 输入并回车即判分 |
| `对`、`错`、`T`、`F` | 判断题作答 |
| `=答案`、`=第一空\|第二空` | 填空题作答，保留大小写和内部空格 |
| `B?`、`AC？` | 作答并记为不确定，次日复习 |
| `n`、`下`、`Ctrl+N` | 下一题；未作答时跳过 |
| 普通文字，如 `B为什么不对` | 直接问 DeepSeek，可连续追问 |
| `/study undo` | 撤销当前题作答并重答；换题后不能撤销上一题 |
| `/study think` | 开关思考模式，进入学习时默认关 |
| `图` | 用系统默认程序打开当前题图（macOS 通常为“预览”），多张一起打开 |
| `/study menu` | 一层设置：题库、恢复会话、成绩、预算、比赛日期、答对自动下一题 |
| `/study budget 20` | 将月上限改为 20 元 |
| `/study exit` | 退出学习，恢复原模型、工具和思考设置 |

主要用 `n` 或 `下` 换题；`Ctrl+N` 是可选快捷键。Pi 会提示它与会话选择器的快捷键冲突，这是预期行为，扩展优先生效。用户已确认 Warp 真实键盘验收通过；若其他终端拦截该键，请使用 `n`。菜单 Esc 返回当前题。没有作答确认框；重复提交已答题不会重复计分。单选输入 `AB`、选项越界只提示，不计分也不发模型。模糊的普通文字优先当提问。

题目和结果留在对话区，完整显示原解析；卡片只保留题目、判分和必要资料说明。输入框下方的一行显示操作提示、本轮对错和月用量；金额保留两位小数，不足一分显示 `<0.01`，账本与 JSON 导出仍保留完整精度。题干末尾重复的【…考点】只在显示时去掉。窄窗口下常驻提示会自动折行，仍只有一组提示。答前提问会记录辅助作答；独立与辅助成绩分开统计。错误、不确定和辅助作答次日复习；其余沿用 1/3/7/14/30 天间隔，受已设置比赛日期约束。每 4 道到期复习/错题插 1 道新题，新题默认按原题号及 1500→省赛→PDF 顺序。

## 题图测试

输入 `/study pdf`，用 `n` 翻到前几题的 `p1-q3`（或 `p2-q10`），即可遇到题图；1500 题来源没有配图。Warp、kitty、Ghostty、WezTerm、iTerm2 通过 pi-tui 的能力检测内联显示，图片位于选项下方，逐张编号，高度最多 20 行。输入 `图` 可放大查看。不支持内联的 Terminal.app、tmux 等环境显示“输入 图 打开”。超大、格式不适合当前协议或无法解码的图片也保留外部打开入口。

自动化已覆盖 kitty/iTerm2 渲染输出和不支持图片时的回退。2026-10-23 用户已确认 Warp 真实键盘、内联图及外部打开，以及 Terminal.app 的“预览”打开验收通过；截图与证据边界见 [二轮验收记录](docs/acceptance/2026-10-23-ux-round2.md)。

## DeepSeek 与费用

沿用 Pi 的 DeepSeek 凭证：在 Pi `/login` 配置，或在启动 Pi 的终端设置 `DEEPSEEK_API_KEY`。不要把密钥发到聊天、题库或仓库。学习态使用内置 `deepseek/deepseek-flash`，关闭文件、bash 等模型工具；模型不能调用作答工具。无凭证仍能本地答题，提问时给出配置指引。手动换到其他模型会退出学习态。

答前只发送题干、选项、考点及安全题图，引导思考；答后附作答、题库答案和解析。图像支持已用真实请求验证；超大或无法安全读取的图明确标为未发送。换题后旧问答仍在屏幕上，但不会发送给下一题。当前没有联网检索工具；模型讲解不等于权威来源核验。

每自然月默认 10 元。Pi、CLI 和各题库共用 `finance.sqlite`。每次学习请求结束，按实际 usage 记账；80% 提醒一次，达到上限后不再发送新提问，本地答题照常。**这是软上限，最后一笔请求可能超额；真正的硬上限是 DeepSeek 账户预付余额。** 中断或服务异常若没有返回完整 usage，本地账单可能低于服务商实际账单，请以服务商为准。

初始人民币费率（每百万 token）：输入 2 元、缓存命中 0.04 元、输出 8 元。无有效期、无核查时间、无费率下限、无预留占额。修改 `examples/rates.example.json` 中的数字即可更新，允许调低和设零。

```sh
node pi-study/dist/cli/index.js budget show
node pi-study/dist/cli/index.js budget set 10
node pi-study/dist/cli/index.js pricing show
node pi-study/dist/cli/index.js pricing set pi-study/examples/rates.example.json
```

旧账本已结算费用和月限额迁入新账本；旧表保留作为历史记录，旧预留不再占额度。升级后请重启旧 Pi 进程，避免同时运行旧网关和新账本。

## 独立 CLI

```sh
node pi-study/dist/cli/index.js help
node pi-study/dist/cli/index.js bank list
node pi-study/dist/cli/index.js start --source first-docx
node pi-study/dist/cli/index.js answer AC
node pi-study/dist/cli/index.js next
node pi-study/dist/cli/index.js undo
node pi-study/dist/cli/index.js resume
```

CLI 答题无需模型凭证，`answer` 直接显示结果和解析。加 `--json` 可保留结构化输出供脚本调用。填空多个空用 `|` 分隔，`--unsure` 标记不确定；问答请在 Pi 中进行。

## 转换与导入

源码和安装包不包含个人题库、转换结果、学习记录或凭证。新材料先转为 `schema/question-bank-v1.schema.json`，再持久化导入。

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

后两次导入复用当前题库，保留各自出处。PDF 全页处理并保留 checkpoint；OCR 失败与原件缺答分别报告。导入复制原件快照和引用资产，转换临时目录移走后仍能使用。现有转换器针对已验证版式，不承诺任意新排版免配置分题。

## 数据与备份

默认目录 `~/Library/Application Support/pi-study/`。当前数据空间由 `current-space.json` 指向，`study.sqlite` 保存题库与学习记录；预算账本独立，不随题库恢复回滚。`--data-dir` 仅改变业务目录。

```sh
node pi-study/dist/cli/index.js stats
node pi-study/dist/cli/index.js settings exam-date 2026-11-13
node pi-study/dist/cli/index.js settings timezone Asia/Shanghai
node pi-study/dist/cli/index.js backup '/路径/学习备份.zip'
node pi-study/dist/cli/index.js restore '/路径/学习备份.zip' --to '/路径/新空间'
# 核对恢复预览后，重复上一条并加 --yes
```

备份包含业务数据库、原件/JSON、题图、已有证据和设置，不含财务库与凭证；恢复写新目录，校验失败不改旧空间。容量上限 512 MiB，最多 10 万条目。迁移到另一台机器时，退出 Pi 后另行安全复制财务库；凭证在新机单独配置。

## 开发检查

```sh
npm run typecheck
npm test
npm run build
node probes/ux/flow.mjs
npm pack --dry-run
```

`flow.mjs` 使用实际 Pi SDK 和本地捕获服务，不发网络。最新逐项验收见 `docs/acceptance/2026-10-23-ux-round2.md`，此前真实付费和终端验收见 `docs/acceptance/2026-10-23-ux-redesign.md`；历史报告中旧菜单、网关和费率政策不适用于当前版。
