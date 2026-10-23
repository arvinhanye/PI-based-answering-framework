import { readFileSync, realpathSync, statSync, mkdirSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, join, extname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { BankService } from '../banks/service.js';
import { CoreError } from '../storage/business.js';
import { validateQuestionBank } from './validation.js';
export const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
function readLimited(path: string, limit: number) {
  const s = statSync(path);
  if (!s.isFile() || s.size > limit)
    throw new Error('文件类型或容量超出导入限制');
  return readFileSync(path);
}
export class JsonImporter {
  constructor(private banks: BankService, private dataDir: string) {
  }
  async import(path: string, bankId?: string) {
    path = realpathSync(path);
    const base = dirname(path);
    const input = validateQuestionBank(JSON.parse(readLimited(path, 256 * 1024 * 1024).toString('utf8')));
    // Validate every source asset before creating any database record.
    let total = 0;
    const copies = new Map<string, {
      bytes: Buffer;
      target: string;
    }>();
    for (const q of input.questions)
      for (const a of q.assets) {
        const resolved = realpathSync(resolve(base, a.path));
        const rel = relative(base, resolved);
        if (rel.startsWith('..' + requireSeparator()) || rel === '..' || isAbsolute(rel))
          throw new Error('图片路径越界');
        const bytes = readLimited(resolved, 256 * 1024 * 1024);
        if (sha256(bytes) !== a.sha256)
          throw new Error('图片校验和不匹配');
        const suffix = extname(resolved).toLowerCase();
        const safeSuffix = /^\.[a-z0-9]{1,8}$/.test(suffix) ? suffix : '.bin';
        const target = join('assets', a.sha256 + safeSuffix);
        if (!copies.has(target)) {
          total += bytes.length;
          if (total > 1024 * 1024 * 1024)
            throw new Error('图片总容量超出限制');
        }
        copies.set(target, {
          bytes, target
        });
        a.path = target;
      }
    let original: {
      bytes: Buffer;
      target: string;
    } | undefined;
    if (input.source.originalPath) {
      const p = resolve(base, input.source.originalPath), bytes = readLimited(p, 512 * 1024 * 1024);
      if (sha256(bytes) !== input.source.sha256)
        throw new Error('原件校验和与来源版本不匹配');
      original = {
        bytes, target: join('sources', input.source.sha256, 'original' + extname(p).toLowerCase())
      };
      input.source.originalPath = original.target;
    }
    const save = (target: string, bytes: Uint8Array | string) => {
      const dest = join(this.dataDir, target);
      mkdirSync(dirname(dest), {
        recursive: true, mode: 0o700
      });
      if (existsSync(dest)) {
        if (sha256(readFileSync(dest)) === sha256(bytes))
          return;
        throw new CoreError('STORAGE_CONFLICT', '不可变导入文件已存在但内容不一致');
      }
      const temp = dest + '.' + randomUUID() + '.tmp';
      writeFileSync(temp, bytes, {
        mode: 0o600
      });
      renameSync(temp, dest);
    };
    for (const c of copies.values())
      save(c.target, c.bytes);
    if (original)
      save(original.target, original.bytes);
    const result = await this.banks.importBank(input, bankId);
    // Successful imports get immutable payload snapshots; conflicting imports never replace one.
    const snapshot = JSON.stringify(input, null, 2);
    save(join('sources', input.source.sha256, 'bank-' + sha256(snapshot) + '.json'), snapshot);
    return result;
  }
}
function requireSeparator() {
  return process.platform === 'win32' ? '\\' : '/';
}
