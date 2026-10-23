# Pi Study 交互改造第二轮审查

日期：2026-10-23。审查人：Claude（Opus 5.5）。实现方：Codex。

审查对象：提交 `14f365f`、`c62ebe5`、`6a363f1`，即按 [交互改造规格](../specs/2026-10-23-pi-study-ux-redesign.md) 完成的改动。依据：用户在 macOS 真实 Pi 终端里的试用截图和反馈、源码阅读，以及对 Pi 0.87.1 安装包源码和正式数据空间的只读检查。

本轮审查没有修改代码。下面的问题按建议的处理顺序排列（§5）。改造规格 §0 的三条原则继续有效：不加确认框、不为严谨性增加操作步数、界面上不出现内部术语。

## 0. 总体评价

主体方向已经落地：打字作答、`n` 下一题、`/study undo`、Pi 原生 DeepSeek 对话（题图也能发给模型，验收记录里有真实请求）、软记账、费率过期机制删除，这些都正确。剩下的问题集中在三处：

1. 快捷键在 Mac 上大概率按不出来；
2. 题图用户实际看不到，也很难遇到；
3. 卡片上的提示信息过多，还夹着内部代码，干扰读题。

## 1. 已核实的事实

| 事实 | 依据 |
| --- | --- |
| `Ctrl+O` 被 Pi 保留（`app.tools.expand`），扩展注册会被跳过 | 全局 `@earendil-works/pi-coding-agent/dist/core/extensions/runner.js` 第 9–28 行 `RESERVED_KEYBINDINGS_FOR_EXTENSION_CONFLICTS` |
| `Ctrl+N` 只绑定在 `app.session.toggleNamedFilter`（会话选择器内），**不在保留列表中**。扩展注册后扩展优先生效，Pi 只记录一条冲突警告 | 同上 `runner.js` 第 419–433 行；`dist/core/keybindings.js` 第 57–60 行 |
| Mac 的 Alt 键即 Option。Terminal.app 和 iTerm2 默认不把 Option 作为 Meta 发送，因此 `Ctrl+Alt+N` 在默认设置下很可能不触发 | macOS 终端默认设置；Codex 的验收（`pi-study/docs/acceptance/2026-10-23-ux-redesign.md` 第 62–63 行）是在 PTY 中写入字节序列，没有用真实键盘验证 |
| pi-tui 自带 `Image` 组件。Ghostty、kitty、WezTerm、Warp 使用 kitty 协议，iTerm2 使用 iTerm2 协议，都能内联显示图片；Terminal.app、VS Code、tmux 内不支持 | `@earendil-works/pi-tui/dist/components/image.d.ts`；`dist/terminal-image.js` 第 36–88 行 `detectCapabilitiesFromEnvironment` |
| 1500 题文档没有题图；带图的题只有省赛 2 题（`p51`、`p626`）和 PDF 160 题（例如 `p1-q3`、`p2-q10`）。默认顺序 1500 题 → 省赛 → PDF，用户要做完 1500 多题才会遇到第一张图 | 正式数据空间 `spaces/mvp-2026-10-23/study.sqlite` 只读查询 |
| 各问题代码的出现次数：`ocr_text_unverified` 979、`no_explanation` 109、`source_anomaly_confirmed` 8、`single_answer_cardinality` 7、`missing_figure` 3、`duplicate_option_labels` 3、`missing_answer` 2、`source_explanation_disputed` 1、`missing_option_content` 1、`invalid_option_answer` 1 | 同上 |
| 结果卡片把 `feedback.issues` 原样输出为 `⚠ 资料提示：<代码>`。因此**每一道 PDF 题**的结果卡片都会出现 `ocr_text_unverified` | `pi-study/src/presentation/cards.ts` `resultCard` |
| 1500 题第 3 题只有 `source_explanation_disputed`（解析中的公式与结论不符，答案 B 本身无争议），却因 `status: needs_review` 整题不计分 | 数据空间查询；用户截图 |
| 预算金额以 8 位小数显示（例如 `0.03582312`） | `pi-study/src/budget/ledger.ts` `view()` 的 `spentCny`；用户截图 |

## 2. 快捷键

### 问题

- 卡片和常驻提示写着 `Ctrl+Alt+N`、`Ctrl+Alt+O`。在 Mac 上用户看到的是 Alt，键盘上却是 Option，并且按键在默认终端设置下很可能没有反应。
- 改用 Ctrl+Alt 的理由是“`Ctrl+N` / `Ctrl+O` 已被 Pi 占用”。这只对 `Ctrl+O` 成立，见 §1。

### 方案

| 操作 | 主要方式 | 辅助方式 |
| --- | --- | --- |
| 下一题 | 输入 `n` 或 `下` | `Ctrl+N`（`pi.registerShortcut('ctrl+n', …)`） |
| 打开题图 | 输入 `图` | 无 |

