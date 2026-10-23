import { test, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
test('runtime supports real SQLite transactions', () => {
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE sample (id TEXT PRIMARY KEY); BEGIN IMMEDIATE; INSERT INTO sample VALUES (\'ok\'); COMMIT;');
 expect(db.prepare('SELECT id FROM sample').get()?.id).toBe('ok'); db.close();
});
