import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BudgetService } from '../../src/budget/service.js';
function setup(now = () => new Date('2026-10-23T12:00:00Z')) { const dir = mkdtempSync(join(tmpdir(), 'budget-')); const options = {
    path: join(dir, 'finance.sqlite'), initialize: true, timezone: 'UTC', now
}; return {
    dir, options, b: BudgetService.open(options)
}; }
const req = (id: string, n = '1000000000') => ({
    requestId: id, upperBoundNano: n, payloadDigest: id, rateVersion: 'fixture-v1'
});
describe('durable budget', () => {
    it('last_balance_two_connections', () => { const { b, options } = setup(); b.reserve(req('spent', '9000000000')); const c = BudgetService.open({
        ...options, initialize: false
    }); b.reserve(req('first')); expect(() => c.reserve(req('second'))).toThrow(/budget/); });
    it('unknown_survives_restart', () => { const { b, options } = setup(); b.reserve(req('a')); b.dispatch('a'); b.markUnknown('a'); b.close(); expect(BudgetService.open({
        ...options, initialize: false
    }).snapshot().occupiedNano).toBe('1000000000'); });
    it('cross_month_original_period_and_rollback', () => { let time = new Date('2026-10-23T12:00:00Z'); const { b } = setup(() => time); b.reserve(req('a')); time = new Date('2026-11-01T12:00:00Z'); expect(b.snapshot().occupiedNano).toBe('0'); b.dispatch('a'); b.settle('a', '700000000'); time = new Date('2026-10-23T12:00:00Z'); expect(() => b.snapshot()).toThrow(/clock/); });
    it('missing_ledger_freezes', () => { const { b, options } = setup(); b.close(); rmSync(options.path); expect(() => BudgetService.open(options)).toThrow(/ledger/); });
    it('settlement_is_idempotent_and_release_requires_proof', () => { const { b } = setup(); b.reserve(req('a')); b.dispatch('a'); b.settle('a', '500'); b.settle('a', '500'); expect(() => b.settle('a', '501')).toThrow(); expect(b.snapshot().spentNano).toBe('500'); b.reserve(req('b')); expect(() => b.release('b', {})).toThrow(); });
    it('trusted_limit_decimal_and_downgrade', () => { const { b } = setup(); expect(() => b.setLimit('1', {
        source: 'model', confirmed: true
    } as any)).toThrow(); b.setLimit('1.25', {
        source: 'cli', confirmed: true
    }); expect(b.snapshot().limitCny).toBe('1.25'); expect(() => b.reserve(req('big', '1250000001'))).toThrow(/budget/); });
});
it('old_finance_backup_cannot_reset_allowance', async () => { const { copyFileSync } = await import('node:fs'); const { b, options } = setup(); b.close(); copyFileSync(options.path, options.path + '.old'); const c = BudgetService.open({
    ...options, initialize: false
}); c.reserve(req('cost', '9000000000')); c.close(); copyFileSync(options.path + '.old', options.path); expect(() => BudgetService.open({
    ...options, initialize: false
})).toThrow(/ledger|witness/); });
it('last_balance_two_processes', async () => { const { build } = await import('esbuild'); const { spawn } = await import('node:child_process'); const { writeFileSync } = await import('node:fs'); const { b, options, dir } = setup(() => new Date()); b.reserve(req('spent', '9000000000')); b.close(); const bundle = join(dir, 'service.mjs'); await build({
    entryPoints: [decodeURIComponent(new URL('../../src/budget/service.ts', import.meta.url).pathname)], outfile: bundle, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent'
}); const worker = join(dir, 'worker.mjs'); writeFileSync(worker, `import {BudgetService} from ${JSON.stringify(bundle)};try{const b=BudgetService.open({path:process.argv[2],initialize:false});b.reserve({requestId:process.argv[3],upperBoundNano:'1000000000',payloadDigest:'x',rateVersion:'fixture'});b.close();process.stdout.write('allowed');}catch(e){process.stdout.write('denied');}`); const run = (id: string) => new Promise<string>((resolve, reject) => { const child = spawn(process.execPath, [worker, options.path, id], {
    stdio: ['ignore', 'pipe', 'pipe']
}); let output = ''; child.stdout.on('data', d => output += d); child.on('error', reject); child.on('close', () => resolve(output)); }); const results = await Promise.all([run('one'), run('two')]); expect(results.filter(r => r === 'allowed')).toHaveLength(1); expect(results.filter(r => r === 'denied')).toHaveLength(1); });
it('queued_timezone_does_not_open_new_allowance_until_new_zone_month_advances', () => { let time = new Date('2026-10-31T23:59:00Z'); const { b } = setup(() => time); b.reserve(req('oct', '9000000000')); b.setTimezone('America/New_York', {
    source: 'cli', confirmed: true
}); time = new Date('2026-11-01T00:01:00Z'); expect(b.snapshot().period).toBe('2026-10'); expect(b.snapshot().remainingNano).toBe('1000000000'); expect(b.snapshot().period).toBe('2026-10'); time = new Date('2026-11-01T04:01:00Z'); expect(b.snapshot().period).toBe('2026-11'); expect(b.snapshot().remainingNano).toBe('10000000000'); });
