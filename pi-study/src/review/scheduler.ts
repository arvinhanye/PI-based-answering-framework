import { CoreError } from '../storage/business.js';
export const intervals = [
  1, 3, 7, 14, 30
];
export function localDate(now: Date, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}
export function scheduleReview(input: {
  stage: number;
  correct: boolean;
  assisted: boolean;
  confidence: string;
  examDate?: string;
  timezone?: string;
  now?: Date;
}) {
  const today = localDate(input.now ?? new Date(), input.timezone);
  let interval = (!input.correct || input.assisted || input.confidence === 'unsure') ? 1 : intervals[Math.min(input.stage, 4)]!;
  let warning: string | undefined;
  if (input.examDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.examDate) || Number.isNaN(Date.parse(input.examDate)))
      throw new CoreError('INVALID_INPUT', '考试日期无效');
    const d = Math.round((Date.parse(input.examDate) - Date.parse(today)) / 86400000);
    if (d < 0)
      warning = '考试日期已过期，请更新；已恢复普通调度';
    else
      interval = d <= 1 ? 0 : Math.min(interval, Math.max(1, Math.floor(d / 2)));
  }
  return {
    due: new Date(Date.parse(today) + interval * 86400000).toISOString().slice(0, 10), interval, warning
  };
}
