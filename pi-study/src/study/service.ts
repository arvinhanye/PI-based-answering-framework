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
      id: s.id, bankId: s.bank_id, mode: JSON.parse(s.payload).mode ?? 'quick', status: s.status, createdAt: s.created_at, currentPresentationId: s.current_id, sourceId: JSON.parse(s.payload).sourceId, answered: Number(this.row('SELECT count(*) n FROM submissions WHERE session_id=? AND voided_at IS NULL',s.id)!.n)
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
      const sourceRank=(id:string)=>({'first-docx':0,'province-docx':1,'wlan-pdf':2,'pdf':2}[id]??3);
      rows.sort((a,b)=>sourceRank(a.source_id)-sourceRank(b.source_id)||String(a.source_id).localeCompare(String(b.source_id))||String(a.source_key).localeCompare(String(b.source_key),'en',{numeric:true})||String(a.id).localeCompare(String(b.id)));
      if (cfg.selection !== 'wrong' && cfg.selection !== 'sequential') {
        const today = localDate(new Date(), cfg.timezone);
        const due = rows.filter(r=>r.last_correct===0||(r.due&&r.due<=today));
        const fresh = rows.filter(r=>!r.due);
        if (cfg.randomNew || cfg.selection==='random') {
          for(let i=fresh.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[fresh[i],fresh[j]]=[fresh[j]!,fresh[i]!];}
        }
        const count=Number(this.row('SELECT count(*) n FROM presentations WHERE session_id=?',sessionId)!.n);
        rows=count%5===4&&fresh.length?fresh:due.length?due:fresh.length?fresh:rows;
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
      session: this.view(s), question: p ? this.question(p) : null, draft: p ? JSON.parse(p.draft) : [], assisted: !!p?.assisted, status: p?.status??null, answer:p?JSON.parse(this.row('SELECT input FROM submissions WHERE presentation_id=? AND voided_at IS NULL',p.id)?.input??'{"answer":[]}').answer:[], progress:this.progress(sessionId)
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
        if(prev.voided_at)throw new CoreError('ALREADY_FINALIZED','该提交已撤销，请重新作答');
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
      this.store.db.prepare('INSERT INTO submissions(id,presentation_id,session_id,revision_id,idempotency_key,input,receipt,created_at) VALUES(?,?,?,?,?,?,?,?)').run(receipt.id, p.id, input.sessionId, p.revision_id, input.idempotencyKey, raw, JSON.stringify(receipt), createdAt);
      this.store.db.prepare("UPDATE presentations SET status='submitted' WHERE id=?").run(p.id);
      this.applyReview(rev.question_id,input,receipt,JSON.parse(this.session(input.sessionId).payload));
      return receipt;
    });
  }
  private progress(sessionId:string){
    const rows=this.store.db.prepare('SELECT receipt FROM submissions WHERE session_id=? AND voided_at IS NULL').all(sessionId).map(r=>JSON.parse(String(r.receipt))).filter(r=>r.grade.status==='scored');
    return {correct:rows.filter(r=>r.grade.correct).length,total:rows.length};
  }
  private applyReview(questionId:string,input:SubmissionInput,receipt:SubmissionReceipt,cfg:StartSessionInput){
    if(receipt.grade.status!=='scored')return;
    const old=this.row('SELECT * FROM review WHERE question_id=?',questionId);
    const stage=receipt.grade.correct&&!receipt.assisted&&input.confidence==='sure'?(old?.stage??-1)+1:0;
    const due=scheduleReview({stage,correct:!!receipt.grade.correct,assisted:receipt.assisted,confidence:input.confidence,examDate:cfg.examDate,timezone:cfg.timezone,now:new Date(receipt.createdAt)}).due;
    const correct=receipt.assisted&&old?old.last_correct:receipt.grade.correct?1:0;
    this.store.db.prepare('INSERT INTO review VALUES(?,?,?,?) ON CONFLICT(question_id) DO UPDATE SET stage=excluded.stage,due=excluded.due,last_correct=excluded.last_correct').run(questionId,stage,due,correct);
  }
  async markAssisted(sessionId:string,action:UserActionContext,presentationId:string){
    this.store.transaction(()=>{const p=this.presentation(sessionId,presentationId);if(p.status!=='open'||p.assisted)return;this.action(action,'ask',p.id);this.store.db.prepare('UPDATE presentations SET assisted=1 WHERE id=?').run(p.id);});
  }
  async undo(sessionId:string,action:UserActionContext){
    this.store.transaction(()=>{
      const p=this.presentation(sessionId);const sub=this.row('SELECT * FROM submissions WHERE presentation_id=? AND voided_at IS NULL',p.id);
      if(!sub||p.status!=='submitted')throw new CoreError('INVALID_INPUT','只能撤销当前题的作答，进入下一题后无法撤销上一题');
      this.action(action,'undo',p.id);
      this.store.db.prepare('UPDATE submissions SET voided_at=? WHERE id=?').run(new Date().toISOString(),sub.id);
      this.store.db.prepare("UPDATE presentations SET status='open' WHERE id=?").run(p.id);
      const questionId=this.row('SELECT question_id FROM revisions WHERE id=?',p.revision_id)!.question_id;
      this.store.db.prepare('DELETE FROM review WHERE question_id=?').run(questionId);
      const rows=this.store.db.prepare('SELECT x.input,x.receipt,s.payload FROM submissions x JOIN revisions r ON r.id=x.revision_id JOIN sessions s ON s.id=x.session_id WHERE r.question_id=? AND x.voided_at IS NULL ORDER BY x.created_at,x.rowid').all(questionId);
      for(const r of rows)this.applyReview(questionId,JSON.parse(String(r.input)),JSON.parse(String(r.receipt)),JSON.parse(String(r.payload)));
    });
    return this.inspect(sessionId);
  }
  async feedback(presentationId: string): Promise<FeedbackView> {
    const p = this.row('SELECT * FROM presentations WHERE id=?', presentationId);
    if (!p || ![
      'submitted', 'revealed'
    ].includes(p.status))
      throw new CoreError('ALREADY_FINALIZED', '提交或明确揭晓后才可查看反馈');
    const q: QuestionInput = JSON.parse(this.row('SELECT payload FROM revisions WHERE id=?', p.revision_id)!.payload);
    const sub = this.row('SELECT receipt FROM submissions WHERE presentation_id=? AND voided_at IS NULL', p.id);
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
