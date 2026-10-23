import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { validateProfiles, configuredProfiles } from '../../src/budget/config.js';
import { reviewedDeepSeekProfiles } from '../../src/budget/profiles.js';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T12:00:00Z')); });
afterEach(() => vi.useRealTimers());
describe('reviewed pricing configuration admission', () => {
    it('accepts conservative reviewed profiles and returns detached copy', () => { const original = reviewedDeepSeekProfiles(); const result = validateProfiles(original); expect(result.generation.contextTokens).toBe(1048576); original.generation.inputNanoPerMillion = '1'; expect(result.generation.inputNanoPerMillion).toBe('2000000000'); });
    it.each([null, [], {}, 'profiles', 42])('rejects malformed profile container %j', value => expect(() => validateProfiles(value)).toThrow());
    it.each([NaN, Infinity, 1048575, 1048576.5, Number.MAX_SAFE_INTEGER + 1])('rejects unsafe context bound %s', value => { const p = reviewedDeepSeekProfiles(); p.search.contextTokens = value; expect(() => validateProfiles(p)).toThrow(); });
    it.each([[], ['http://api-docs.deepseek.com/quick_start/pricing/'], ['https://api-docs.deepseek.com.evil.test/pricing'], ['https://user:password@api-docs.deepseek.com/pricing'], ['https://api-docs.deepseek.com:8443/pricing']].map(sources => ({
        sources
    })))('requires nonempty exact official HTTPS sources $sources', ({ sources }) => { const p = reviewedDeepSeekProfiles(); p.fetch.sourceUrls = sources; expect(() => validateProfiles(p)).toThrow(); });
    it.each(['not-a-date', '2026-02-30T10:00:00Z', '2026-10-23', '2026-10-23T13:00:00Z'])('rejects invalid or future checkedAt %s', checkedAt => { const p = reviewedDeepSeekProfiles(); p.search.checkedAt = checkedAt; expect(() => validateProfiles(p)).toThrow(); });
    it('rejects reversed, expired and excessive validity windows', () => { for (const until of ['2026-10-23T11:00:00Z', '2026-10-23T12:00:00Z', '2026-10-26T00:00:00Z', 'invalid']) {
        const p = reviewedDeepSeekProfiles();
        p.fetch.validUntil = until;
        expect(() => validateProfiles(p)).toThrow();
    } });
    it.each(['0', '-1', '1', '1e9', 'NaN', ' 2000000000 ', 2000000000])('rejects unsafe or understated input rates %j', amount => { const p = reviewedDeepSeekProfiles(); p.generation.inputNanoPerMillion = amount as string; expect(() => validateProfiles(p)).toThrow(); });
    it('rejects cached rate above reserved miss rate and understated fixed costs', () => { const p = reviewedDeepSeekProfiles(); p.generation.cacheHitNanoPerMillion = '3000000000'; expect(() => validateProfiles(p)).toThrow(); for (const amount of ['0', '1', '-1', '5e6']) {
        const q = reviewedDeepSeekProfiles();
        q.search.fixedNano = amount;
        expect(() => validateProfiles(q)).toThrow();
    } });
    it('rejects truthy substitutes for verified proof flags', () => { const p = reviewedDeepSeekProfiles(); (p.generation as any).verified = 'true'; expect(() => validateProfiles(p)).toThrow(); });
    it('does not silently replace corrupted configured data with built-in rates', () => { for (const raw of ['', '{broken', 'null'])
        expect(() => configuredProfiles(() => raw)).toThrow(); });
    it('expired builtin and configured profiles block until replacement is corrected', () => { const raw = JSON.stringify(reviewedDeepSeekProfiles()); vi.setSystemTime(new Date('2026-10-25T12:00:00Z')); expect(() => configuredProfiles(() => undefined)).toThrow(); expect(() => configuredProfiles(() => raw)).toThrow(); const replacement = reviewedDeepSeekProfiles(); for (const card of Object.values(replacement)) {
        card.checkedAt = '2026-10-25T11:00:00Z';
        card.validUntil = '2026-10-26T11:00:00Z';
    } expect(configuredProfiles(() => JSON.stringify(replacement)).generation.checkedAt).toBe('2026-10-25T11:00:00Z'); });
});
it('higher reviewed rates remain recoverable and conservative', () => {
    const p = reviewedDeepSeekProfiles();
    p.generation.inputNanoPerMillion = '3000000000';
    p.generation.outputNanoPerMillion = '10000000000';
    p.generation.cacheHitNanoPerMillion = '60000000';
    p.search.fixedNano = '6000000';
    p.fetch.fixedNano = '6000000';
    expect(configuredProfiles(() => JSON.stringify(p)).generation.outputNanoPerMillion).toBe('10000000000');
});
it('output and tool charges cannot be understated independently', () => {
    const p = reviewedDeepSeekProfiles();
    p.generation.outputNanoPerMillion = '7999999999';
    expect(() => validateProfiles(p)).toThrow();
    const q = reviewedDeepSeekProfiles();
    q.fetch.fixedNano = '4999999';
    expect(() => validateProfiles(q)).toThrow();
});
it('malformed configuration errors never echo saved content', () => {
    expect(() => configuredProfiles(() => '{secretCredential: do-not-echo')).toThrow(/不是有效 JSON/);
    try {
        configuredProfiles(() => '{secretCredential: do-not-echo');
    }
    catch (e) {
        expect(String(e)).not.toContain('do-not-echo');
    }
});
it('truthy hard cap flags and nonpricing official links are rejected', () => {
    const p = reviewedDeepSeekProfiles();
    (p.search as any).hardOutputIncludesReasoning = 'yes';
    expect(() => validateProfiles(p)).toThrow();
    const q = reviewedDeepSeekProfiles();
    q.search.sourceUrls = ['https://api-docs.deepseek.com/guides/search/'];
    expect(() => validateProfiles(q)).toThrow();
});
