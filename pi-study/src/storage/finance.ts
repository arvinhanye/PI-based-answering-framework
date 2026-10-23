import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
export function openFinance(path: string, initialize = false, identityPath = path + '.identity'): DatabaseSync {
    const exists = existsSync(path), marker = existsSync(identityPath);
    if (exists !== marker || (!exists && !initialize))
        throw new Error('finance ledger missing or identity conflict; paid requests frozen');
    mkdirSync(dirname(path), {
        recursive: true
    });
    const db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    if (!exists) {
        db.exec('CREATE TABLE identity(id TEXT PRIMARY KEY); CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE periods(id TEXT PRIMARY KEY,limit_nano TEXT NOT NULL); CREATE TABLE requests(id TEXT PRIMARY KEY,period TEXT NOT NULL REFERENCES periods(id),upper_nano TEXT NOT NULL,actual_nano TEXT,state TEXT NOT NULL,digest TEXT NOT NULL,rate TEXT NOT NULL);');
        const id = randomUUID();
        db.prepare('INSERT INTO identity VALUES(?)').run(id);
        writeFileSync(identityPath, id, {
            flag: 'wx', mode: 0o600, flush: true
        });
        db.prepare('INSERT INTO meta VALUES(?,?)').run('revision', '0');
        writeFileSync(identityPath + '.witness', '0', {
            flag: 'wx', mode: 0o600, flush: true
        });
    }
    if ((db.prepare('SELECT id FROM identity').get() as any)?.id !== readFileSync(identityPath, 'utf8')) {
        db.close();
        throw new Error('finance ledger identity conflict');
    }
    return db;
}
