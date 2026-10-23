import { openFinance } from '../storage/finance.js';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
export interface BudgetOptions {
    path: string;
    identityPath?: string;
    initialize?: boolean;
    timezone?: string;
    now?: () => Date;
}
export interface ReservationInput {
    requestId: string;
    upperBoundNano: string;
    payloadDigest: string;
    rateVersion: string;
}
export interface TrustedBudgetAction {
    source: 'cli' | 'interactive-menu';
    confirmed: true;
}
export const nano = (s: string) => {
    if (!/^\d+$/.test(s))
        throw new Error('invalid nanoCNY');
    return BigInt(s);
};
export function toNano(s: string): bigint {
    if (!/^\d+(\.\d{1,9})?$/.test(s))
        throw new Error('invalid CNY');
    const [whole, frac = ''] = s.split('.');
    return BigInt(whole!) * 1000000000n + BigInt(frac.padEnd(9, '0'));
}
export function toCny(n: bigint): string { return `${n / 1000000000n}.${(n % 1000000000n).toString().padStart(9, '0')}`.replace(/\.?0+$/, '') || '0'; }
type Row = {
    id: string;
    period: string;
    upper_nano: string;
    actual_nano: string | null;
    state: string;
    digest: string;
    rate: string;
};
export class BudgetService {
    private db: DatabaseSync;
    private now: () => Date;
    static open(o: BudgetOptions) { return new BudgetService(o); }
    constructor(private options: BudgetOptions) {
        this.db = openFinance(oPath(options), options.initialize, options.identityPath);
        this.now = options.now ?? (() => new Date());
        this.tx(() => {
            if (!this.meta('timezone')) {
                const zone = options.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
                new Intl.DateTimeFormat('en', {
                    timeZone: zone
                });
                this.put('timezone', zone);
                this.put('limit', '10000000000');
            }
            this.period();
        });
    }
    private check() {
        if (!existsSync(this.options.path) || !existsSync(this.options.identityPath ?? this.options.path + '.identity'))
            throw new Error('finance ledger missing; frozen');
    }
    private tx<T>(fn: () => T): T {
        this.check();
        this.db.exec('BEGIN IMMEDIATE');
        try {
            const witness = (this.options.identityPath ?? this.options.path + '.identity') + '.witness';
            if (!existsSync(witness) || readFileSync(witness, 'utf8') !== (this.meta('revision') ?? '0'))
                throw new Error('ledger witness conflict; stale backup or interrupted commit');
            const x = fn();
            const revision = String(BigInt(this.meta('revision') ?? '0') + 1n);
            this.put('revision', revision);
            writeFileSync(witness + '.' + process.pid, revision, {
                mode: 0o600, flush: true
            });
            renameSync(witness + '.' + process.pid, witness);
            this.db.exec('COMMIT');
            return x;
        }
        catch (e) {
            this.db.exec('ROLLBACK');
            throw e;
        }
    }
    private meta(k: string) {
        return (this.db.prepare('SELECT value FROM meta WHERE key=?').get(k) as {
            value: string;
        } | undefined)?.value;
    }
    private put(k: string, v: string) { this.db.prepare('INSERT INTO meta VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, v); }
    private period() {
        const time = this.now().getTime();
        if (!Number.isFinite(time))
            throw new Error('invalid clock');
        const last = Number(this.meta('last_time') ?? 0);
        if (time < last)
            throw new Error('clock rollback; paid requests frozen');
        this.put('last_time', String(time));
        const monthInZone = (zone: string) => {
            const parts = new Intl.DateTimeFormat('en-CA', {
                timeZone: zone, year: 'numeric', month: '2-digit'
            }).formatToParts(new Date(time));
            return parts.find(p => p.type === 'year')!.value + '-' + parts.find(p => p.type === 'month')!.value;
        };
        const previous = this.meta('latest_period');
        let id = monthInZone(this.meta('timezone')!);
        if (previous && id < previous)
            throw new Error('clock period rollback');
        // Activate a queued zone only at the old zone's next-month boundary. Derive the
        // accounting month again afterwards: western zones may still be in last month.
        const nextZone = this.meta('next_timezone');
        if (previous && id > previous && nextZone) {
            this.put('timezone', nextZone);
            this.db.prepare("DELETE FROM meta WHERE key='next_timezone'").run();
            id = monthInZone(nextZone);
            if (id < previous)
                id = previous;
        }
        this.put('latest_period', id);
        this.db.prepare('INSERT OR IGNORE INTO periods VALUES(?,?)').run(id, this.meta('limit')!);
        return id;
    }
    private view(id: string) {
        const rows = this.db.prepare('SELECT * FROM requests WHERE period=?').all(id) as Row[];
        let occupied = 0n, spent = 0n;
        for (const r of rows) {
            if (r.state === 'settled')
                spent += nano(r.actual_nano!);
            else if (r.state !== 'released')
                occupied += nano(r.upper_nano);
        }
        const limit = nano((this.db.prepare('SELECT limit_nano FROM periods WHERE id=?').get(id) as {
            limit_nano: string;
        }).limit_nano);
        return {
            period: id, limitCny: toCny(limit), limitNano: String(limit), spentNano: String(spent), occupiedNano: String(occupied), remainingNano: String(limit - spent - occupied), warning80Percent: (spent + occupied) * 5n >= limit * 4n
        };
    }
    snapshot() { return this.tx(() => this.view(this.period())); }
    reserve(r: ReservationInput) {
        return this.tx(() => {
            const period = this.period();
            if (!r.requestId || !r.payloadDigest || !r.rateVersion)
                throw new Error('missing reservation proof');
            const n = nano(r.upperBoundNano);
            if (n <= 0n)
                throw new Error('invalid upper bound');
            if (this.db.prepare('SELECT id FROM requests WHERE id=?').get(r.requestId))
                throw new Error('duplicate requestId; retry requires new reservation');
            if (n > BigInt(this.view(period).remainingNano))
                throw new Error('monthly budget exceeded');
            this.db.prepare("INSERT INTO requests VALUES(?,?,?,NULL,'reserved',?,?)").run(r.requestId, period, String(n), r.payloadDigest, r.rateVersion);
            return {
                requestId: r.requestId, ...this.view(period)
            };
        });
    }
    private row(id: string) {
        const r = this.db.prepare('SELECT * FROM requests WHERE id=?').get(id) as Row | undefined;
        if (!r)
            throw new Error('unknown reservation');
        return r;
    }
    inspect(id: string) { this.check(); return {
        ...this.row(id)
    }; }
    dispatch(id: string) {
        this.tx(() => {
            const r = this.row(id);
            if (r.state !== 'reserved')
                throw new Error('dispatch requires reserved');
            this.db.prepare("UPDATE requests SET state='dispatched' WHERE id=?").run(id);
        });
    }
    settle(id: string, actualNano: string) {
        this.tx(() => {
            const r = this.row(id), a = nano(actualNano);
            if (r.state === 'settled') {
                if (r.actual_nano !== String(a))
                    throw new Error('conflicting settlement');
                return;
            }
            if (!['dispatched', 'unknown'].includes(r.state))
                throw new Error('settlement requires dispatch');
            if (a > nano(r.upper_nano))
                throw new Error('usage exceeds proven bound; frozen reservation');
            this.db.prepare("UPDATE requests SET state='settled',actual_nano=? WHERE id=?").run(String(a), id);
        });
    }
    markUnknown(id: string) {
        this.tx(() => {
            const r = this.row(id);
            if (!['dispatched', 'unknown'].includes(r.state))
                throw new Error('unknown requires dispatch');
            this.db.prepare("UPDATE requests SET state='unknown' WHERE id=?").run(id);
        });
    }
    release(id: string, proof: {
        confirmedUnbilled?: boolean;
    }) {
        this.tx(() => {
            const r = this.row(id);
            if (proof.confirmedUnbilled !== true)
                throw new Error('confirmed unbilled proof required');
            if (r.state === 'settled')
                throw new Error('already settled');
            this.db.prepare("UPDATE requests SET state='released' WHERE id=?").run(id);
        });
    }
    setLimit(cny: string, action: TrustedBudgetAction) {
        this.tx(() => {
            if (!action || !['cli', 'interactive-menu'].includes(action.source) || action.confirmed !== true)
                throw new Error('trusted user action required');
            const n = toNano(cny);
            this.put('limit', String(n));
            this.db.prepare('UPDATE periods SET limit_nano=? WHERE id=?').run(String(n), this.period());
        });
    }
    setTimezone(zone: string, action: TrustedBudgetAction) {
        if (!action || !['cli', 'interactive-menu'].includes(action.source) || action.confirmed !== true)
            throw new Error('trusted user action required');
        new Intl.DateTimeFormat('en', {
            timeZone: zone
        });
        this.tx(() => this.put('next_timezone', zone));
    }
    close() { this.db.close(); }
}
function oPath(o: BudgetOptions) { return o.path; }
