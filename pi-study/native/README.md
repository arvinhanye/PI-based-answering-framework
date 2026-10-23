# macOS local media tools

Run `sh native/build.sh` from an installed pi-study package before using the PDF converter. This compiles the shipped Objective-C sources against existing PDFKit, Vision and AppKit frameworks; it installs nothing and makes no network requests. Missing build products produce an explicit converter error.

`ocr-fast SOURCE.pdf OUTPUT_DIR [START_PAGE] [END_PAGE]` renders pages and stores positioned Vision text plus original-page PNGs. Successful JSON pages are reusable; failed pages are retried. Source-version checks live in the converter checkpoint. `crop INPUT.png OUTPUT.png X Y WIDTH HEIGHT` uses normalized top-left coordinates.

`ocr.swift` and `render.swift` preserve the tested Swift route as an alternative. The default build uses the faster-to-compile Objective-C route and does not require any Codex cache or Python modules. Native execution may need system resource access for Vision CVPixelBuffer allocation; sandbox failures remain explicit per-page errors, never successful conversions.

`make-fixture.m` creates a synthetic local PDF for installation smoke tests. No real source material or answer key is embedded in the helper.
