import { localDate } from './scheduler.js';
import { StudyStore } from '../storage/business.js';
import type { QuestionInput, SubmissionReceipt } from '../contracts.js';
export interface StatsQuery {
  bankId: string;
  timezone?: string;
  sourceId?: string;
  topic?: string;
  examDate?: string;
}
interface Question { id: string; sourceId: string; topics: string[] }
interface Attempt { questionId: string; receipt: SubmissionReceipt }
interface Review { questionId: string; due: string; correct: boolean }
function summarize(questions: Question[], attempts: Attempt[], reviews: Review[], today: string) {
  const ids = new Set(questions.map(q => q.id));
  const rows = attempts.filter(row => ids.has(row.questionId));
  const groups = { independent: { numerator: 0, denominator: 0 }, assisted: { numerator: 0, denominator: 0 } };
  const latest = new Map<string, SubmissionReceipt>();
  let historicalNumerator = 0, historicalDenominator = 0, excluded = 0;
  const covered = new Set<string>(), completed = new Set<string>(), assistedCompleted = new Set<string>();
  for (const {questionId, receipt} of rows) {
    completed.add(questionId);
    if (receipt.assisted) assistedCompleted.add(questionId);
    if (receipt.grade.status !== 'scored') { excluded++; continue; }
    covered.add(questionId);
    historicalDenominator++;
    if (receipt.grade.correct) historicalNumerator++;
    latest.set(questionId + (receipt.assisted ? ':assisted' : ':independent'), receipt);
  }
  for (const r of latest.values()) {
    const group = r.assisted ? groups.assisted : groups.independent;
    group.denominator++;
    if (r.grade.correct) group.numerator++;
  }
  const review = reviews.filter(r => ids.has(r.questionId));
  return {
    totalQuestions: questions.length, completed: completed.size, assistedCompleted: assistedCompleted.size,
    covered: covered.size, wrong: review.filter(r => !r.correct).length, due: review.filter(r => r.due <= today).length,
    current: groups, historical: { numerator: historicalNumerator, denominator: historicalDenominator },
    excluded, attempts: rows.length,
  };
}
function daysUntilExam(date: string | undefined, today: string): number | undefined {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const time = Date.parse(date);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) return undefined;
  return Math.round((time - Date.parse(today)) / 86400000);
}
export class StatisticsService {
  constructor(private store: StudyStore) {}
  async read(input: StatsQuery) {
    const questions: Question[] = this.store.db.prepare('SELECT q.id,q.source_id,r.payload FROM questions q JOIN revisions r ON r.id=q.current_revision_id WHERE q.bank_id=?').all(input.bankId).map(q => ({
      id: String(q.id), sourceId: String(q.source_id), topics: (JSON.parse(String(q.payload)) as QuestionInput).topics
    })).filter(q => (!input.sourceId || q.sourceId === input.sourceId) && (!input.topic || q.topics.includes(input.topic)));
    const attempts: Attempt[] = this.store.db.prepare('SELECT s.receipt,r.question_id FROM submissions s JOIN revisions r ON r.id=s.revision_id JOIN questions q ON q.id=r.question_id WHERE q.bank_id=? AND s.voided_at IS NULL ORDER BY s.created_at,s.rowid').all(input.bankId).map(r => ({questionId: String(r.question_id), receipt: JSON.parse(String(r.receipt))}));
    const reviews: Review[] = this.store.db.prepare('SELECT v.* FROM review v JOIN questions q ON q.id=v.question_id WHERE q.bank_id=?').all(input.bankId).map(r => ({questionId: String(r.question_id), due: String(r.due), correct: !!r.last_correct}));
    const today = localDate(new Date(), input.timezone);
    const sourceOrder = ['first-docx', 'province-docx', 'wlan-pdf', 'pdf'];
    const rank = (id: string) => sourceOrder.includes(id) ? sourceOrder.indexOf(id) : sourceOrder.length;
    const sources = this.store.db.prepare("SELECT id,json_extract(payload,'$.source.name') name FROM sources WHERE bank_id=? ORDER BY rowid").all(input.bankId)
      .filter(s => !input.sourceId || s.id === input.sourceId)
      .sort((a, b) => rank(String(a.id)) - rank(String(b.id)))
      .map(source => ({sourceId: String(source.id), sourceName: String(source.name), ...summarize(questions.filter(q => q.sourceId === source.id), attempts, reviews, today)}));
    const topicNames = [...new Set(questions.flatMap(q => q.topics).filter(t => t.trim() && t.trim() !== '未分类'))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const topics = topicNames.map(topic => ({topic, ...summarize(questions.filter(q => q.topics.includes(topic)), attempts, reviews, today)}));
    return {
      label: '参考成绩', ...summarize(questions, attempts, reviews, today), sources, topics,
      daysUntilExam: daysUntilExam(input.examDate, today),
      exclusionRule: '未答、跳过、作废、不可评分和争议不进分母；独立与辅助分别取最新可评分记录'
    };
  }
}
export type ProgressReport = Awaited<ReturnType<StatisticsService['read']>>;
