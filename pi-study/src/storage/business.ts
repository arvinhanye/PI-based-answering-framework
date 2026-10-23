import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export class CoreError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'CoreError';
  }
}
export class StudyStore {
  readonly db: DatabaseSync;
  constructor(dataDir: string) {
    mkdirSync(dataDir, {
      recursive: true
    });
    this.db = new DatabaseSync(join(dataDir, 'study.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS schema_version(version INTEGER NOT NULL); INSERT INTO schema_version SELECT 1 WHERE NOT EXISTS(SELECT 1 FROM schema_version);
CREATE TABLE IF NOT EXISTS banks(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY,bank_id TEXT NOT NULL REFERENCES banks(id),hash TEXT NOT NULL,payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS questions(id TEXT PRIMARY KEY,bank_id TEXT NOT NULL REFERENCES banks(id),source_id TEXT NOT NULL REFERENCES sources(id),source_key TEXT NOT NULL,current_revision_id TEXT NOT NULL,UNIQUE(source_id,source_key));
CREATE TABLE IF NOT EXISTS revisions(id TEXT PRIMARY KEY,question_id TEXT NOT NULL REFERENCES questions(id),payload TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,bank_id TEXT NOT NULL REFERENCES banks(id),payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',current_id TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS presentations(id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES sessions(id),revision_id TEXT NOT NULL REFERENCES revisions(id),status TEXT NOT NULL DEFAULT 'open',draft TEXT NOT NULL DEFAULT '[]',assisted INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY,presentation_id TEXT NOT NULL UNIQUE REFERENCES presentations(id),session_id TEXT NOT NULL REFERENCES sessions(id),revision_id TEXT NOT NULL REFERENCES revisions(id),idempotency_key TEXT NOT NULL UNIQUE,input TEXT NOT NULL,receipt TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,event_id TEXT NOT NULL,origin TEXT NOT NULL,action TEXT NOT NULL,presentation_id TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS review(question_id TEXT PRIMARY KEY REFERENCES questions(id),stage INTEGER NOT NULL,due TEXT NOT NULL,last_correct INTEGER NOT NULL);
`);
  }
  transaction<T>(fn: () => T): T {
    try {
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const result = fn();
        this.db.exec('COMMIT');
        return result;
      }
      catch (e) {
        this.db.exec('ROLLBACK');
        throw e;
      }
    }
    catch (e) {
      if (String(e).includes('locked'))
        throw new CoreError('STORAGE_BUSY', '数据库忙，请重试');
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
export const openBusinessStore = (path: string) => new StudyStore(path);
