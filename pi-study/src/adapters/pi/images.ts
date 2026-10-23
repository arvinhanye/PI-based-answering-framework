import { realpathSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep, extname } from 'node:path';
import type { AssetInput } from '../../contracts.js';
export function safeQuestionImages(dataDir: string, assets: AssetInput[]) {
    const candidates = assets.filter(a => a.role === 'question' && ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(a.mime));
    if (!candidates.length)
        return [];
    const base = realpathSync(resolve(dataDir, 'assets'));
    return candidates.map(a => { const path = realpathSync(resolve(dataDir, a.path)), rel = relative(base, path); if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel) || !statSync(path).isFile() || !/^\.(png|jpe?g|webp|gif)$/i.test(extname(path)))
        throw Error('题图路径不安全'); return { path, mime: a.mime, caption: a.caption ?? '' }; });
}
