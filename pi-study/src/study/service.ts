import { randomUUID } from 'node:crypto';
import type { QuestionInput, QuestionView, SessionView, SessionSnapshot, StartSessionInput, SubmissionInput, SubmissionReceipt, FeedbackView, UserActionContext } from '../contracts.js';
import { StudyStore, CoreError } from '../storage/business.js';
import { gradeObjective } from './objective.js';
import { scheduleReview, localDate } from '../review/scheduler.js';
type Row = Record<string, any>;
export class StudyService {
  constructor(private store: StudyStore) {
  }
  private row(sql: string, ...args: string[]): Row | undefined {
    return this.store.db.prepare(sql).get(...args);
  }
  private session(id: string): Row {
    const s = this.row('SELECT * FROM sessions WHERE id=?', id);
    if (!s || s.status !== 'active')
      throw new CoreError('INVALID_INPUT', '会话不存在或已关闭');
    return s;
  }
  private view(s: Row): SessionView {
    return {
      id: s.id, bankId: s.bank_id, mode: JSON.parse(s.payload).mode ?? 'quick', status: s.status, createdAt: s.created_at, currentPresentationId: s.current_id
    };
  }
  private action(a: UserActionContext, verb: string, pid: string) {
    if (!a || ![
      'cli', 'pi-interactive', 'pi-menu'
    ].includes(a.origin) || !a.eventId)
      throw new CoreError('INVALID_INPUT', '需要明确用户操作');
    this.store.db.prepare('INSERT INTO audit(event_id,origin,action,presentation_id,created_at) VALUES(?,?,?,?,?)').run(a.eventId, a.origin, verb, pid, new Date().toISOString());
  }
  private presentation(sid: string, pid?: string, rid?: string): Row {
    const s = this.session(sid);
    if (!s.current_id || (pid && pid !== s.current_id))
      throw new CoreError('STALE_PRESENTATION', '当前展示已变化');
    const p = this.row('SELECT * FROM presentations WHERE id=?', s.current_id)!;
    if (rid && p.revision_id !== rid)
      throw new CoreError('STALE_PRESENTATION', '题目版本不匹配');
    return p;
  }
  private question(p: Row): QuestionView {
    const r = this.row('SELECT r.*,q.source_id,q.source_key FROM revisions r JOIN questions q ON q.id=r.question_id WHERE r.id=?', p.revision_id)!;
    const q: QuestionInput = JSON.parse(r.payload);
    return {
      questionRevisionId: r.id, questionId: r.question_id, sourceId: r.source_id, sourceKey: r.source_key, kind: q.kind, stem: q.stem, options: q.options, topics: q.topics, status: q.status, issueCount: q.issues.length, locations: q.locations, assets: q.assets.filter(a => a.role === 'question'), presentationId: p.id, sessionId: p.session_id
    };
  }
  async start(input: StartSessionInput): Promise<SessionView> {
    if(input.mode && input.mode !== 'quick') throw new CoreError('NOT_IMPLEMENTED','该模式暂未实现');
    if (!this.row('SELECT id FROM banks WHERE id=?', input.bankId))
      throw new CoreError('INVALID_INPUT', '题库不存在');
    if (input.timezone)
      localDate(new Date(), input.timezone);
    if (input.examDate)
      scheduleReview({
        stage: 0, correct: true, assisted: false, confidence: 'sure', examDate: input.examDate, timezone: input.timezone
      });
    const id = randomUUID();
    this.store.db.prepare('INSERT INTO sessions(id,bank_id,payload,created_at) VALUES(?,?,?,?)').run(id, input.bankId, JSON.stringify(input), new Date().toISOString());
    return this.view(this.session(id));
  }
  async listSessions(bankId?: string): Promise<SessionView[]> {
    return (bankId ? this.store.db.prepare('SELECT * FROM sessions WHERE bank_id=? ORDER BY created_at DESC').all(bankId) : this.store.db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all()).map(s => this.view(s));
  }
  async next(sessionId: string): Promise<QuestionView | null> {
    return this.store.transaction(() => {
      const s = this.session(sessionId);
      if (s.current_id) {
        const p = this.presentation(sessionId);
        if (p.status === 'open')
          return this.question(p);
      }
      const cfg: StartSessionInput = JSON.parse(s.payload);
      let rows = this.store.db.prepare(`SELECT q.*,r.payload,v.due,v.last_correct FROM questions q JOIN revisions r ON r.id=q.current_revision_id LEFT JOIN review v ON v.question_id=q.id WHERE q.bank_id=? AND NOT EXISTS(SELECT 1 FROM presentations p JOIN revisions old ON old.id=p.revision_id WHERE p.session_id=? AND old.question_id=q.id) ORDER BY q.source_key,q.id`).all(s.bank_id, sessionId) as Row[];
      rows = rows.filter(r => (!cfg.sourceId || r.source_id === cfg.sourceId) && (!cfg.topic || JSON.parse(r.payload).topics.includes(cfg.topic)) && (cfg.selection !== 'wrong' || r.last_correct === 0));
      if (cfg.selection === 'random')
        rows.sort(() => Math.random() - .5);
      else if (!cfg.selection || cfg.selection === 'adaptive') {
        const today = localDate(new Date(), cfg.timezone);
        const due = rows.filter(r => r.last_correct === 0 || (r.due && r.due <= today));
        const fresh = rows.filter(r => !r.due);
        const count = Number(this.row('SELECT count(*) AS n FROM presentations WHERE session_id=?', sessionId)!.n);
        const days = cfg.examDate ? (Date.parse(cfg.examDate) - Date.parse(today)) / 86400000 : Infinity;
        const ratio = days >= 0 && days <= 14 ? 9 : 4;
        rows = (count % (ratio + 1) === ratio && fresh.length) ? fresh : due.length ? due : rows;
      }
      if (!rows.length) {
        this.store.db.prepare('UPDATE sessions SET current_id=NULL WHERE id=?').run(sessionId);
        return null;
      }
      const p = {
        id: randomUUID(), session_id: sessionId, revision_id: rows[0]!.current_revision_id, status: 'open'
      };
      this.store.db.prepare('INSERT INTO presentations(id,session_id,revision_id,created_at) VALUES(?,?,?,?)').run(p.id, sessionId, p.revision_id, new Date().toISOString());
      this.store.db.prepare('UPDATE sessions SET current_id=? WHERE id=?').run(p.id, sessionId);
      return this.question(p);
    });
  }
  async inspect(sessionId: string): Promise<SessionSnapshot> {
    const s = this.session(sessionId);
    const p = s.current_id ? this.presentation(sessionId) : null;
    return {
      session: this.view(s), question: p ? this.question(p) : null, draft: p ? JSON.parse(p.draft) : [], assisted: !!p?.assisted
    };
  }
  async resume(sessionId: string, action: UserActionContext) {
    this.action(action, 'resume', this.session(sessionId).current_id ?? '');
    return this.inspect(sessionId);
  }
  async saveDraft(sessionId: string, answer: string[], action: UserActionContext, presentationId: string) {
    return this.store.transaction(() => {
      if(typeof presentationId !== 'string' || !presentationId) throw new CoreError('STALE_PRESENTATION','需要展示 ID');
      const p = this.presentation(sessionId,presentationId);
      if (p.status !== 'open')
        throw new CoreError('ALREADY_FINALIZED', '题目已结束');
      if (!Array.isArray(answer) || answer.some(x => typeof x !== 'string'))
        throw new CoreError('INVALID_INPUT', '草稿格式错误');
      this.action(action, 'draft', p.id);
      this.store.db.prepare('UPDATE presentations SET draft=? WHERE id=?').run(JSON.stringify(answer), p.id);
      return this.view(this.session(sessionId));
    });
  }
  async submit(input: SubmissionInput, action: UserActionContext): Promise<SubmissionReceipt> {
    return this.store.transaction(() => {
      if (!input || typeof input.sessionId !== 'string' || !input.sessionId || typeof input.presentationId !== 'string' || !input.presentationId || typeof input.questionRevisionId !== 'string' || !input.questionRevisionId || !Array.isArray(input.answer) || input.answer.some(x => typeof x !== 'string') || ![
        'sure', 'unsure'
      ].includes(input.confidence) || !input.idempotencyKey)
        throw new CoreError('INVALID_INPUT', '提交格式错误');
      const raw = JSON.stringify(input);
      const prev = this.row('SELECT * FROM submissions WHERE idempotency_key=?', input.idempotencyKey);
      if (prev) {
        if (prev.input !== raw)
          throw new CoreError('STORAGE_CONFLICT', '幂等键对应不同提交');
        return JSON.parse(prev.receipt);
      }
      const p = this.presentation(input.sessionId, input.presentationId, input.questionRevisionId);
      if (p.status !== 'open')
        throw new CoreError('ALREADY_FINALIZED', '题目已结束');
      this.action(action, 'submit', p.id);
      const rev = this.row('SELECT * FROM revisions WHERE id=?', p.revision_id)!;
      const q: QuestionInput = JSON.parse(rev.payload);
      const grade = gradeObjective(q, input.answer);
      const createdAt = new Date().toISOString();
      const receipt: SubmissionReceipt = {
        id: randomUUID(), presentationId: p.id, grade, assisted: !!p.assisted, createdAt
      };
      this.store.db.prepare('INSERT INTO submissions VALUES(?,?,?,?,?,?,?,?)').run(receipt.id, p.id, input.sessionId, p.revision_id, input.idempotencyKey, raw, JSON.stringify(receipt), createdAt);
      this.store.db.prepare("UPDATE presentations SET status='submitted' WHERE id=?").run(p.id);
      if (grade.status === 'scored') {
        const old = this.row('SELECT * FROM review WHERE question_id=?', rev.question_id);
        const stage = grade.correct && !p.assisted && input.confidence === 'sure' ? (old?.stage ?? -1) + 1 : 0;
        const cfg = JSON.parse(this.session(input.sessionId).payload);
        const due = scheduleReview({
          stage, correct: !!grade.correct, assisted: !!p.assisted, confidence: input.confidence, examDate: cfg.examDate, timezone: cfg.timezone
        }).due;
        this.store.db.prepare('INSERT INTO review VALUES(?,?,?,?) ON CONFLICT(question_id) DO UPDATE SET stage=excluded.stage,due=excluded.due,last_correct=excluded.last_correct').run(rev.question_id, stage, due, p.assisted && old ? old.last_correct : grade.correct ? 1 : 0);
      }
      return receipt;
    });
  }
  async feedback(presentationId: string): Promise<FeedbackView> {
    const p = this.row('SELECT * FROM presentations WHERE id=?', presentationId);
    if (!p || ![
      'submitted', 'revealed'
    ].includes(p.status))
      throw new CoreError('ALREADY_FINALIZED', '提交或明确揭晓后才可查看反馈');
    const q: QuestionInput = JSON.parse(this.row('SELECT payload FROM revisions WHERE id=?', p.revision_id)!.payload);
    const sub = this.row('SELECT receipt FROM submissions WHERE presentation_id=?', p.id);
    return {
      questionRevisionId: p.revision_id, answer: q.answer, rawAnswer: q.rawAnswer, explanation: q.explanation, issues: q.issues, ...(sub ? {
        grade: JSON.parse(sub.receipt).grade
      } : {})
    };
  }
  async reveal(presentationId: string, action: UserActionContext) {
    this.store.transaction(() => {
      const p = this.row('SELECT * FROM presentations WHERE id=?', presentationId);
      if (!p)
        throw new CoreError('STALE_PRESENTATION', '展示不存在');
      this.presentation(p.session_id, p.id);
      if (p.status !== 'open')
        throw new CoreError('ALREADY_FINALIZED', '题目已结束');
      this.action(action, 'reveal', p.id);
      this.store.db.prepare("UPDATE presentations SET status='revealed',assisted=1 WHERE id=?").run(p.id);
    });
    return this.feedback(presentationId);
  }
  async hint(sessionId: string, action: UserActionContext, presentationId: string) {
    return this.store.transaction(() => {
      if(typeof presentationId !== 'string' || !presentationId) throw new CoreError('STALE_PRESENTATION','需要展示 ID');
      const p = this.presentation(sessionId,presentationId);
      if (p.status !== 'open')
        throw new CoreError('ALREADY_FINALIZED', '题目已结束');
      this.action(action, 'hint', p.id);
      this.store.db.prepare('UPDATE presentations SET assisted=1 WHERE id=?').run(p.id);
      return {
        text: '请先检查题目条件、选项差异与单位；本题已标记为辅助作答。'
      };
    });
  }
  async skip(sessionId: string, action: UserActionContext, presentationId: string) {
    return this.store.transaction(() => {
      if(typeof presentationId !== 'string' || !presentationId) throw new CoreError('STALE_PRESENTATION','需要展示 ID');
      const p = this.presentation(sessionId,presentationId);
      if (p.status !== 'open')
        throw new CoreError('ALREADY_FINALIZED', '题目已结束');
      this.action(action, 'skip', p.id);
      this.store.db.prepare("UPDATE presentations SET status='skipped' WHERE id=?").run(p.id);
      return this.view(this.session(sessionId));
    });
  }
}
export { StudyService as StudyCommands };
