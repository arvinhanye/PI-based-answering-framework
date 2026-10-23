# Pi 交互与集成

当前流程以 [README](../README.md) 和 [交互验收记录](acceptance/2026-10-23-ux-redesign.md) 为准。

- `/study` 直接展示当前题。输入答案回车判分；`n` 下一题；`/study undo` 撤销；`/study exit` 恢复原模型与工具。`/study menu` 只有一层，Esc 返回。
- 仅 `input` 事件的 interactive 输入或独立 CLI 可以作答；不注册任何 `study_*` 模型工具，不弹确认框。其他来源输入在学习态下被本地处理。
- 原生 DeepSeek 负责流式 Markdown、追问、思考。`context` 只投影当前题开始后的对话；卡片、旧题问答不进入请求，但保留在 transcript。
- 题图必须属于 question 角色，realpath 位于当前空间 assets 内，且是支持的图像格式；单张大于 10 MiB 或合计超过 20 MiB 的图不发送并明确说明。系统打开图片使用 execFile，无 shell 拼接。
- 活跃回答期间不换题；Esc 可停止，`/study exit` 会停止回答并退出。计费按属于该学习请求的返回 usage，原周期结算。退出后的普通聊天不记入学习费用。
- 费用、导入、备份与学习核心独立于 Pi 适配层；CLI 和未来平台可复用。

已删除旧的 `/study-answer`、`/study-exit`、固定 hint、草稿菜单、离线 provider、付费网关、预留状态机和手动查证入口。历史业务记录及已保存证据保留。
