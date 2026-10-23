import { it, expect } from 'vitest';
import { PriceService } from '../../src/budget/pricing.js';
import { reviewedDeepSeekProfiles } from '../../src/budget/profiles.js';
const request = {
    requestId: 'production-shape-fixture', endpoint: 'https://api.deepseek.com/chat/completions', payload: {
        model: 'deepseek-flash', max_tokens: 1024, stream: false, thinking: {
            type: 'disabled'
        }, messages: [{
                role: 'user', content: 'Explain a local reference decision.'
            }]
    }
};
it('reviewed_restricted_profile_has_conservative_fullcontext_bound', () => { const r = reviewedDeepSeekProfiles().generation; expect(new PriceService(() => Date.parse('2026-10-23T12:00:00Z')).upperBound(request, r).amountNano).toBe('2105344000'); });
it('restricted_profile_rejects_thinking_tools_and_images', () => {
    const r = reviewedDeepSeekProfiles().generation;
    for (const payload of [{
            ...request.payload, thinking: {
                type: 'enabled'
            }
        }, {
            ...request.payload, tools: []
        }, {
            ...request.payload, messages: [{
                    role: 'user', content: [{
                            type: 'image_url', image_url: {
                                url: 'https://example.com/x'
                            }
                        }]
                }]
        }])
        expect(() => new PriceService(() => Date.parse('2026-10-23T12:00:00Z')).upperBound({
            ...request, payload
        }, r)).toThrow(/restricted|text|thinking/);
});
it('reviewed_profile_expires_under_local_policy', () => expect(() => new PriceService(() => Date.parse('2026-10-25T00:00:00Z')).upperBound(request, reviewedDeepSeekProfiles().generation)).toThrow(/expired/));
