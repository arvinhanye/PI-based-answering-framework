import { it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StudyStore } from '../../src/storage/business.js';
import { BankService } from '../../src/banks/service.js';
import { StudyService } from '../../src/study/service.js';
import { StatisticsService } from '../../src/review/statistics.js';
import type { QuestionBankInput } from '../../src/contracts.js';
const dirs: string[] = [];
const stores: StudyStore[] = [];
afterEach(() => {
  stores.forEach(s => {
    try {
      s.close();
    }
    catch {
    }
  });
  dirs.forEach(d => rmSync(d, {
    recursive: true, force: true
  }));
  stores.length = 0;
  dirs.length = 0;
});
const action = {
  origin: 'cli' as const, eventId: 'real-handler'
};
async function setup(issues: string[] = []) {
  const dir = mkdtempSync(join(tmpdir(), 'study-core-'));
  dirs.push(dir);
  const store = new StudyStore(dir);
  stores.push(store);
  const input: QuestionBankInput = {
    schemaVersion: 1, source: {
      id: 'source1', name: 'Test', sha256: 'abc'
    }, report: {
      candidateCount: 2, ready: 2, needsReview: 0, gaps: []
    }, questions: [
      1, 2
    ].map(n => ({
      sourceKey: String(n), kind: 'single', stem: 'Question ' + n, options: [
        {
          id: 'A', text: 'one'
        }, {
          id: 'B', text: 'two'
        }
      ], answer: [
        'A'
      ], rawAnswer: 'A', explanation: 'private explanation', topics: [
        'sql'
      ], status: 'ready', basisStatus: 'source_only', issues, locations: [], assets: []
    }))
  };
  const bank = await new BankService(store).importBank(input);
  const service = new StudyService(store);
  const session = await service.start({
    bankId: bank.bankId, selection: 'sequential'
  });
  return {
    dir, store, service, session, bank
  };
}
it('no_answers_feedback_lock_stale_guard_and_idempotency', async () => {
  const { store, service, session } = await setup();
  const q = (await service.next(session.id))!;
  expect(JSON.stringify(q)).not.toContain('private explanation');
  expect(q).not.toHaveProperty('answer');
  await expect(service.feedback(q.presentationId)).rejects.toMatchObject({
    code: 'ALREADY_FINALIZED'
  });
  await expect(service.submit({
    sessionId: session.id, presentationId: 'stale', questionRevisionId: q.questionRevisionId, answer: [
      'A'
    ], confidence: 'sure', idempotencyKey: 'x'
  }, action)).rejects.toMatchObject({
    code: 'STALE_PRESENTATION'
  });
  const input = {
    sessionId: session.id, presentationId: q.presentationId, questionRevisionId: q.questionRevisionId, answer: [
      'A'
    ], confidence: 'sure' as const, idempotencyKey: 'one'
  };
  const first = await service.submit(input, action);
  expect(first.grade.correct).toBe(true);
  expect(await service.submit(input, action)).toEqual(first);
  await expect(service.submit({
    ...input, answer: [
      'B'
    ]
  }, action)).rejects.toMatchObject({
    code: 'STORAGE_CONFLICT'
  });
  expect(store.db.prepare('SELECT count(*) AS n FROM submissions').get()!.n).toBe(1);
  expect((await service.feedback(q.presentationId)).answer).toEqual([
    'A'
  ]);
  await service.next(session.id);
  await expect(service.submit({
    ...input, idempotencyKey: 'new'
  }, action)).rejects.toMatchObject({
    code: 'STALE_PRESENTATION'
  });
});
it('restart_preserves_draft_presentation_assisted', async () => {
  const { dir, store, service, session } = await setup();
  const q = (await service.next(session.id))!;
  await service.saveDraft(session.id, [
    'B'
  ], action, q.presentationId);
  await service.hint(session.id, action, (await service.inspect(session.id)).question!.presentationId);
  store.close();
  const reopened = new StudyStore(dir);
  stores.push(reopened);
  const svc = new StudyService(reopened);
  const snap = await svc.resume(session.id, action);
  expect(snap.question?.presentationId).toBe(q.presentationId);
  expect(snap.draft).toEqual([
    'B'
  ]);
  expect(snap.assisted).toBe(true);
  expect((await svc.next(session.id))?.presentationId).toBe(q.presentationId);
  const receipt = await svc.submit({
    sessionId: session.id, presentationId: q.presentationId, questionRevisionId: q.questionRevisionId, answer: [
      'A'
    ], confidence: 'sure', idempotencyKey: 'restart'
  }, action);
  expect(receipt.assisted).toBe(true);
});
it('latest_independent_separate_from_assisted_and_history', async () => {
  const { store, service, session, bank } = await setup();
  const q = (await service.next(session.id))!;
  await service.submit({
    sessionId: session.id, presentationId: q.presentationId, questionRevisionId: q.questionRevisionId, answer: [
      'B'
    ], confidence: 'sure', idempotencyKey: 'wrong'
  }, action);
  const s2 = await service.start({
    bankId: bank.bankId, selection: 'sequential'
  });
  const q2 = (await service.next(s2.id))!;
  await service.submit({
    sessionId: s2.id, presentationId: q2.presentationId, questionRevisionId: q2.questionRevisionId, answer: [
      'A'
    ], confidence: 'sure', idempotencyKey: 'right'
  }, action);
  let stats = await new StatisticsService(store).read({
    bankId: bank.bankId
  });
  expect(stats.historical).toEqual({
    numerator: 1, denominator: 2
  });
  expect(stats.current.independent).toEqual({
    numerator: 1, denominator: 1
  });
  const s3 = await service.start({
    bankId: bank.bankId, selection: 'sequential'
  });
  const q3 = (await service.next(s3.id))!;
  await service.hint(s3.id, action, (await service.inspect(s3.id)).question!.presentationId);
  await service.submit({
    sessionId: s3.id, presentationId: q3.presentationId, questionRevisionId: q3.questionRevisionId, answer: [
      'B'
    ], confidence: 'sure', idempotencyKey: 'help'
  }, action);
  stats = await new StatisticsService(store).read({
    bankId: bank.bankId
  });
  expect(stats.current.independent).toEqual({
    numerator: 1, denominator: 1
  });
  expect(stats.current.assisted).toEqual({
    numerator: 0, denominator: 1
  });
});
it('skip_reveal_are_explicit_and_no_submission', async () => {
  const { store, service, session } = await setup();
  const q = (await service.next(session.id))!;
  await service.skip(session.id, action, (await service.inspect(session.id)).question!.presentationId);
  await expect(service.feedback(q.presentationId)).rejects.toBeDefined();
  const next = (await service.next(session.id))!;
  expect((await service.reveal(next.presentationId, action)).answer).toEqual([
    'A'
  ]);
  expect(await service.next(session.id)).toBeNull();
  expect(store.db.prepare('SELECT count(*) AS n FROM submissions').get()!.n).toBe(0);
});
it('same_source_import_without_bank_is_idempotent', async () => {
  const { store, bank } = await setup();
  const payload = JSON.parse(String(store.db.prepare('SELECT payload FROM sources WHERE id=?').get('source1')!.payload));
  const result = await new BankService(store).importBank(payload);
  expect(result.bankId).toBe(bank.bankId);
  expect(result.duplicates).toBe(2);
  expect((await new BankService(store).list()).length).toBe(1);
});
it('unscorable_does_not_create_weakness_and_assisted_does_not_replace_independent', async () => {
  const { store, service, session, bank } = await setup();
  const q = (await service.next(session.id))!;
  await service.submit({
    sessionId: session.id, presentationId: q.presentationId, questionRevisionId: q.questionRevisionId, answer: [
      'A'
    ], confidence: 'sure', idempotencyKey: 'independent'
  }, action);
  const s = await service.start({
    bankId: bank.bankId, selection: 'sequential'
  });
  const next = (await service.next(s.id))!;
  await service.hint(s.id, action, (await service.inspect(s.id)).question!.presentationId);
  await service.submit({
    sessionId: s.id, presentationId: next.presentationId, questionRevisionId: next.questionRevisionId, answer: [
      'B'
    ], confidence: 'sure', idempotencyKey: 'assisted'
  }, action);
  expect((await new StatisticsService(store).read({
    bankId: bank.bankId
  })).wrong).toBe(0);
});
it('unscorable_has_no_review_row_or_statistics_denominator', async () => {
  const { store, service, session, bank } = await setup();
  const q = (await service.next(session.id))!;
  const row = store.db.prepare('SELECT payload FROM revisions WHERE id=?').get(q.questionRevisionId)!;
  const payload = JSON.parse(String(row.payload));
  payload.status = 'needs_review';
  store.db.prepare('UPDATE revisions SET payload=? WHERE id=?').run(JSON.stringify(payload), q.questionRevisionId);
  const result = await service.submit({
    sessionId: session.id, presentationId: q.presentationId, questionRevisionId: q.questionRevisionId, answer: [
      'A'
    ], confidence: 'sure', idempotencyKey: 'missing-condition'
  }, action);
  expect(result.grade.status).toBe('unscorable');
  expect(store.db.prepare('SELECT count(*) AS n FROM review').get()!.n).toBe(0);
  const stats = await new StatisticsService(store).read({
    bankId: bank.bankId
  });
  expect(stats.current.independent.denominator).toBe(0);
  expect(stats.wrong).toBe(0);
  expect(stats.excluded).toBe(1);
});
it('ambiguous_or_invalid_action_cannot_submit', async () => {
  const { store, service, session } = await setup();
  const q = (await service.next(session.id))!;
  await expect(service.submit({
    sessionId: session.id, presentationId: q.presentationId, questionRevisionId: q.questionRevisionId, answer: [
      'A'
    ], confidence: 'sure', idempotencyKey: 'invalid'
  }, {
    origin: 'model', eventId: 'untrusted'
  } as any)).rejects.toMatchObject({
    code: 'INVALID_INPUT'
  });
  expect(store.db.prepare('SELECT count(*) AS n FROM submissions').get()!.n).toBe(0);
});
it('missing_presentation_and_revision_never_default_to_current',async()=>{const {service,session,store}=await setup();await service.next(session.id);await expect(service.submit({sessionId:session.id,answer:['A'],confidence:'sure',idempotencyKey:'missing'} as any,action)).rejects.toThrow();expect(store.db.prepare('SELECT COUNT(*) n FROM submissions').get()?.n).toBe(0);});
it('late_skip_and_draft_are_bound_to_original_presentation',async()=>{const {service,session}=await setup();const old=(await service.next(session.id))!;await (service.skip as any)(session.id,action,old.presentationId);const current=(await service.next(session.id))!;await expect((service.skip as any)(session.id,action,old.presentationId)).rejects.toMatchObject({code:'STALE_PRESENTATION'});await expect((service.saveDraft as any)(session.id,['B'],action,old.presentationId)).rejects.toMatchObject({code:'STALE_PRESENTATION'});expect((await service.inspect(session.id)).question?.presentationId).toBe(current.presentationId);});
it('unimplemented_modes_are_rejected_instead_of_silent_quick',async()=>{const {service,bank}=await setup();await expect(service.start({bankId:bank.bankId,mode:'exam'})).rejects.toThrow(/暂未/);});
it('due_queue_and_statistics_use_configured_calendar_day',async()=>{const {service,session,store,bank}=await setup();const q=(await service.next(session.id))!;await service.submit({sessionId:session.id,presentationId:q.presentationId,questionRevisionId:q.questionRevisionId,answer:['A'],confidence:'sure',idempotencyKey:'calendar'},action);store.db.prepare('UPDATE review SET due=?').run('2026-10-23');const {vi}=await import('vitest');const {ReviewService}=await import('../../src/review/service.js');vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-23T00:30:00Z'));try{expect((await new StatisticsService(store).read({bankId:bank.bankId,timezone:'America/Los_Angeles'} as any)).due).toBe(0);expect(await new ReviewService(store).queue({bankId:bank.bankId,timezone:'America/Los_Angeles'} as any)).toHaveLength(0);}finally{vi.useRealTimers();}});

it('free_text_issues_do_not_leak_before_answer_but_remain_in_unlocked_feedback', async () => {
  const secretIssue = '原件参考答案是A；需复核';
  const { service, session } = await setup([secretIssue]);
  const question = (await service.next(session.id))!;
  const inspected = await service.inspect(session.id);
  const resumed = await service.resume(session.id, action);
  for (const view of [question, inspected.question, resumed.question]) {
    expect(JSON.stringify(view)).not.toContain(secretIssue);
    expect(view).not.toHaveProperty('issues');
    expect(view).toHaveProperty('issueCount', 1);
  }
  await expect(service.feedback(question.presentationId)).rejects.toThrow();
  const feedback = await service.reveal(question.presentationId, action);
  expect(feedback.issues).toEqual([secretIssue]);
});
