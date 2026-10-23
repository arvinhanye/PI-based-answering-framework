import { readFileSync, statSync } from 'node:fs';
import { Container, Image, Text, Spacer, getCapabilities, getImageDimensions } from '@earendil-works/pi-tui';
import type { MessageRenderer } from '@earendil-works/pi-coding-agent';
import type { AssetInput } from '../../contracts.js';
import { safeQuestionImages } from './images.js';

/** Paths are metadata, never authority: resolve them inside this application's assets directory. */
export function createStudyRenderer(dataDir: string): MessageRenderer {
    return (message, options, theme) => {
        const content = String(message.content);
        const plain = (text = content) => new Text(text, options.outputPad, 1);
        const protocol = getCapabilities().images;
        const details = message.details as { images?: AssetInput[] } | undefined;
        const marker = /^📎 \d+ 张题图，输入 图 打开$/m;
        const match = marker.exec(content);
        if (!protocol || !match || !Array.isArray(details?.images) || !details.images.length) return plain();
        try {
            let bytes = 0;
            const images = safeQuestionImages(dataDir, details.images);
            if (!images.length) return plain();
            const body = new Container();
            body.addChild(new Text(content.slice(0, match.index).trimEnd(), options.outputPad, 1));
            images.forEach((file, index) => {
                const size = statSync(file.path).size;
                // pi-tui's kitty encoder transmits PNG; other formats retain external opening.
                if (size > 10 * 1024 * 1024 || bytes + size > 20 * 1024 * 1024 || (protocol === 'kitty' && file.mime !== 'image/png')) {
                    body.addChild(new Text(`图 ${index + 1} / ${images.length}：输入 图 打开`, options.outputPad, 0));
                    return;
                }
                bytes += size;
                const base64 = readFileSync(file.path).toString('base64');
                const dimensions = getImageDimensions(base64, file.mime);
                if (!dimensions) {
                    body.addChild(new Text(`图 ${index + 1} / ${images.length} 无法内联显示，输入 图 打开`, options.outputPad, 0));
                    return;
                }
                body.addChild(new Image(base64, file.mime, { fallbackColor: text => theme.fg('dim', text) }, { maxWidthCells: Number.MAX_SAFE_INTEGER, maxHeightCells: 20 }, dimensions));
                body.addChild(new Text(`图 ${index + 1} / ${images.length}`, options.outputPad, 0));
                body.addChild(new Spacer(1));
            });
            const after = content.slice(match.index + match[0].length).trim();
            if (after) body.addChild(new Text(after, options.outputPad, 1));
            return body;
        } catch {
            return plain(content.replace(marker, '⚠ 题图无法安全读取，请检查本地题库文件'));
        }
    };
}