- 删除 `ctrl+alt+n`、`ctrl+alt+o` 两个快捷键注册。
- `图` 加入 `classifyStudyInput`，优先级与 `n` 相同。它不是任何题型的合法作答，不会与作答格式冲突。
- 所有界面文字中不再出现带 Alt 的组合键。`Ctrl+N` 可以只写在 README 里，常驻提示行只写 `n`。
- 在 README 中说明 `Ctrl+N` 会让 Pi 打出一条快捷键冲突警告，这是预期行为。

## 3. 题图

### 问题

1. 题图只能通过外部程序打开，而触发按键（`Ctrl+Alt+O`）大概率按不出来。
2. 在默认出题顺序下，用户很难遇到带图的题，没法验证。

### 方案

**3.1 在题目卡片中内联显示题图。** 在 `study-card` 的消息渲染器中，当前终端支持图片时（用 pi-tui 的能力检测，不要自己读环境变量），在选项下方用 `Image` 组件渲染题图：

- 宽度不超过终端宽度，`maxHeightCells` 建议 20 左右，保证图和选项能在一屏内看到；
- 多张图依次显示，图下方写“图 1 / 2”这类编号；
- 图片数据从数据空间读取，沿用 `safeQuestionImages` 的路径校验；
- 消息内容（`content`）仍然只放文字，图片放在 `details` 里由渲染器读取，不要把 base64 写进对话记录正文。

**3.2 不支持内联的终端退回到外部打开。** 卡片上写 `📎 1 张题图，输入 图 打开`，输入 `图` 后用系统默认程序打开（macOS 用 `open`）。支持内联的终端也保留 `图`，方便放大查看。

**3.3 让题图能被测到。** 在 README 和验收记录里写明测试路径：`/study pdf` 的前几题就带图（例如 `p1-q3`）。不需要为此新增命令。

**3.4 验收**：**用户实际使用的终端是 Warp（macOS）**，以 Warp 为主要验收环境。pi-tui 把 Warp 识别为支持 kitty 图形协议（`terminal-image.js` 第 61–63 行，依据 `TERM_PROGRAM=WarpTerminal` 或 `WARP_SESSION_ID`），所以在 Warp 中应能内联看到题图。这一点只是代码层面的判断，还没有实测，务必在 Warp 里截图确认。如果 Warp 中内联显示失败（不显示、错位、残影），记录现象，并临时把 Warp 退回到“输入 图 打开”的路径，不要让卡片出现乱码。Terminal.app 只需验证“输入 图 能打开”。

## 4. 卡片信息

### 4.1 问题代码翻译和分类

**界面上不得出现任何问题代码。** 每个代码按下表处理：

| 代码 | 类别 | 是否计分 | 题目卡片（作答前） | 结果卡片（作答后） |
| --- | --- | --- | --- | --- |
| `ocr_text_unverified` | 处理过程标记 | 照常 | 不显示 | 不显示 |
| `no_explanation` | 解析问题 | 照常 | 不显示 | 只显示“题库未提供解析”，不另加警告行 |
| `source_explanation_disputed` | 解析问题 | **照常** | 不显示 | 解析后加：`⚠ 这段解析可能有误，可以直接问 DeepSeek` |
| `missing_figure` | 影响作答 | 不计分 | `⚠ 原题缺图，本题不计分` | 结论行写“原题缺图” |
| `missing_option_content` | 影响作答 | 不计分 | `⚠ 原题缺少选项内容，本题不计分` | 结论行写“原题缺少选项内容” |
| `duplicate_option_labels` | 影响作答 | 不计分 | `⚠ 原题选项编号重复，本题不计分` | 结论行写“原题选项编号重复” |
| `single_answer_cardinality` | 影响作答 | 不计分 | `⚠ 原题答案个数与题型不符，本题不计分` | 结论行写“原题答案个数与题型不符” |
| `missing_answer` | 影响判分 | 不计分 | 不显示 | 结论行写“原题没有给答案” |
| `invalid_option_answer` | 影响判分 | 不计分 | 不显示 | 结论行写“原题答案不在选项中” |
| `source_anomaly_confirmed` | 影响判分 | 不计分 | 不显示 | 结论行写“原件此题有误” |
| 未知代码 | — | 按现有 `status` 决定 | 不显示 | `⚠ 这题资料有其他问题`，代码只写日志 |

要点：

- **是否计分由问题类别决定，不再只看 `status: needs_review`。** 一道题只有解析问题或处理过程标记时，按正常题判分。改完后 1500 题第 3 题应当计分。请重新统计不计分的题数，并更新 `docs/acceptance/checklist.md` 里的数字（原为 15 题）。
- 一道题有多个影响作答的问题时，题目卡片只显示一行，结论行用“；”连接。
- 翻译表放在一个地方（例如 `src/presentation/issues.ts`），卡片、CLI 和 DeepSeek 上下文共用。发给 DeepSeek 的 `issues` 也改成中文说明，不发代码。

