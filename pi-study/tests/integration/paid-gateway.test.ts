import { it, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BudgetService } from '../../src/budget/service.js';
import { PaidGateway } from '../../src/budget/gateway.js';
import { PriceService } from '../../src/budget/pricing.js';
const rate = {
    version: 'fixture-v1', verified: true, sourceUrls: ['https://example.test/proof'], model: 'deepseek-flash', contextTokens: 1000000, inputNanoPerMillion: '2000000000', outputNanoPerMillion: '8000000000', hardOutputIncludesReasoning: true
};
const req = (id = 'a') => ({
    requestId: id, endpoint: 'https://api.deepseek.com/chat/completions', payload: {
        model: 'deepseek-flash', max_tokens: 1024, messages: []
    }, rate
});
function setup(send: (url: string, init: RequestInit) => Promise<Response>) { const b = BudgetService.open({
    path: join(mkdtempSync(join(tmpdir(), 'gateway-')), 'f.sqlite'), initialize: true, timezone: 'UTC'
}); return {
    b, g: new PaidGateway(b, send)
}; }
it('full_context_upper_bound', () => expect(new PriceService().upperBound(req(), rate).amountNano).toBe('2008192000'));
it('no_proven_bound_rejected', () => expect(() => new PriceService().upperBound(req(), {
    ...rate, verified: false
})).toThrow());
it('reasoning_requires_hard_output_cap', () => expect(() => new PriceService().upperBound(req(), {
    ...rate, hardOutputIncludesReasoning: false
})).toThrow());
it('validated_tokenizer_requires_version', () => expect(() => new PriceService().upperBound(req(), {
    ...rate, strategy: 'validated-tokenizer'
})).toThrow());
it('unverified_byte_bound_uses_full_context', () => expect(new PriceService().upperBound(req(), {
    ...rate, strategy: 'verified-byte-bound'
}).strategy).toBe('full-context'));
it('dispatch_durable_before_send', async () => { let b: BudgetService; const s = setup(async (_u, init) => { expect(b.inspect('a').state).toBe('dispatched'); expect(init.redirect).toBe('error'); return new Response('{}'); }); b = s.b; await s.g.execute(req()); expect(b.inspect('a').state).toBe('unknown'); });
it('provider_307_308_never_followed', async () => { let count = 0; const { g, b } = setup(async () => { count++; return new Response('', {
    status: 307, headers: {
        location: 'https://evil.invalid'
    }
}); }); await expect(g.execute(req())).rejects.toThrow(/redirect/); expect(count).toBe(1); expect(b.inspect('a').state).toBe('unknown'); });
it('no_proof_no_send', async () => { let count = 0; const { g } = setup(async () => { count++; return new Response('{}'); }); await expect(g.execute({
    ...req(), rate: undefined
})).rejects.toThrow(); expect(count).toBe(0); });
it('retry_reserves_again', async () => { let count = 0; const { g, b } = setup(async () => { count++; throw new Error('network'); }); await expect(g.execute(req())).rejects.toThrow(); await expect(g.execute(req('retry'))).rejects.toThrow(); expect(count).toBe(2); expect(BigInt(b.snapshot().occupiedNano)).toBe(4016384000n); });
it('valid_usage_settles_actual_cost', async () => { const { g, b } = setup(async () => new Response(JSON.stringify({
    usage: {
        prompt_tokens: 100, completion_tokens: 10
    }
}))); await g.execute(req()); expect(b.inspect('a').state).toBe('settled'); expect(b.inspect('a').actual_nano).toBe('280000'); });
it('post_reservation_mutation_cannot_change_frozen_body', async () => { const request = req(); const { g } = setup(async (_u, init) => { expect(JSON.parse(String(init.body)).max_tokens).toBe(1024); return new Response('{}'); }); const pending = g.execute(request); request.payload.max_tokens = 384000; await pending; });
it('search_fixed_cost_and_empty_result_unbilled', async () => { const { g, b } = setup(async () => new Response(JSON.stringify({
    results: []
}))); const input = {
    requestId: 'search', endpoint: 'https://api.deepseek.com/v1/tools/search', payload: {
        query: 'test'
    }, rate: {
        ...rate, operation: 'search' as const, fixedNano: '5000000'
    }
}; await g.execute(input); expect(b.inspect('search').state).toBe('released'); expect(b.snapshot().occupiedNano).toBe('0'); });
it('multiple_completions_cannot_exceed_output_bound', () => expect(() => new PriceService().upperBound({
    ...req(), payload: {
        ...req().payload, n: 8
    }
}, rate)).toThrow(/payload|completion/));
it('negative_rates_cannot_lower_reservation', () => expect(() => new PriceService().upperBound(req(), {
    ...rate, inputNanoPerMillion: '-1'
})).toThrow(/rate/));
it('billed_cache_fields_reduce_conservative_settlement', async () => { const { g, b } = setup(async () => new Response(JSON.stringify({
    usage: {
        prompt_tokens: 100, completion_tokens: 10, prompt_cache_hit_tokens: 90, prompt_cache_miss_tokens: 10
    }
}))); await g.execute({
    ...req(), rate: {
        ...rate, cacheHitNanoPerMillion: '40000000'
    }
}); expect(b.inspect('a').actual_nano).toBe('103600'); });
it('generate_text_uses_restricted_payload', async () => { const { g } = setup(async (_u, init) => { const p = JSON.parse(String(init.body)); expect(p.thinking).toEqual({
    type: 'disabled'
}); expect(p.max_tokens).toBe(1024); expect(p.stream).toBe(false); return new Response(JSON.stringify({
    choices: [{
            message: {
                content: '参考解析'
            }
        }], usage: {
        prompt_tokens: 10, completion_tokens: 5
    }
})); }); const result = await g.generateText({
    messages: [{
            role: 'user', content: '解释本题'
        }]
}, rate); expect(result.text).toBe('参考解析'); expect(result.state).toBe('settled'); });
it('full_context_may_reject_with_positive_balance', async () => { let sends = 0; const { g, b } = setup(async () => { sends++; return new Response('{}'); }); b.setLimit('1', {
    source: 'cli', confirmed: true
}); await expect(g.execute(req())).rejects.toThrow(/budget/); expect(sends).toBe(0); expect(b.snapshot().remainingNano).toBe('1000000000'); });
