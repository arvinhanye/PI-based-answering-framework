import { localDate } from './scheduler.js';
import { StudyStore } from '../storage/business.js';
import type { QuestionInput } from '../contracts.js';
export interface QueueInput {
  bankId: string;
  timezone?: string;
  sourceId?: string;
  topic?: string;
  wrongOnly?: boolean;
}
export class ReviewService {
  constructor(private store: StudyStore) {
  }
  async queue(input: QueueInput) {
    return this.store.db.prepare('SELECT q.*,r.payload,v.due,v.last_correct FROM questions q JOIN revisions r ON r.id=q.current_revision_id JOIN review v ON v.question_id=q.id WHERE q.bank_id=? ORDER BY v.due').all(input.bankId).filter(r => (!input.sourceId || r.source_id === input.sourceId) && (!input.topic || JSON.parse(String(r.payload)).topics.includes(input.topic)) && (input.wrongOnly ? r.last_correct === 0 : String(r.due) <= localDate(new Date(), input.timezone))).map(r => ({
      id: String(r.current_revision_id), questionId: String(r.id), ...JSON.parse(String(r.payload)) as QuestionInput
    }));
  }
}