### 4.2 卡片版式

题目卡片：

```
第 3 题 · 单选 · 无线 · 1500题
以5GHz为例，收发天线若相距1km，区域的半径大致为？

A. 2.4m
B. 3.6m
C. 5.6m
D. 6.2m

📎 1 张题图，输入 图 打开          ← 仅在不能内联显示时出现
⚠ 原题缺图，本题不计分              ← 仅在有影响作答的问题时出现
```

结果卡片（答对，解析可疑）：

```
✓ 正确　答案 B

解析：收发天线相距1km，属于大范围无线传输场景……可得区域的半径大致为3.6m。
⚠ 这段解析可能有误，可以直接问 DeepSeek
```

结果卡片（答错，多选）：

```
✗ 错误　你选 A、C，正确答案 A、B、D
漏选 B、D · 多选 C

解析：……
```

结果卡片（不计分）：

```
— 不计分（原题没有给答案）

题库未提供解析
```

规则：

- **卡片里不放任何操作提示**：删除“输入答案，或直接打字问 DeepSeek（…）”“n / Ctrl+Alt+N 下一题 · …”“n 下一题 · …”“/study undo 撤销本题作答”这几行。
- **常驻提示只保留输入框下方的一行**（`setWidget('study-help')`），并把 `setStatus` 里的内容合并进来，避免两处都显示金额：

  ```
  n 下一题 · 图 打开题图 · 直接打字问 DeepSeek · 本轮 对 1 · 错 2 · 本月 0.04 / 10 元
  ```

  当前题没有题图时省略“图 打开题图”；思考模式开启时在最前面加“思考 · ”。`/study undo`、`/study menu`、`/study exit` 不放进这一行，由 `/study` 命令的描述和 README 说明。
- **本轮成绩**从卡片标题移到常驻提示行，写成“本轮 对 1 · 错 2”，不再使用“0/2 ✓”。
- **金额保留两位小数**；大于 0 但不足 0.01 元时显示 `<0.01`。账本内部精度不变，只改显示（Pi 和 CLI 都改）。
- **题干末尾的【…考点】在显示时去掉**，标题里已经有考点。只改显示，不改导入数据。
- **空行分隔**：题干与选项之间、选项与题图或警告之间、结论行与解析之间各空一行；两张卡片之间至少一个空行。
- 卡片仍然不出现“参考”“依据”“source_only”“辅助作答”等字样（改造规格 §4.2）。
- CLI 的卡片文字同步使用上述版式（不含常驻提示行）。

## 5. 处理顺序

1. **§4.1 代码翻译与计分分类。** 改动集中，每道 PDF 题都会受益，也修正第 3 题误判为不计分的问题。
2. **§4.2 卡片版式**，包括合并常驻提示、金额两位小数、去掉重复的考点。
3. **§2 快捷键。**
4. **§3 题图内联显示与外部打开。**

每完成一项可以单独提交，方便用户分段试用。

## 6. 验收

在 `pi-study/docs/acceptance/` 下追加真实 Pi 终端的截图或文字记录，至少覆盖：

1. 1500 题第 3 题：作答前卡片没有警告；答 B 显示“✓ 正确”并计入本轮成绩；解析下方有“这段解析可能有误”。
2. 任意一道 PDF 题作答后，结果卡片不出现 `ocr_text_unverified` 或任何英文代码。
3. 一道缺解析的题只显示“题库未提供解析”一行。
4. 一道 `missing_figure` 或 `single_answer_cardinality` 的题：作答前卡片有一行具体说明，作答后显示“— 不计分（…）”。
5. 卡片中没有任何操作提示行；输入框下方只有一行常驻提示，金额为两位小数，成绩写成“本轮 对 x · 错 y”。
6. 题干末尾不再出现【…考点】。
7. 在 **Warp** 中用真实 Mac 键盘：输入 `n` 换题；按 `Ctrl+N` 换题（不能用 PTY 写入字节代替）；`Ctrl+Alt` 组合键已不在任何界面文字中。如果 Warp 自己拦截了 `Ctrl+N`，在 README 中说明，并以 `n` 为准。
8. `/study pdf` 遇到带图题：**Warp 中直接看到图**，输入 `图` 能打开系统“预览”；Terminal.app 中输入 `图` 能打开系统“预览”。
9. 用代码全文搜索确认：界面字符串中不包含表 4.1 里的任何代码，也不包含 `Ctrl+Alt`。
10. `npm run typecheck`、`npm test` 通过；新增问题翻译表、计分分类、金额格式化和题干考点去除的单元测试。
