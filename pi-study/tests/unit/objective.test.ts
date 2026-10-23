import { it, expect } from 'vitest';
import { gradeObjective } from '../../src/study/objective.js';
import type { QuestionInput } from '../../src/contracts.js';
const q: QuestionInput = {
  sourceKey: '1', kind: 'fill', stem: 'command', options: [], answer: [
    'SELECT'
  ], rawAnswer: 'SELECT', explanation: '', topics: [], status: 'ready', basisStatus: 'source_only', issues: [], locations: [], assets: []
};
it('command_case_not_folded', () => {
  expect(gradeObjective(q, [
    'select'
  ]).correct).toBe(false);
  expect(gradeObjective(q, [
    'SELECT'
  ]).correct).toBe(true);
});
it('missing_condition_is_unscorable', () => expect(gradeObjective({
  ...q, status: 'needs_review'
}, [
  'SELECT'
]).status).toBe('unscorable'));
it('multiple_is_exact_set', () => {
  expect(gradeObjective({
    ...q, kind: 'multiple', answer: [
      'A', 'B'
    ]
  }, [
    'B', 'A'
  ]).correct).toBe(true);
  expect(gradeObjective({
    ...q, kind: 'multiple', answer: [
      'A', 'B'
    ]
  }, [
    'A'
  ]).correct).toBe(false);
});
