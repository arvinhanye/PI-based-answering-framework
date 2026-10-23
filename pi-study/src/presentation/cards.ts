import { describeIssues } from './issues.js';
import type { QuestionView, FeedbackView } from '../contracts.js';
export interface CardBudget {
    spentCny: string;
    limitCny: string;
}
const kinds = { single: '单选', multiple: '多选', truefalse: '判断', fill: '填空', short: '简答' };
export function sourceLabel(id: string) { return ({ 'first-docx': '1500题', 'province-docx': '省赛', 'wlan-pdf': 'PDF', 'pdf': 'PDF' } as Record<string, string>)[id] ?? '当前题库'; }
export function displayStem(stem: string): string { return stem.replace(/\s*【[^【】]*考点】\s*$/u, '').trimEnd(); }
function displayAnswer(q: QuestionView, answer: string[]) { return answer.map(v => q.kind === 'truefalse' ? v === 'true' ? '对' : v === 'false' ? '错' : v : v).join(q.kind === 'fill' ? ' | ' : '、'); }
export function questionCard(q: QuestionView, progress: {
    correct: number;
    total: number;
}, budget: CardBudget, label = sourceLabel(q.sourceId)): string {
    const header = [`第 ${q.sourceKey} 题`, kinds[q.kind], ...q.topics, label].join(' · ');
    const images = q.assets.filter(a => a.role === 'question').length;
    const sections = [header + '\n' + displayStem(q.stem), q.options.map(o => `${o.id}. ${o.text}`).join('\n'), [images ? `📎 ${images} 张题图，Ctrl+Alt+O 打开` : '', q.warnings?.length ? `⚠ ${q.warnings.join('；')}，本题不计分` : ''].filter(Boolean).join('\n')];
    return sections.filter(Boolean).join('\n\n');
}
export function resultCard(q: QuestionView, answer: string[], feedback: FeedbackView, budget: CardBudget): string {
    const correct = displayAnswer(q, feedback.answer) || feedback.rawAnswer || '未提供';
    const scored = feedback.grade?.status === 'scored';
    const heading = !scored ? `— 不计分（${describeIssues(feedback.issues).reasons.join('；') || (feedback.grade?.status === 'disputed' ? '答案存在争议' : '缺少评分条件')}）` : feedback.grade!.correct ? `✓ 正确　答案 ${correct}` : `✗ 错误　你选 ${displayAnswer(q, answer)}，正确答案 ${correct}`;
    const missing = q.kind === 'multiple' ? feedback.answer.filter(x => !answer.includes(x)) : [];
    const extra = q.kind === 'multiple' ? answer.filter(x => !feedback.answer.includes(x)) : [];
    const differences = [missing.length ? `漏选 ${missing.join('、')}` : '', extra.length ? `多选 ${extra.join('、')}` : ''].filter(Boolean).join(' · ');
    const conclusion = [heading, scored ? differences : ''].filter(Boolean).join('\n');
    const explanation = [feedback.explanation ? `解析：${feedback.explanation}` : '题库未提供解析', ...describeIssues(feedback.issues).after.map(i => `⚠ ${i}`)].join('\n');
    return conclusion + '\n\n' + explanation;
}
