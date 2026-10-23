import { formatMoney } from '../../presentation/money.js';
import type { ExtensionAPI, ExtensionContext, ExtensionCommandContext } from '@earendil-works/pi-coding-agent';
import { createStudyRenderer } from './renderer.js';
import { randomUUID, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createApp, type StudyApp } from '../../composition.js';
import { classifyStudyInput } from '../../study/input.js';
import { questionCard, resultCard, sourceLabel } from '../../presentation/cards.js';
import { ControlledSession, MODEL, PROVIDER } from './session.js';
import { safeQuestionImages } from './images.js';
import { questionContext, STUDY_SYSTEM } from './context.js';
import { scheduleReview } from '../../review/scheduler.js';
import type { SessionSnapshot } from '../../contracts.js';
import type { BudgetTicket } from '../../budget/ledger.js';
const noKey = '未配置 DeepSeek，答题不受影响。在 Pi 用 /login 配置 DeepSeek，或在启动 Pi 的终端设置 DEEPSEEK_API_KEY，然后重新提问。';
export function registerStudy(pi: ExtensionAPI, app: StudyApp) {
    const controlled = new ControlledSession(pi);
    let busy = false, boundary = '', presentation = '', displayedSession = '', request: BudgetTicket | undefined, requestContext: Awaited<ReturnType<typeof questionContext>> = [];
    const action = () => ({ origin: 'pi-interactive' as const, eventId: randomUUID() });
    const sid = () => {
        const id = app.getSetting('activeSession');
        if (!id)
            throw Error('输入 /study 开始刷题');
        return id;
    };
    const send = (content: string, details: Record<string, unknown> = {}) => pi.sendMessage({ customType: 'study-card', content, display: true, details });
    const status = async (ctx: ExtensionContext) => {
        ctx.ui.setStatus('study', undefined);
        if (!controlled.active) {
            ctx.ui.setWidget('study-help', undefined);
            return;
        }
        const b = app.budget.snapshot();
        const snapshot = await app.study.inspect(sid());
        const images = snapshot.question?.assets.some(a => a.role === 'question');
        const {correct, total} = snapshot.progress;
        ctx.ui.setWidget('study-help', [[pi.getThinkingLevel() === 'off' ? '' : '思考', 'n 下一题', images ? '图 打开题图' : '', '直接打字问 DeepSeek', `本轮 对 ${correct} · 错 ${total - correct}`, `本月 ${formatMoney(b.spentCny)} / ${formatMoney(b.limitCny)} 元`].filter(Boolean).join(' · ')], {placement: 'belowEditor'});
    };
    const display = async (ctx: ExtensionContext) => {
        const s = await app.study.inspect(sid()), q = s.question;
        displayedSession = s.session.id;
        if (!q) {
            presentation = '';
            boundary = '';
            send('本轮已完成。/study 1500、/study 省赛、/study pdf 开新一轮；/study menu 设置；/study exit 退出。');
            await status(ctx);
            return;
        }
        let details = {};
        if (presentation !== q.presentationId) {
            presentation = q.presentationId;
            boundary = randomUUID();
            details = { boundary };
        }
        const source = (await app.banks.listSources(s.session.bankId)).find(x => x.id === q.sourceId);
        send(questionCard(q, s.progress, app.budget.snapshot(), ['first-docx', 'province-docx', 'wlan-pdf', 'pdf'].includes(q.sourceId) ? sourceLabel(q.sourceId) : source?.name), { ...details, images: q.assets });
        if (s.status === 'submitted')
            send(resultCard(q, s.answer, await app.study.feedback(q.presentationId), app.budget.snapshot()));
        await status(ctx);
    };
    const ensureShown = async (ctx: ExtensionContext, s: SessionSnapshot) => {
        if (displayedSession === s.session.id && presentation === (s.question?.presentationId ?? ''))
            return true;
        await display(ctx);
        send('题目已在其他窗口变化，已刷新；请按新题重新输入。');
        return false;
    };
    const advance = async (ctx: ExtensionContext) => {
        const s = await app.study.inspect(sid());
        if (!await ensureShown(ctx, s))
            return;
        if (s.question && s.status === 'open')
            await app.study.skip(s.session.id, action(), s.question.presentationId);
        await app.study.next(s.session.id);
        await display(ctx);
    };
    const setDate = async (ctx: ExtensionContext) => {
        const value = await ctx.ui.input('比赛日期（YYYY-MM-DD，留空或 Esc 跳过）', app.getSetting('examDate') ?? '');
        if (value === undefined)
            return;
        if (value.trim())
            scheduleReview({ stage: 0, correct: true, assisted: false, confidence: 'sure', examDate: value.trim(), timezone: app.getSetting('timezone') });
        app.setSetting('examDate', value.trim());
        const id = app.getSetting('activeSession');
        if (id) {
            const row = app.store.db.prepare('SELECT payload FROM sessions WHERE id=?').get(id);
            if (row) {
                const cfg = JSON.parse(String(row.payload));
                cfg.examDate = value.trim() || undefined;
                app.store.db.prepare('UPDATE sessions SET payload=? WHERE id=?').run(JSON.stringify(cfg), id);
            }
        }
    };
    const start = async (args: string, ctx: ExtensionContext) => {
        const banks = await app.banks.list();
        const bank = app.getSetting('activeBank') ?? banks[0]?.id;
        if (!bank)
            throw Error('尚无题库，请先用 study import 导入');
        app.setSetting('activeBank', bank);
        const tokens = args.trim().split(/\s+/).filter(Boolean), allowed = ['1500', '省赛', 'pdf', '错题', '随机'];
        if (tokens.some(t => !allowed.includes(t)) || tokens.filter(t => ['1500', '省赛', 'pdf'].includes(t)).length > 1)
            throw Error('用法：/study [1500|省赛|pdf] [错题] [随机]');
        let id = app.getSetting('activeSession');
        if (id && (await app.study.inspect(id)).session.status === 'completed')
            id = undefined;
        if (tokens.length || !id) {
            const sources = await app.banks.listSources(bank), source = tokens.includes('1500') ? 'first-docx' : tokens.includes('省赛') ? 'province-docx' : tokens.includes('pdf') ? (sources.some(x => x.id === 'wlan-pdf') ? 'wlan-pdf' : 'pdf') : undefined;
            if (source && !sources.some(x => x.id === source))
                throw Error('当前题库没有这个来源');
            const s = await app.study.start({ bankId: bank, mode: 'quick', sourceId: source, selection: tokens.includes('错题') ? 'wrong' : 'adaptive', randomNew: tokens.includes('随机'), examDate: app.getSetting('examDate') || undefined, timezone: app.getSetting('timezone') });
            id = s.id;
            app.setSetting('activeSession', id);
            await app.study.next(id);
        }
        await controlled.enter(ctx);
        await display(ctx);
    };
    const menu = async (ctx: ExtensionContext) => {
        const banks = await app.banks.list(), sessions = await app.study.listSessions();
        const rows = [...banks.map(b => ({ label: '切换题库 · ' + b.name, run: async () => { app.setSetting('activeBank', b.id); app.setSetting('activeSession', ''); await start('', ctx); } })), ...sessions.map(s => ({ label: `恢复 · ${s.sourceId ? sourceLabel(s.sourceId) : '全库'} · ${new Date(s.createdAt).toLocaleString('zh-CN')} · 已做 ${s.answered ?? 0} 题`, run: async () => { await app.study.resume(s.id, action()); app.setSetting('activeSession', s.id); app.setSetting('activeBank', s.bankId); await controlled.enter(ctx); await display(ctx); } })), { label: '成绩', run: async () => {
                    const b = app.getSetting('activeBank');
                    if (!b)
                        return;
                    const stats = await app.stats.read({ bankId: b, timezone: app.getSetting('timezone') });
                    send(`成绩（参考）\n正确 ${stats.historical.numerator} / 已判分 ${stats.historical.denominator}\n${Object.entries(stats.current).map(([label, v]) => `${label === 'independent' ? '独立作答' : '辅助作答'}：${v.numerator} / ${v.denominator}`).join('\n')}`);
                } }, { label: '预算', run: async () => {
                    const b = app.budget.snapshot();
                    const v = await ctx.ui.input(`本月已用 ${formatMoney(b.spentCny)} 元，修改月上限`, b.limitCny);
                    if (v !== undefined && v.trim()) {
                        app.budget.setLimit(v.trim());
                        send(`月上限已设为 ${formatMoney(app.budget.snapshot().limitCny)} 元`);
                        await status(ctx);
                    }
                } }, { label: '比赛日期', run: () => setDate(ctx) }, { label: `答对自动下一题：${app.getSetting('autoNext') === 'true' ? '开' : '关'}`, run: async () => { const value = app.getSetting('autoNext') !== 'true'; app.setSetting('autoNext', String(value)); send(`答对自动下一题已${value ? '开启' : '关闭'}`); } }];
        const choice = await ctx.ui.select('学习设置（Esc 返回当前题）', rows.map((r, i) => `${i + 1}. ${r.label}`));
        if (choice) {
            const i = Number(choice.split('.')[0]) - 1;
            await rows[i]?.run();
        }
        await status(ctx);
    };
    const guarded = async (ctx: ExtensionContext, fn: () => Promise<unknown>) => {
        if (busy) {
            send('操作正在完成，请稍候。');
            return;
        }
        busy = true;
        try {
            await fn();
        }
        catch (e) {
            send(e instanceof Error ? e.message : '操作失败，请重试。');
        }
        finally {
            busy = false;
        }
    };
    pi.registerMessageRenderer('study-card', createStudyRenderer(app.dataDir));
    pi.registerCommand('study', { description: '刷题；menu 设置 / undo 撤销 / think 思考 / budget 金额 / exit 退出', handler: async (args, ctx) => guarded(ctx, async () => {
            const text = args.trim();
            if (text === 'exit') {
                if (!ctx.isIdle()) {
                    ctx.abort();
                    await ctx.waitForIdle();
                }
                const restored = await controlled.exit();
                boundary = '';
                presentation = '';
                await status(ctx);
                send(restored ? '已退出学习，恢复原模型和工具。/study 可继续当前题。' : '已退出学习并恢复工具；原模型凭证不可用，请用 /model 选择模型。');
                return;
            }
            if (!ctx.isIdle()) {
                send('DeepSeek 正在回答，按 Esc 停止后再切题或修改设置。/study exit 可直接退出。');
                return;
            }
            if (text.startsWith('budget')) {
                const v = text.slice(6).trim();
                if (v)
                    app.budget.setLimit(v);
                const b = app.budget.snapshot();
                send(`本月已用 ${formatMoney(b.spentCny)} / ${formatMoney(b.limitCny)} 元。用 /study budget 20 修改月上限。`);
                await status(ctx);
                return;
            }
            if (text === 'menu') {
                await menu(ctx);
                return;
            }
            if (text === 'undo') {
                const snapshot = await app.study.inspect(sid());
                if (!await ensureShown(ctx, snapshot))
                    return;
                await app.study.undo(snapshot.session.id, action());
                await display(ctx);
                return;
            }
            if (text === 'think') {
                if (!controlled.active)
                    await start('', ctx);
                pi.setThinkingLevel(pi.getThinkingLevel() === 'off' ? 'medium' : 'off');
                await status(ctx);
                return;
            }
            if (!app.getSetting('examDateAsked')) {
                app.setSetting('examDateAsked', 'true');
                await setDate(ctx);
            }
            await start(text, ctx);
        }) });
    pi.registerShortcut('ctrl+n', { description: '学习：下一题', handler: async (ctx) => {
            if (controlled.active)
                await guarded(ctx, async () => {
                    if (!ctx.isIdle()) {
                        send('按 Esc 停止回答后可换题。');
                        return;
                    }
                    await advance(ctx);
                });
        } });
    pi.on('input', async (event, ctx) => {
        if (!controlled.active)
            return { action: 'continue' };
        if (event.source !== 'interactive') {
            send('学习态只接受终端中的直接作答；自动调用请使用独立 CLI。');
            return { action: 'handled' };
        }
        if (busy || !ctx.isIdle()) {
            send('DeepSeek 正在回答或操作尚未完成；按 Esc 停止回答后可继续作答。');
            return { action: 'handled' };
        }
        let ask = false;
        await guarded(ctx, async () => {
            const s = await app.study.inspect(sid()), q = s.question;
            if (!await ensureShown(ctx, s))
                return;
            if (!q) {
                send('本轮已完成。用 /study 1500 或 /study menu 开始下一轮。');
                return;
            }
            const parsed = classifyStudyInput(event.text, q);
            if (parsed.type === 'next') {
                await advance(ctx);
                return;
            }
            if (parsed.type === 'image') {
                const images = safeQuestionImages(app.dataDir, q.assets);
                if (!images.length) {
                    send('当前题没有题图。');
                    return;
                }
                const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? undefined : 'xdg-open';
                if (command) {
                    if (process.platform === 'darwin') await promisify(execFile)(command, images.map(image => image.path));
                    else for (const image of images) await promisify(execFile)(command, [image.path]);
                } else send(images.map(image => image.path).join('\n'));
                return;
            }
            if (parsed.type === 'invalid') {
                send(parsed.message);
                return;
            }
            if (parsed.type === 'answer') {
                if (s.status !== 'open') {
                    send('这题已作答；n 下一题，/study undo 撤销后重答。');
                    return;
                }
                const receipt = await app.study.submit({ sessionId: s.session.id, presentationId: q.presentationId, questionRevisionId: q.questionRevisionId, answer: parsed.answer, confidence: parsed.confidence, idempotencyKey: randomUUID() }, action());
                send(resultCard(q, parsed.answer, await app.study.feedback(q.presentationId), app.budget.snapshot()));
                await status(ctx);
                if (receipt.grade.correct && app.getSetting('autoNext') === 'true')
                    await advance(ctx);
                return;
            }
            if (!controlled.ready && !await controlled.connect(ctx)) {
                send(noKey);
                return;
            }
            request = app.budget.begin();
            requestContext = await questionContext(app, s);
            await app.study.markAssisted(s.session.id, action(), q.presentationId);
            ask = true;
        });
        return { action: ask ? 'continue' : 'handled' };
    });
    pi.on('before_agent_start', async () => {
        if (controlled.active)
            return { systemPrompt: STUDY_SYSTEM };
    });
    pi.on('context', event => {
        if (!controlled.active)
            return;
        const i = event.messages.findLastIndex(m => m.role === 'custom' && m.customType === 'study-card' && (m.details as any)?.boundary === boundary);
        const messages = i < 0 ? event.messages.slice(-1) : event.messages.slice(i + 1);
        return { messages: [{ role: 'user' as const, content: requestContext, timestamp: Date.now() }, ...messages.filter(m => m.role === 'user' || m.role === 'assistant')] };
    });
    pi.on('message_end', async (event, ctx) => {
        const m = event.message;
        if (!request || m.role !== 'assistant' || m.provider !== PROVIDER || m.model !== MODEL)
            return;
        const id = request.id + ':' + m.timestamp + ':' + createHash('sha256').update(JSON.stringify([m.content, m.usage])).digest('hex');
        const result = app.budget.record({ ...request, id }, m.usage);
        if (result.warn80)
            send('本月 DeepSeek 用量已达到上限的 80%。可用 /study budget 调整。');
        await status(ctx);
    });
    pi.on('agent_settled', () => { request = undefined; });
    pi.on('session_before_compact', () => controlled.active ? { cancel: true } : undefined);
    pi.on('model_select', async (event, ctx) => {
        if (await controlled.switched(event.model)) {
            boundary = '';
            presentation = '';
            await status(ctx);
            send('已随模型切换退出学习，工具已恢复。/study 可继续刷题。');
        }
    });
    pi.on('session_shutdown', async (event) => {
        try {
            await controlled.exit(event.reason !== 'quit');
        }
        finally {
            app.close();
        }
    });
    return controlled;
}
export default function (pi: ExtensionAPI) { registerStudy(pi, createApp()); }
