import { StudyStore } from '../storage/business.js';
export class PendingService {
  constructor(private store: StudyStore) {
  }
  async list(bankId: string) {
    return this.store.db.prepare('SELECT q.id,q.source_id,r.id AS revision_id,r.payload FROM questions q JOIN revisions r ON r.id=q.current_revision_id WHERE q.bank_id=?').all(bankId).filter(r => JSON.parse(String(r.payload)).status === 'needs_review').map(r => ({
      questionId: r.id, revisionId: r.revision_id, sourceId: r.source_id, ...JSON.parse(String(r.payload))
    }));
  }
}
