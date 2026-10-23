import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
export const toNano = (value: string): bigint => {
    if (!/^\d+(\.\d{1,9})?$/.test(value))
        throw Error('请输入非负人民币金额（最多 9 位小数）');
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole!) * 1000000000n + BigInt(fraction.padEnd(9, '0'));
};
export const toCny = (value: bigint) => `${value / 1000000000n}.${(value % 1000000000n).toString().padStart(9, '0')}`.replace(/\.?0+$/, '') || '0';
export interface Rates {
    input: string;
    cacheHit: string;
    output: string;
}
export const DEFAULT_RATES: Rates = { input: '2', cacheHit: '0.04', output: '8' };
export function validateRates(value: unknown): Rates {
    const v = value as Rates;
    if (!v || typeof v !== 'object')
        throw Error('费率格式无效');
    for (const key of ['input', 'cacheHit', 'output'] as const) {
        if (typeof v[key] !== 'string')
            throw Error('费率请使用人民币字符串');
        toNano(v[key]);
    }
    return { input: v.input, cacheHit: v.cacheHit, output: v.output };
}
export interface NativeUsage {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
}
export interface BudgetTicket {
    id: string;
    period: string;
    rates: Rates;
}
type Month = {
    id: string;
    limit_nano: string;
    spent_nano: string;
    warned: number;
};
const exhausted = '本月 DeepSeek 额度已用完，可用 /study budget 调整';
/** Native usage is settled after the response. There are deliberately no reservations. */
export class SoftBudgetService {
    private db: DatabaseSync;
    private now: () => Date;
    constructor(options: {
        path: string;
        timezone?: string;
        now?: () => Date;
    }) {
        mkdirSync(dirname(options.path), { recursive: true, mode: 0o700 });
        this.db = new DatabaseSync(options.path);
        this.now = options.now ?? (() => new Date());
        this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS soft_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS monthly_usage(id TEXT PRIMARY KEY,limit_nano TEXT NOT NULL,spent_nano TEXT NOT NULL DEFAULT '0',warned INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS usage_events(id TEXT PRIMARY KEY,period TEXT NOT NULL,amount_nano TEXT NOT NULL,usage TEXT NOT NULL,rates TEXT NOT NULL,created_at TEXT NOT NULL);`);
        this.tx(() => {
            if (this.meta('initialized'))
                return;
            const has = (table: string) => !!this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
            const old = (key: string) => has('meta') ? this.db.prepare('SELECT value FROM meta WHERE key=?').get(key)?.value as string | undefined : undefined;
            const zone = old('timezone') ?? options.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
            new Intl.DateTimeFormat('en', { timeZone: zone });
            this.put('timezone', zone);
            this.put('limit', old('limit') ?? '10000000000');
            this.put('rates', JSON.stringify(DEFAULT_RATES));
            if (has('periods'))
                for (const p of this.db.prepare('SELECT id,limit_nano FROM periods').all()) {
                    let spent = 0n;
                    if (has('requests'))
                        for (const r of this.db.prepare("SELECT actual_nano FROM requests WHERE period=? AND state='settled'").all(String(p.id)))
                            spent += BigInt(String(r.actual_nano));
                    this.db.prepare('INSERT OR IGNORE INTO monthly_usage(id,limit_nano,spent_nano) VALUES(?,?,?)').run(String(p.id), String(p.limit_nano), String(spent));
                }
            this.put('initialized', '1');
        });
    }
    private tx<T>(f: () => T): T { this.db.exec('BEGIN IMMEDIATE'); try {
        const v = f();
        this.db.exec('COMMIT');
        return v;
    }
    catch (e) {
        this.db.exec('ROLLBACK');
        throw e;
    } }
    private meta(key: string) { return this.db.prepare('SELECT value FROM soft_meta WHERE key=?').get(key)?.value as string | undefined; }
    private put(key: string, value: string) { this.db.prepare('INSERT INTO soft_meta VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value); }
    private month() { const p = new Intl.DateTimeFormat('en-CA', { timeZone: this.meta('timezone'), year: 'numeric', month: '2-digit' }).formatToParts(this.now()); return p.find(x => x.type === 'year')!.value + '-' + p.find(x => x.type === 'month')!.value; }
    private row(period = this.month()): Month { this.db.prepare('INSERT OR IGNORE INTO monthly_usage(id,limit_nano) VALUES(?,?)').run(period, this.meta('limit')!); return this.db.prepare('SELECT * FROM monthly_usage WHERE id=?').get(period) as unknown as Month; }
    private view() { const r = this.row(); return { period: r.id, spentCny: toCny(BigInt(r.spent_nano)), limitCny: toCny(BigInt(r.limit_nano)), canAsk: BigInt(r.spent_nano) < BigInt(r.limit_nano), rates: this.rates(), timezone: this.meta('timezone')! }; }
    snapshot() { return this.tx(() => this.view()); }
    rates() { return validateRates(JSON.parse(this.meta('rates')!)); }
    setRates(rates: Rates) { const valid = validateRates(rates); this.tx(() => { this.put('rates', JSON.stringify(valid)); this.put('legacy_rates_done', '1'); }); }
    adoptLegacyRates(raw?: string) {
        this.tx(() => {
            if (this.meta('legacy_rates_done'))
                return;
            if (raw) {
                try {
                    const r = JSON.parse(raw).generation;
                    const values = [r.inputNanoPerMillion, r.cacheHitNanoPerMillion, r.outputNanoPerMillion];
                    if (values.every(v => typeof v === 'string' && /^\d+$/.test(v)))
                        this.put('rates', JSON.stringify({ input: toCny(BigInt(values[0])), cacheHit: toCny(BigInt(values[1])), output: toCny(BigInt(values[2])) }));
                }
                catch { /* Invalid retired configuration falls back to the documented defaults. */ }
            }
            this.put('legacy_rates_done', '1');
        });
    }
    setLimit(cny: string) { const n = toNano(cny); this.tx(() => { this.put('limit', String(n)); this.db.prepare('UPDATE monthly_usage SET limit_nano=? WHERE id=?').run(String(n), this.row().id); }); }
    begin(): BudgetTicket { return this.tx(() => { const s = this.view(); if (!s.canAsk)
        throw Error(exhausted); return { id: randomUUID(), period: s.period, rates: s.rates }; }); }
    record(ticket: BudgetTicket, usage: NativeUsage) {
        for (const key of ['input', 'output', 'cacheRead', 'cacheWrite'] as const)
            if (!Number.isSafeInteger(usage[key]) || usage[key] < 0)
                throw Error('无效的 token 用量');
        const r = validateRates(ticket.rates);
        const amount = ((BigInt(usage.input) + BigInt(usage.cacheWrite)) * toNano(r.input) + BigInt(usage.cacheRead) * toNano(r.cacheHit) + BigInt(usage.output) * toNano(r.output) + 999999n) / 1000000n;
        return this.tx(() => {
            if (this.db.prepare('SELECT id FROM usage_events WHERE id=?').get(ticket.id))
                return { ...this.view(), warn80: false };
            const month = this.row(ticket.period), spent = BigInt(month.spent_nano) + amount;
            const warn80 = !month.warned && spent > 0n && spent * 5n >= BigInt(month.limit_nano) * 4n;
            this.db.prepare('INSERT INTO usage_events VALUES(?,?,?,?,?,?)').run(ticket.id, ticket.period, String(amount), JSON.stringify(usage), JSON.stringify(r), this.now().toISOString());
            this.db.prepare('UPDATE monthly_usage SET spent_nano=?,warned=? WHERE id=?').run(String(spent), month.warned || Number(warn80), ticket.period);
            return { ...this.view(), warn80 };
        });
    }
    close() { this.db.close(); }
}
