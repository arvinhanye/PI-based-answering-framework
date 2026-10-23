import { localDate } from './scheduler.js';
import { StudyStore } from '../storage/business.js';
export interface StatsQuery {
  bankId: string;
  timezone?: string;
  sourceId?: string;
  topic?: string;
}
export class StatisticsService {
  constructor(private store: StudyStore) {
  }
  async read(input: StatsQuery) {
    const questions = this.store.db.prepare('SELECT q.*,r.payload FROM questions q JOIN revisions r ON r.id=q.current_revision_id WHERE q.bank_id=?').all(input.bankId).filter(q => (!input.sourceId || q.source_id === input.sourceId) && (!input.topic || JSON.parse(String(q.payload)).topics.includes(input.topic)));
    const ids = new Set(questions.map(q => q.id));
    const rows = this.store.db.prepare('SELECT s.*,r.question_id FROM submissions s JOIN revisions r ON r.id=s.revision_id WHERE s.voided_at IS NULL ORDER BY s.created_at,s.rowid').all().filter(s => ids.has(s.question_id));
    const groups = {
      independent: {
        numerator: 0, denominator: 0
      }, assisted: {
        numerator: 0, denominator: 0
      }
    };
    const latest = new Map<string, any>();
    let historicalNumerator = 0, historicalDenominator = 0, excluded = 0;
    const covered = new Set();
    for (const row of rows) {
      const receipt = JSON.parse(String(row.receipt));
      if (receipt.grade.status !== 'scored') {
        excluded++;
        continue;
      }
      covered.add(row.question_id);
      historicalDenominator++;
      if (receipt.grade.correct)
        historicalNumerator++;
      latest.set(String(row.question_id) + (receipt.assisted ? ':assisted' : ':independent'), receipt);
    }
    for (const r of latest.values()) {
      const g = r.assisted ? groups.assisted : groups.independent;
      g.denominator++;
      if (r.grade.correct)
        g.numerator++;
    }
    const review = this.store.db.prepare('SELECT * FROM review').all().filter(r => ids.has(r.question_id));
    const today = localDate(new Date(), input.timezone);
    return {
      label: '参考成绩', totalQuestions: questions.length, covered: covered.size, wrong: review.filter(r => r.last_correct === 0).length, due: review.filter(r => String(r.due) <= today).length, current: groups, historical: {
        numerator: historicalNumerator, denominator: historicalDenominator
      }, excluded, attempts: rows.length, exclusionRule: '未答、跳过、作废、不可评分和争议不进分母；独立与辅助分别取最新可评分记录'
    };
  }
}
