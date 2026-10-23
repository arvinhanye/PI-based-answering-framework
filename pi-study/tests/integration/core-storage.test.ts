import { it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StudyStore } from '../../src/storage/business.js';
function child(code: string) {
  return new Promise<{
    code: number | null;
    error: string;
  }>((resolve, reject) => {
    const p = spawn(process.execPath, [
      '--input-type=module', '-e', code
    ], {
      stdio: [
        'ignore', 'pipe', 'pipe'
      ]
    });
    let error = '';
    p.stderr.on('data', b => error += b);
    p.on('error', reject);
    p.on('exit', code => resolve({
      code, error
    }));
  });
}
it('two_process_writes_preserve_rows_and_crash_rolls_back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'study-storage-'));
  const store = new StudyStore(dir);
  try {
    const path = JSON.stringify(join(dir, 'study.sqlite'));
    const script = (prefix: string) => `import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync(${path});db.exec('PRAGMA busy_timeout=5000');for(let n=0;n<20;n++){db.exec('BEGIN IMMEDIATE');db.prepare('INSERT INTO banks VALUES(?,?,?)').run('${prefix}'+n,'bank',new Date().toISOString());db.exec('COMMIT')}db.close()`;
    const results = await Promise.all([
      child(script('a')), child(script('b'))
    ]);
    expect(results.map(x => x.code)).toEqual([
      0, 0
    ]);
    expect(store.db.prepare('SELECT count(*) AS n FROM banks').get()!.n).toBe(40);
    const crash = await child(`import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync(${path});db.exec('BEGIN IMMEDIATE');db.prepare('INSERT INTO banks VALUES(?,?,?)').run('crash','bad','now');process.exit(9)`);
    expect(crash.code).toBe(9);
    expect(store.db.prepare("SELECT id FROM banks WHERE id='crash'").get()).toBeUndefined();
    store.transaction(() => store.db.prepare('INSERT INTO banks VALUES(?,?,?)').run('after', 'ok', 'now'));
    expect(store.db.prepare("SELECT id FROM banks WHERE id='after'").get()).toBeDefined();
  }
  finally {
    store.close();
    rmSync(dir, {
      recursive: true, force: true
    });
  }
});
