#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ "$(uname -s)" != Darwin ]; then
  echo '本地媒体工具目前仅在 macOS 验证。' >&2
  exit 2
fi
if ! command -v clang >/dev/null 2>&1; then
  echo '需要现有的 Apple Command Line Tools；安装后重新运行本脚本。' >&2
  exit 2
fi
# Offline, existing system frameworks; never installs dependencies or calls a network service.
clang -fobjc-arc -framework Foundation -framework PDFKit -framework Vision -framework AppKit ocr.m -o ocr-fast
clang -fobjc-arc -framework AppKit crop.m -o crop
