# 本地媒体处理实测（2026-10-23）

平台：本机 macOS，Apple Command Line Tools Swift 6.3.3、系统 PDFKit / Vision / AppKit。未安装系统工具、未上传资料、未调用付费服务。

- 首先尝试 Swift PDFKit/Vision。首次 SDK 模块编译耗时约数分钟，期间使用同框架 Objective-C 入口 `native/ocr.m` 验证路线。Swift 编译随后成功，后半页批次实际使用 Swift。
- 沙箱内 PDFKit 成功渲染235页，但 Vision 全部返回 `Failed to create CVPixelBuffer`；没有把这些失败记成转换成功。获自动审批的本地沙箱外执行后，235页均产生非空 OCR 行，原始 PDF 文字层全为空。
- 正式原始识别记录与原页在 `converted/pdf-pages-local/`，每页包含归一化左上原点 bbox、置信度、引擎和页号。原沙箱失败实验在 `converted/pdf-pages/`；它不作为正式转换输入。
- 全量本地 OCR 两个页段并行完成约数分钟；这不是云服务吞吐。Vision 在中文、数字和命令小字上存在真实错误，例如“某→菜”、命令尖括号／脱字符误识别、MAC/IP 图中文字和圈选字母误识别。置信度不能当作真值正确率。
- 省赛2张嵌入拓扑图已逐张由代理视觉查看，未含答案；可以作为 question 资源。PDF整页均为 source 资源，不能进入答题前视图。PDF题图裁剪排除含答案的题干行与选项；嵌入截图的绿色正确选项也须排除。第3页题图的实际安全裁剪已打开核对。

代理视觉检查已查看 PDF 1、2、15、19、20、60、100、120、180、235页，另查看第3、18、124页；至少覆盖20个题干。检查发现的错误用于修复解析和精确源 hash 限定校对表。代理视觉检查不是用户人工真值验收。终端图片内联、用户本地打开与真实 Pi 展示仍需产品轨实际验收。

重新构建本地工具：`native/build.sh`。OCR：`native/ocr-fast SOURCE.pdf OUTPUT_DIR`。文件保留页级 JSON，可从成功页继续；源 hash 检查由转换器 checkpoint 执行。
