import type { ProgressReport } from '../review/statistics.js';
import { sourceLabel } from './cards.js';
const percent = (count: {numerator: number; denominator: number}) => `${Math.round(count.numerator / count.denominator * 100)}%`;
export function progressCard(report: ProgressReport): string {
    const sources = report.sources.map(source => {
        const known = sourceLabel(source.sourceId), name = known === '当前题库' ? source.sourceName : known;
        const accuracy = source.current.independent;
        return `${name}　已做 ${source.completed} / ${source.totalQuestions}${accuracy.denominator ? `　正确率 ${percent(accuracy)}` : ''}`;
    });
    const assisted = report.current.assisted;
    const overview = [`辅助作答　已做 ${report.assistedCompleted} 题${assisted.denominator ? `　正确率 ${percent(assisted)}` : ''}`, `错题 ${report.wrong} · 今天到期复习 ${report.due}`];
    if (report.daysUntilExam !== undefined) overview.push(report.daysUntilExam < 0 ? `比赛日期已过 ${-report.daysUntilExam} 天` : report.daysUntilExam === 0 ? '今天比赛' : `距比赛 ${report.daysUntilExam} 天`);
    const topics = report.topics.filter(t => t.current.independent.denominator >= 5);
    return [
        '进度\n' + (sources.join('\n') || '尚无题目'),
        overview.join('\n'),
        topics.length ? '考点正确率（已独立作答 ≥ 5 题）\n' + topics.map(t => `${t.topic} ${percent(t.current.independent)}`).join(' · ') : '',
        '已做按提交过的题目去重，含辅助及不计分题。正确率按各组最新可计分作答计算，独立与辅助分开；到期复习含逾期。',
    ].filter(Boolean).join('\n\n');
}
