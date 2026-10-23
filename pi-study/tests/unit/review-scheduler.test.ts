import { it, expect } from 'vitest';
import { scheduleReview } from '../../src/review/scheduler.js';
const base = {
  correct: true, assisted: false, confidence: 'sure', now: new Date('2026-10-23T12:00:00Z'), timezone: 'UTC'
};
it('no_exam_preserves_1_3_7_14_30', () => expect([
  0, 1, 2, 3, 4
].map(stage => scheduleReview({
  ...base, stage
}).interval)).toEqual([
  1, 3, 7, 14, 30
]));
it('exam_caps_and_last_day_today', () => {
  expect(scheduleReview({
    ...base, stage: 4, examDate: '2026-10-29'
  }).interval).toBe(3);
  expect(scheduleReview({
    ...base, stage: 4, examDate: '2026-10-24', correct: false
  }).interval).toBe(0);
});
it('expired_exam_normal_with_warning', () => {
  const r = scheduleReview({
    ...base, stage: 3, examDate: '2026-10-20'
  });
  expect(r.interval).toBe(14);
  expect(r.warning).toContain('过期');
});
it('assisted_or_unsure_is_next_day', () => {
  expect(scheduleReview({
    ...base, stage: 4, assisted: true
  }).interval).toBe(1);
  expect(scheduleReview({
    ...base, stage: 4, confidence: 'unsure'
  }).interval).toBe(1);
});
