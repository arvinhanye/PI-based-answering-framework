import { readFileSync } from 'node:fs';
import { validateRates } from '../budget/ledger.js';
import { questionCard, resultCard } from '../presentation/cards.js';
import { validateTargetUrl } from '../evidence/policy.js';
const DEFAULT_POLICY = { id: 'network-authoritative-v1', version: '1', allowedDomains: ['support.huawei.com', 'info.support.huawei.com', 'rfc-editor.org'] };
import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { createApp } from '../composition.js';
import type { QuestionView, StartSessionInput } from '../contracts.js';
import { scheduleReview } from '../review/scheduler.js';
import { parseAnswer } from '../study/answer-input.js';
import { classifyStudyInput } from '../study/input.js';
export { parseAnswer };
export const HELP = `Pi Study 本地刷题（所有分数均为参考成绩）
  study bank list | create 名称 | select ID
  study sources [--bank ID]
  study import 标准JSON路径 [--bank ID]
  study start [--bank ID] [--source 来源ID] [--selection adaptive|random|sequential|wrong] [--topic 标签]
  study question | next | resume [会话ID] | sessions
  study answer 答案 [--unsure] | undo | reveal | skip
  study feedback [展示ID] | stats | review | pending
  study settings show | exam-date YYYY-MM-DD | timezone IANA名称
  study budget show | set 人民币金额
  study pricing show | set 费率JSON
  study source-policy show | set 来源策略JSON
  study backup 文件.zip | inspect-backup 文件.zip
  study restore 文件.zip --to 新目录 [--yes]
公共参数：--data-dir 业务目录、--session 会话ID、--json
多选写 AC；判断写 正确/错误；填空多个空用 | 分隔。普通文字不计分，answer 命令才提交。
Pi 内使用 /study 直接开始作答，/study menu 设置。精学/测验/简答等完整功能正在后续阶段实现。`;
function parse(args: string[]) { const flags: Record<string, string | boolean> = {}, words: string[] = []; const boolean = new Set(['yes', 'json', 'unsure']); const valued = new Set(['data-dir', 'bank', 'source', 'selection', 'topic', 'session', 'to', 'presentation', 'revision', 'key']); for (let i = 0; i < args.length; i++) {
    const x = args[i]!;
    if (x.startsWith('--')) {
        const k = x.slice(2);
        if (boolean.has(k))
            flags[k] = true;
        else if (valued.has(k) && args[i + 1] && !args[i + 1]!.startsWith('--'))
            flags[k] = args[++i]!;
        else
            throw new Error('未知或缺值参数: ' + x);
    }
    else
        words.push(x);
} return { flags, words }; }
export async function runCli(args: string[], options: {
    home?: string;
    dataDir?: string;
} = {}): Promise<any> {
    if (args.length === 1 && ['--help', '-h'].includes(args[0]!))
        return HELP;
    const { words, flags } = parse(args);
    const command = words.shift();
    if (!command || ['help', '--help', '-h'].includes(command))
        return HELP;
    const str = (k: string) => typeof flags[k] === 'string' ? flags[k] as string : undefined;
    const app = createApp({ ...options, dataDir: str('data-dir') ?? options.dataDir });
    const action = { origin: 'cli' as const, eventId: randomUUID() };
    const bankId = () => str('bank') ?? app.getSetting('activeBank');
    const requireBank = () => { const id = bankId(); if (!id)
        throw new Error('请先 bank create/select 或指定 --bank'); return id; };
    const sid = () => { const id = str('session') ?? app.getSetting('activeSession'); if (!id)
        throw new Error('请先 start 或 resume 会话'); return id; };
    const timezone = () => app.getSetting('timezone') ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const display = (q: QuestionView | null) => q ? { ...q, assets: q.assets.map(a => ({ ...a, path: resolve(app.dataDir, a.path) })) } : null;
    try {
        if (command === 'bank') {
            const sub = words.shift();
            if (sub === 'list')
                return await app.banks.list();
            if (sub === 'create') {
                const b = await app.banks.create(words.join(' '));
                app.setSetting('activeBank', b.id);
                return b;
            }
            if (sub === 'select') {
                const b = await app.banks.select(words[0] ?? '');
                app.setSetting('activeBank', b.id);
                return b;
            }
            throw new Error('未知 bank 子命令');
        }
        if (command === 'sources')
            return (await app.banks.listSources(requireBank())).map((s: any) => ({ id: s.id, name: s.name, sha256: s.sha256, pageCount: s.pageCount, paragraphCount: s.paragraphCount }));
        if (command === 'import') {
            if (!words[0])
                throw new Error('需要 JSON 文件路径');
            const r = await app.importer.import(resolve(words[0]), bankId());
            app.setSetting('activeBank', r.bankId);
            return r;
        }
        if (command === 'start') {
            const selection = str('selection') ?? 'adaptive';
            if (!['adaptive', 'random', 'sequential', 'wrong'].includes(selection))
                throw new Error('无效选题方式');
            const input: StartSessionInput = { bankId: requireBank(), mode: 'quick', sourceId: str('source'), selection: selection as StartSessionInput['selection'], topic: str('topic'), examDate: app.getSetting('examDate') || undefined, timezone: timezone() };
            const session = await app.study.start(input);
            app.setSetting('activeSession', session.id);
            const warning = scheduleReview({ stage: 0, correct: true, assisted: false, confidence: 'sure', examDate: input.examDate, timezone: input.timezone }).warning;
            const question = display(await app.study.next(session.id));
            return { session, question, progress: (await app.study.inspect(session.id)).progress, budget: app.budget.snapshot(), warning };
        }
        if (command === 'sessions')
            return await app.study.listSessions(bankId());
        if (command === 'resume') {
            const id = words[0] ?? sid();
            const snapshot = await app.study.resume(id, action);
            app.setSetting('activeSession', id);
            app.setSetting('activeBank', snapshot.session.bankId);
            return { ...snapshot, question: display(snapshot.question), budget: app.budget.snapshot() };
        }
        if (command === 'question') {
            const snapshot = await app.study.inspect(sid());
            return { ...snapshot, question: display(snapshot.question), budget: app.budget.snapshot() };
        }
        if (command === 'next') {
            const s = await app.study.inspect(sid());
            if (s.status === 'open' && s.question)
                await app.study.skip(sid(), action, s.question.presentationId);
            const question = display(await app.study.next(sid()));
            return { question, progress: (await app.study.inspect(sid())).progress, budget: app.budget.snapshot() };
        }
        if (command === 'undo') {
            const s = await app.study.undo(sid(), action);
            return { ...s, question: display(s.question), budget: app.budget.snapshot() };
        }
        if (['answer', 'reveal', 'skip', 'feedback'].includes(command)) {
            const snapshot = await app.study.inspect(sid()), q = snapshot.question;
            if (!q)
                throw new Error('当前没有题目，请 next');
            const pid = str('presentation') ?? q.presentationId, rid = str('revision') ?? q.questionRevisionId;
            if (command === 'answer') {
                const text = words.join(' ');
                const parsed = classifyStudyInput(q.kind === 'fill' && !text.startsWith('=') ? '=' + text : text, q);
                if (parsed.type !== 'answer')
                    throw Error(parsed.type === 'invalid' ? parsed.message : '请输入当前题的答案');
                const receipt = await app.study.submit({ sessionId: sid(), presentationId: pid, questionRevisionId: rid, answer: parsed.answer, confidence: flags.unsure ? 'unsure' : parsed.confidence, idempotencyKey: str('key') ?? randomUUID() }, action);
                return { ...receipt, question: display(q), answer: parsed.answer, feedback: await app.study.feedback(pid), budget: app.budget.snapshot() };
            }
            if (command === 'skip')
                return await app.study.skip(sid(), action, pid);
            if (command === 'reveal')
                return await app.study.reveal(pid, action);
            return await app.study.feedback(words[0] ?? pid);
        }
        if (command === 'stats')
            return await app.stats.read({ bankId: requireBank(), sourceId: str('source'), topic: str('topic'), timezone: timezone() });
        if (command === 'review')
            return (await app.review.queue({ bankId: requireBank(), sourceId: str('source'), timezone: timezone() })).map(q => ({ questionId: q.questionId, sourceKey: q.sourceKey, kind: q.kind, topics: q.topics }));
        if (command === 'pending')
            return app.store.db.prepare("SELECT q.id,q.source_id,q.source_key,r.payload FROM questions q JOIN revisions r ON r.id=q.current_revision_id WHERE q.bank_id=?").all(requireBank()).flatMap(r => { const q = JSON.parse(String(r.payload)); return q.status === 'needs_review' ? [{ questionId: r.id, sourceId: r.source_id, sourceKey: r.source_key, status: q.status, issueCount: q.issues.length }] : []; });
        if (command === 'settings') {
            const sub = words[0];
            if (sub === 'exam-date') {
                const value = words[1] ?? '';
                if (value)
                    scheduleReview({ stage: 0, correct: true, assisted: false, confidence: 'sure', examDate: value, timezone: timezone() });
                app.setSetting('examDate', value);
            }
            else if (sub === 'timezone') {
                const value = words[1] ?? '';
                new Intl.DateTimeFormat('en', { timeZone: value });
                app.setSetting('timezone', value);
            }
            else if (sub !== 'show')
                throw new Error('未知 settings 子命令');
            return { examDate: app.getSetting('examDate') ?? null, timezone: timezone(), dataDir: app.dataDir };
        }
        if (command === 'pricing') {
            if (words[0] === 'show')
                return app.budget.rates();
            if (words[0] === 'set' && words[1]) {
                app.budget.setRates(validateRates(JSON.parse(readFileSync(words[1], 'utf8'))));
                return app.budget.rates();
            }
            throw new Error('pricing show | set 文件');
        }
        if (command === 'source-policy') {
            const id = requireBank();
            if (words[0] === 'show')
                return JSON.parse(app.getSetting('sourcePolicy:' + id) ?? JSON.stringify(DEFAULT_POLICY));
            if (words[0] === 'set' && words[1]) {
                const p = JSON.parse(readFileSync(words[1], 'utf8'));
                if (typeof p.id !== 'string' || !p.id || typeof p.version !== 'string' || !p.version || !Array.isArray(p.allowedDomains) || p.allowedDomains.length === 0 || p.allowedDomains.some((d: unknown) => typeof d !== 'string' || new URL(validateTargetUrl('https://' + d)).hostname !== d))
                    throw new Error('来源策略需要id、version和有效域名列表allowedDomains');
                app.setSetting('sourcePolicy:' + id, JSON.stringify({ id: p.id, version: p.version, allowedDomains: p.allowedDomains }));
                return { updated: true };
            }
            throw new Error('source-policy show | set 文件');
        }
        if (command === 'budget') {
            if (words[0] === 'set')
                app.budget.setLimit(words[1] ?? '');
            else if (words[0] !== 'show')
                throw new Error('未知 budget 子命令');
            return app.budget.snapshot();
        }
        if (command === 'backup') {
            if (!words[0])
                throw new Error('需要备份文件名');
            return await app.backup.create(resolve(words[0]));
        }
        if (command === 'inspect-backup') {
            if (!words[0])
                throw new Error('需要备份文件');
            return app.backup.inspect(resolve(words[0]));
        }
        if (command === 'restore') {
            if (!words[0] || !str('to'))
                throw new Error('需要备份文件和 --to 新目录');
            const manifest = app.backup.inspect(resolve(words[0]));
            if (!flags.yes)
                return { preview: manifest, target: resolve(str('to')!), confirmation: '核对后重试并加 --yes，恢复写新空间，财务账本不变' };
            const target = await app.backup.restore(resolve(words[0]), resolve(str('to')!));
            if (!str('data-dir') && !options.dataDir)
                app.selectSpace(target);
            return { restored: target, financeUnchanged: true };
        }
        throw new Error('未知命令: ' + command + '；运行 help 查看用法');
    }
    finally {
        app.close();
    }
}
export function renderCli(result: any): string {
    if (typeof result === 'string')
        return result;
    if (result?.question) {
        if (result.feedback)
            return resultCard(result.question, result.answer, result.feedback, result.budget).replace('n 下一题', 'study next 下一题').replace('直接打字问 DeepSeek', '在 Pi 中提问').replace('/study undo', 'study undo');
        return questionCard(result.question, result.progress ?? { correct: 0, total: 0 }, result.budget).replaceAll('Ctrl+Alt+N', 'study next').replaceAll('Ctrl+Alt+O 打开', '见题图文件').replaceAll('/study menu 设置', 'study help 帮助').replaceAll('/study exit 退出', '终端 Ctrl+C 退出').replaceAll('直接打字问 DeepSeek', '在 Pi 中提问') + (result.question.assets.length ? '\n' + result.question.assets.map((a: any) => '题图：' + a.path).join('\n') : '');
    }
    if (result?.question === null)
        return '本轮已完成；study start 开新一轮。';
    return JSON.stringify(result, null, 2);
}
