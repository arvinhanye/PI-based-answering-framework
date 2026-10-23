# 构建、测试与安装验证

2026-10-23，macOS x86_64，Node 26.4.0，Pi 0.87.1。

- 完整运行 `npm run typecheck && npm test && npm run build`：23个测试文件、158项测试通过；真实来源文件在本机存在，因此来源转换回归实际运行。
- 独立增量审查发现的答前问题说明泄漏已关闭。模型恢复失败、取消后的未知预占、配置过期、同原件转换变化等回归已纳入测试。
- `npm pack` 白名单只包含运行产物、转换入口、原生辅助源码、schema、配置示例和文档；不包含题库原件、转换结果、数据库、凭证、node_modules或本地编译二进制。
- 在 `/tmp/pi-study-package-acceptance/clean` 空目录通过 npm 安装本地tgz及声明依赖，未依赖工作区node_modules；CLI help成功。随后在安装后的native目录用clang编译，使用安装包自带源码制作单页人工PDF，并从安装后的converter入口转换：1候选、1ready、答案B、4选项、gaps0。本次没有云端OCR。
- 真实三来源CLI、备份恢复、Pi终端与API结果分开保存在本目录和上级Pi验收文档中。正式业务空间没有模拟作答；当前财务估算0.020206元来自真实API验收。
- 已添加GitHub Actions配置（Node24，类型检查、测试、构建和打包）。远程CI尚未运行，不宣称其通过；Windows/Linux及Node24真实运行也没有本机验收记录。

人工金标准确认、系统图片预览窗口以及供应商最终账单对账未完成。完整首版剩余范围见checklist.md。
