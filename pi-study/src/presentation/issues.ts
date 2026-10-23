import type { StructureStatus } from '../contracts.js';
type IssueRule = { category: 'process' | 'explanation' | 'answer' | 'grading'; text?: string; warning?: string };
/** The single translation and scoring policy for source issues. Never display raw keys. */
const rules: Record<string, IssueRule> = {
    ocr_text_unverified: { category: 'process' },
    no_explanation: { category: 'explanation', text: '题库未提供解析' },
    source_explanation_disputed: { category: 'explanation', text: '这段解析可能有误，可以直接问 DeepSeek', warning: '这段解析可能有误，可以直接问 DeepSeek' },
    missing_figure: { category: 'answer', text: '原题缺图' },
    missing_option_content: { category: 'answer', text: '原题缺少选项内容' },
    duplicate_option_labels: { category: 'answer', text: '原题选项编号重复' },
    single_answer_cardinality: { category: 'answer', text: '原题答案个数与题型不符' },
    missing_answer: { category: 'grading', text: '原题没有给答案' },
    invalid_option_answer: { category: 'grading', text: '原题答案不在选项中' },
    source_anomaly_confirmed: { category: 'grading', text: '原件此题有误' },
};
export function describeIssues(issues: string[], status: StructureStatus = 'ready') {
    const known = [...new Set(issues)].map(code => Object.hasOwn(rules, code) ? rules[code] : undefined);
    const unknown = known.some(rule => !rule);
    const reasons = known.flatMap(rule => rule && ['answer', 'grading'].includes(rule.category) ? [rule.text!] : []);
    return {
        explanationOnlyDispute: issues.includes('source_explanation_disputed') && !unknown && !reasons.length,
        canScore: !reasons.length && (status === 'ready' || (known.length > 0 && !unknown)),
        before: known.flatMap(rule => rule?.category === 'answer' ? [rule.text!] : []),
        reasons,
        after: [...known.flatMap(rule => rule?.warning ? [rule.warning] : []), ...(unknown ? ['这题资料有其他问题'] : [])],
        descriptions: [...known.flatMap(rule => rule?.text ? [rule.text] : []), ...(unknown ? ['这题资料有其他问题'] : [])],
    };
}
