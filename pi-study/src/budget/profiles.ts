import type { RateCard } from './pricing.js';
export function reviewedDeepSeekProfiles(): {
    generation: RateCard;
    search: RateCard;
    fetch: RateCard;
} {
    const common: RateCard = {
        version: 'deepseek-cn-2026-10-23-text-v1', verified: true, sourceUrls: ['https://api-docs.deepseek.com/zh-cn/quick_start/pricing/', 'https://api-docs.deepseek.com/api/create-chat-completion/', 'https://api-docs.deepseek.com/guides/thinking_mode/'], model: 'deepseek-flash', contextTokens: 1048576, inputNanoPerMillion: '2000000000', outputNanoPerMillion: '8000000000', cacheHitNanoPerMillion: '40000000', hardOutputIncludesReasoning: true
    };
    return {
        generation: {
            ...common, operation: 'generation', restriction: 'deepseek-text-nonthinking-v1'
        }, search: {
            ...common, operation: 'search', fixedNano: '5000000', sourceUrls: ['https://api-docs.deepseek.com/zh-cn/quick_start/pricing/', 'https://api-docs.deepseek.com/guides/search/']
        }, fetch: {
            ...common, operation: 'fetch', fixedNano: '5000000', sourceUrls: ['https://api-docs.deepseek.com/zh-cn/quick_start/pricing/', 'https://api-docs.deepseek.com/guides/search/']
        }
    };
}
