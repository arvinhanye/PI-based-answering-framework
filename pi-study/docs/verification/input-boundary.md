# Pi 输入边界调查

安装版本0.87.1；`probes/input.ts` 直接调用安装包的 ExtensionRunner.emitInput，以假extension handler调查，不伪称真实TUI验收。

- `agent-session.js:1218`：slash命令在input前执行；`sendUserMessage`在1570–1573可使用expandPromptTemplates并标注extension。slash handler本身不能证明真人。
- `extensions/runner.js:1097–1130`：transform链式执行，source保留原值；后续handler看见修改后的文本。其他extension可修改interactive文本，不能把source当不可伪造认证。
- 同段catch仅emitError，异常后继续；实测throw得到continue，必须显式返回handled且展示错误。
- 实测transform后的interactive输入可返回handled阻断；rpc与extension均不能直接提交/改额/揭晓。

可信应用路线：slash只打开菜单；确认写动作由真实interactive TUI menu handler或独立CLI调用；模型不注册写tool。离线provider与受控会话状态仍需root集成，实际宿主键盘/菜单人工验收尚未执行。安装包API自身不是抵抗恶意本地extension的安全沙箱。
