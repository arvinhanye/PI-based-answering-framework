# Pi 验收记录

2026-10-23，SDK 与真实 CLI 均 0.87.1。

- `npm run typecheck`、`npm run build` 通过。
- `npm test -- --run tests/integration/pi-session.test.ts`：16/16 通过。覆盖所有输入源阻断、通知异常仍 handled、TUI/RPC 边界、slash 附参不写审计、只读工具清单、切换模型恢复工具及离线 stream 结果。追加验证讲解必须先通过反馈锁、取消不解析凭证、确认后才调用学习服务。
- TDD 先写 Pi 测试并实际运行：模块缺失导致套件失败，再实现。首次命令路径误写导致 no tests found 不作为红灯证据。
- 真宿主 print：独立 `/private/tmp/pi-study-host-probe/agent` 配置，`PI_OFFLINE=1 PI_TELEMETRY=0`，显式 `-e` 临时 wrapper 将 StudyApp home 定位到临时目录。`--provider study-offline --model local-quick -p probe` 退出 0，输出本地 `/study` 提示。未读取真实 key，未发送生产请求。
- 真宿主 PTY：显示扩展加载和 local-quick；`/study` 出现完整中文菜单；Esc 后输入 A 出现“此文本未提交、未发送模型”提示；再次菜单选择退出，Ctrl-D 正常退出 0。此为自动键盘驱动 PTY 证据，非真人 GUI 验收。

限制：未用真实题库在 Pi 完整答题、预算改额；原外部模型恢复由适配器测试覆盖，真实 PTY 初始即离线模型，没有验证跨 provider 恢复。没有真实付费、usage/账单、压缩/分支摘要端到端验收；没有恶意扩展隔离、图片题展示验收。T09A 是可运行的本地 quick 交互基础，不能标记完整 AI MVP 或 T09B 完成。

后续按用户明确授权，菜单新增受控讲解与手动查证并复用 Pi deepseek 凭证；原“AI 未开放”记录为前一阶段证据，已由限制 profile 路线替换。真实付费验收由主代理记录，以上 PTY 观察不自动扩展为该路线验收。

可用性修订：共享真实 parseAnswer 回归覆盖 AC、多选、中文判断及带空格填空；来源选择转交 sourceId；安全图片回归覆盖跨页双图、排除 source 资产、拒绝路径穿越及符号链接越界。16 项 Pi 测试与 typecheck/build 通过。菜单图片打开的实际系统预览仍需真人视觉验收。

## 主任务真实三来源与模型恢复补验

2026-10-23，使用三来源完整备份的恢复副本作为业务空间，另设临时财务目录；正式空间仍为零作答。

- 真实 Pi PTY 菜单选择 first-docx、province-docx，均显示对应来源、段落、完整题干和选项；wlan-pdf/p1-q3 显示第1页、四个选项和受控题图路径。
- PDF 图题在真实输入、把握程度选择、提交确认后返回 D 的参考判分 1 分及解锁反馈。源图片通过 view_image 实际读取，表格可见且不含原答案。未观察系统 Preview 窗口，不能把读取像素称为系统窗口验收。
- 菜单将临时财务上限从10改为8，显示成功；正式财务上限仍为10。普通文字 A 明确提示未提交、未发送模型，副本提交数仍只有CLI三次和Pi一次。退出后进程退出0。
- 本项目已执行 `pi install --local --approve ./pi-study`，项目 `.pi/settings.json` 注册本地包。未替换用户凭证。
- 有凭证恢复测试使用用户实际Pi目录、PI_OFFLINE、显式扩展和恢复副本，不发送聊天。仪表化仅记录模型ID/布尔值：切换至study-offline/local-quick返回true，恢复deepseek/deepseek-flash返回true；再次进入命令时ctx.model是deepseek-flash，证实正常恢复。即时footer有一次未刷新，不能以旧footer推断模型恢复失败；成功退出新增提示解决此可见性问题。

这里的PTY操作为agent自动键盘验收，用户人工体验验收尚未进行。真实生成/Search/Fetch另见acceptance目录，不由这些离线PTY测试替代。

取消查证补充：Pi 会话测试 17/17、Learning 2/2、Evidence 7/7，共 26 项通过，typecheck/build 通过。先行测试实际观察到缺少取消 helper 和 Learning 忽略 signal 导致 30 秒测试超时；实现后通过。Learning 使用真实 PaidGateway 与合成凭证/拒绝发送的 transport，验证用户取消传播到已 dispatch 请求，账本请求状态 unknown、预占仍大于零，不释放未知费用；测试时钟固定在已核验费率日期。Evidence 既有挂起 response body 超时回归仍通过。

真实 Pi 0.87.1 PTY 以临时 wrapper 加载实际 withVerificationCancel helper（合成等待任务、无真实付费）：看到“取消本次查证”对话；选择 Enter 和另次 Esc 均观察到 CANCEL_OBSERVED；100ms 正常完成任务观察到 COMPLETE_DIALOG_CLOSED 且菜单自动关闭。Ctrl-D 正常退出 0。该探针验证真实 SDK 对话框信号语义，不冒充生产网络取消或真人界面验收。

模型恢复失败修复：实际 SDK agent-session.js:2436–2441 的 extension setModel 在 hasConfiguredAuth 为 false 时直接返回 false。原 exit 忽略此值。先行回归实际出现“promise resolved instead of rejecting”，随后最小修复为恢复模型成功后才恢复工具并结束受控状态；失败保留安全状态并明确提示，shutdown finally 关闭 App。19 项 Pi 测试通过，涵盖 false、throw、重试和关闭释放。

真实无凭证 PTY：独立临时 agent 目录并移除 DEEPSEEK_API_KEY 环境变量；初始 footer deepseek-flash，进入后 local-quick，选择退出后明确显示恢复失败与保留安全状态的中文错误；随后输入 A 仍被拦截，Ctrl-D exit 0。没有复制真实凭证或发送请求。真实有凭证成功恢复分支由主代理另行验证。

本次恢复失败修复后完整 `npm test`：23 个测试文件、157/157 通过（08:42 执行）；typecheck/build 均退出 0。

有凭证恢复补证（主代理真实宿主 instrumentation）：全局 Pi auth 下，setModel(study-offline/local-quick) 返回 true，setModel(deepseek/deepseek-flash) 返回 true；再次进入 /study 时 handler 的 ctx.model 仍为 deepseek-flash，证明恢复成功。先前即时 footer 留在 local-quick 是旧 UI 未刷新，不能仅凭 footer 推断恢复失败或凭证问题。菜单成功退出现显式通知“已退出学习，已恢复原模型；后续普通聊天不受本包预算保护”，同时触发界面刷新；失败分支仍保持安全态并报错，不发成功通知。新增成功/失败通知回归先红后绿。
