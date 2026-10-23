import type { QuestionInput, GradeResult } from '../contracts.js';
export function gradeObjective(q: QuestionInput, answer: string[]): GradeResult {
  const base = {
    maxScore: 1, basisStatus: q.basisStatus
  };
  if (q.basisStatus === 'disputed')
    return {
      ...base, status: 'disputed', score: null, correct: null, reason: '答案存在争议'
    };
  if (q.status !== 'ready' || q.basisStatus === 'insufficient' || !q.answer.length || q.kind === 'short')
    return {
      ...base, status: 'unscorable', score: null, correct: null, reason: '缺少评分条件或本版不支持此题型评分'
    };
  const norm = (a: string[]) => q.kind === 'multiple' ? [
    ...new Set(a.map(x => x.trim().toUpperCase()))
  ].sort() : a.map(x => q.kind === 'fill' ? x.trim() : x.trim().toUpperCase());
  const actual = JSON.stringify(norm(answer));
  const correct = [
    q.answer, ...(q.equivalentAnswers ?? [])
  ].some(a => JSON.stringify(norm(a)) === actual);
  return {
    ...base, status: 'scored', score: correct ? 1 : 0, correct, reason: '依据来源答案的参考判分'
  };
}
