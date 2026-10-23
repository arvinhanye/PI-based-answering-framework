import type { QuestionView } from '../contracts.js';
export type StudyInput = {
    type: 'next';
} | {
    type: 'image';
} | {
    type: 'answer';
    answer: string[];
    confidence: 'sure' | 'unsure';
} | {
    type: 'invalid';
    message: string;
} | {
    type: 'question';
};
export function classifyStudyInput(text: string, question: Pick<QuestionView, 'kind' | 'options'>): StudyInput {
    let value = text.trim();
    if (/^(n|下)$/i.test(value))
        return { type: 'next' };
    if (value === '图')
        return { type: 'image' };
    const prefixed = /^(答案是|选择|答案|我选|选)\s*/.test(value);
    value = value.replace(/^(答案是|选择|答案|我选|选)\s*/, '');
    const confidence = /[?？]$/.test(value) ? 'unsure' : 'sure';
    value = value.replace(/[?？]$/, '').trim();
    const invalid = (message: string): StudyInput => ({ type: 'invalid', message });
    if (question.kind === 'fill') {
        if (!value.startsWith('='))
            return { type: 'question' };
        const answer = value.slice(1).trim().split('|').map(x => x.trim());
        return answer.some(x => !x) ? invalid('请在 = 后填写答案，多空用 | 分隔。') : { type: 'answer', answer, confidence };
    }
    if (question.kind === 'short')
        return { type: 'question' };
    if (question.kind === 'truefalse') {
        if (/^(对|正确|√|T|A)$/i.test(value))
            return { type: 'answer', answer: ['true'], confidence };
        if (/^(错|错误|×|F|B)$/i.test(value))
            return { type: 'answer', answer: ['false'], confidence };
    }
    const compact = value.toUpperCase().replace(/[\s,，、]/g, '');
    if (!/^[A-Z]+$/.test(compact))
        return { type: 'question' };
    const options = question.kind === 'truefalse' ? ['A', 'B'] : question.options.map(x => x.id.toUpperCase());
    // A bare technical word (e.g. OSPF) is ambiguous; keep it as a question.
    const known = [...compact].filter(x => options.includes(x)).length;
    if (!prefixed && compact.length > 2 && known * 2 < compact.length)
        return { type: 'question' };
    if (question.kind === 'truefalse')
        return invalid('判断题请回答对/错，或 A/B。');
    const answer = [...new Set(compact)].sort();
    if (answer.some(x => !options.includes(x)))
        return invalid(`这题只有 ${options.join('、')} 选项。`);
    if (question.kind === 'single' && compact.length !== 1)
        return invalid('这题是单选，只能选一个。');
    return { type: 'answer', answer, confidence };
}
