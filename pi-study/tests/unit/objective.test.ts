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
it.each(['source_explanation_disputed','ocr_text_unverified','no_explanation'])('scores an answer when %s is the only issue', issue => {
 expect(gradeObjective({...q,status:'needs_review',issues:[issue]},['SELECT'])).toMatchObject({status:'scored',correct:true});
});
it.each(['missing_figure','missing_option_content','duplicate_option_labels','single_answer_cardinality','missing_answer','invalid_option_answer','source_anomaly_confirmed'])('blocks scoring for %s even with ready status', issue => {
 expect(gradeObjective({...q,status:'ready',issues:[issue]},['SELECT']).status).toBe('unscorable');
});
it('unknown issues retain status-based eligibility',()=>{
 expect(gradeObjective({...q,issues:['future_issue']},['SELECT']).status).toBe('scored');
 expect(gradeObjective({...q,status:'needs_review',issues:['future_issue','no_explanation']},['SELECT']).status).toBe('unscorable');
});
it('scores the legacy explanation-only disputed record without clearing actual answer disputes',()=>{
 expect(gradeObjective({...q,status:'needs_review',basisStatus:'disputed',issues:['source_explanation_disputed']},['SELECT'])).toMatchObject({status:'scored',correct:true,basisStatus:'source_only'});
 expect(gradeObjective({...q,basisStatus:'disputed',issues:[]},['SELECT']).status).toBe('disputed');
 expect(gradeObjective({...q,basisStatus:'disputed',issues:['source_explanation_disputed','future_answer_conflict']},['SELECT']).status).toBe('disputed');
});
