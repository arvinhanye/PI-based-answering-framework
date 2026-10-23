import { it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { StudyStore } from '../../src/storage/business.js';
import { BankService } from '../../src/banks/service.js';
import { JsonImporter } from '../../src/import/json.js';
import type { QuestionBankInput } from '../../src/contracts.js';
function bank(): QuestionBankInput {
  return {
    schemaVersion: 1, source: {
      id: 'same', name: 'source', sha256: 'a'.repeat(64)
    }, questions: [
      {
        sourceKey: '1', kind: 'single', stem: 'Original stem', options: [
          {
            id: 'A', text: 'yes'
          }, {
            id: 'B', text: 'no'
          }
        ], answer: [
          'A'
        ], rawAnswer: 'A', explanation: 'original explanation', topics: [], status: 'ready', basisStatus: 'source_only', issues: [], locations: [], assets: []
      }
    ], report: {
      candidateCount: 1, ready: 1, needsReview: 0, gaps: []
    }
  };
}
it('same original hash with changed converted question conflicts and preserves immutable snapshot', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'study-import-'));
  const store = new StudyStore(join(dir, 'data'));
  try {
    const file = join(dir, 'bank.json');
    const importer = new JsonImporter(new BankService(store), join(dir, 'data'));
    writeFileSync(file, JSON.stringify(bank()));
    await importer.import(file);
    const snapshots = join(dir, 'data', 'sources', 'a'.repeat(64));
    const before = new Map(readdirSync(snapshots).map(p => [
      p, readFileSync(join(snapshots, p), 'utf8')
    ]));
    const changed = bank();
    changed.questions[0]!.stem = 'Changed conversion';
    writeFileSync(file, JSON.stringify(changed));
    await expect(importer.import(file)).rejects.toMatchObject({
      code: 'STORAGE_CONFLICT'
    });
    for (const [path, bytes] of before)
      expect(readFileSync(join(snapshots, path), 'utf8')).toBe(bytes);
    expect(JSON.parse(String(store.db.prepare('SELECT payload FROM sources').get()!.payload)).questions[0].stem).toBe('Original stem');
  }
  finally {
    store.close();
    rmSync(dir, {
      recursive: true, force: true
    });
  }
});
it('canonical semantic duplicates ignore object key order and asset or original paths', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'study-import-'));
  const store = new StudyStore(dir);
  try {
    const service = new BankService(store);
    const first = bank();
    first.source.originalPath = '/original/absolute.docx';
    first.questions[0]!.assets = [
      {
        path: '/one/image.png', sha256: 'b'.repeat(64), mime: 'image/png', role: 'question'
      }
    ];
    const imported = await service.importBank(first);
    const second = JSON.parse(JSON.stringify(first, (key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).reverse()) : value));
    second.source.originalPath = 'relative.docx';
    second.questions[0].assets[0].path = 'relative/image.png';
    expect(await service.importBank(second)).toMatchObject({
      bankId: imported.bankId, duplicates: 1, imported: 0
    });
    second.questions[0].assets[0].sha256 = 'c'.repeat(64);
    await expect(service.importBank(second)).rejects.toMatchObject({
      code: 'STORAGE_CONFLICT'
    });
  }
  finally {
    store.close();
    rmSync(dir, {
      recursive: true, force: true
    });
  }
});
it('source processing metadata changes are not silently discarded', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'study-import-'));
  const store = new StudyStore(dir);
  try {
    const service = new BankService(store);
    await service.importBank(bank());
    const next = bank();
    next.source.paragraphCount = 24;
    await expect(service.importBank(next)).rejects.toMatchObject({
      code: 'STORAGE_CONFLICT'
    });
  }
  finally {
    store.close();
    rmSync(dir, {
      recursive: true, force: true
    });
  }
});
