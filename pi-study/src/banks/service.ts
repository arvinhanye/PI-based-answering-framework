import { randomUUID, createHash } from 'node:crypto';
import type { Bank, QuestionBankInput } from '../contracts.js';
import { StudyStore, CoreError } from '../storage/business.js';
// Paths describe local packaging, not question or provenance semantics.
export function canonicalBankPayload(input: QuestionBankInput): string {
  const semantic = {
    ...input,
    source: {
      ...input.source, originalPath: undefined
    },
    questions: input.questions.map(question => ({
      ...question,
      assets: question.assets.map(asset => ({
        ...asset, path: undefined
      }))
    }))
  };
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value))
      return value.map(normalize);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => [
        key, normalize(v)
      ]));
    }
    return value;
  };
  return JSON.stringify(normalize(semantic));
}
export class BankService {
  constructor(private store: StudyStore) {
  }
  async list(): Promise<Bank[]> {
    return this.store.db.prepare('SELECT id,name,created_at AS createdAt FROM banks ORDER BY created_at').all() as unknown as Bank[];
  }
  async create(name: string): Promise<Bank> {
    if (!name.trim())
      throw new CoreError('INVALID_INPUT', '题库名称为空');
    const b = {
      id: randomUUID(), name, createdAt: new Date().toISOString()
    };
    this.store.db.prepare('INSERT INTO banks VALUES(?,?,?)').run(b.id, b.name, b.createdAt);
    return b;
  }
  async listSources(bankId: string) {
    return this.store.db.prepare('SELECT id,hash,payload FROM sources WHERE bank_id=?').all(bankId).map(r => ({
      id: r.id, sha256: r.hash, ...JSON.parse(String(r.payload)).source
    }));
  }
  async select(id: string): Promise<Bank> {
    const b = (await this.list()).find(x => x.id === id);
    if (!b)
      throw new CoreError('INVALID_INPUT', '题库不存在');
    return b;
  }
  async importBank(input: QuestionBankInput, bankId?: string): Promise<{
    bankId: string;
    sourceId: string;
    imported: number;
    duplicates: number;
    review: number;
  }> {
    return this.store.transaction(() => {
      const previous = this.store.db.prepare('SELECT hash,bank_id,payload FROM sources WHERE id=?').get(input.source.id);
      if (previous) {
        if (previous.hash !== input.source.sha256 || (bankId && previous.bank_id !== bankId)
          || canonicalBankPayload(JSON.parse(String(previous.payload))) !== canonicalBankPayload(input)) {
          throw new CoreError('STORAGE_CONFLICT', '来源或转换内容发生变化；MVP 不自动升级，请使用新空间或等待来源迁移');
        }
        return {
          bankId: String(previous.bank_id), sourceId: input.source.id, imported: 0,
          duplicates: input.questions.length, review: input.questions.filter(q => q.status === 'needs_review').length
        };
      }
      const id = bankId ?? randomUUID();
      if (!bankId)
        this.store.db.prepare('INSERT INTO banks VALUES(?,?,?)').run(id, input.source.name, new Date().toISOString());
      else if (!this.store.db.prepare('SELECT id FROM banks WHERE id=?').get(id))
        throw new CoreError('INVALID_INPUT', '题库不存在');
      const sourceId = input.source.id;
      this.store.db.prepare('INSERT INTO sources VALUES(?,?,?,?)').run(sourceId, id, input.source.sha256, JSON.stringify(input));
      for (const q of input.questions) {
        const qid = randomUUID();
        const rid = createHash('sha256').update(qid + JSON.stringify(q)).digest('hex');
        this.store.db.prepare('INSERT INTO questions VALUES(?,?,?,?,?)').run(qid, id, sourceId, q.sourceKey, rid);
        this.store.db.prepare('INSERT INTO revisions VALUES(?,?,?,?)').run(rid, qid, JSON.stringify(q), new Date().toISOString());
      }
      return {
        bankId: id, sourceId, imported: input.questions.length, duplicates: 0, review: input.questions.filter(q => q.status === 'needs_review').length
      };
    });
  }
}
