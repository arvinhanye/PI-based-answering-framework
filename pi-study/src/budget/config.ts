import { PriceService, type RateCard } from './pricing.js';
import { reviewedDeepSeekProfiles } from './profiles.js';
export type RateProfiles = ReturnType<typeof reviewedDeepSeekProfiles>;
function record(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function timestamp(value: unknown): number {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))
        throw new Error('核查时间及有效期必须是明确的 UTC ISO 时间');
    const parsed = Date.parse(value);
    const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== canonical)
        throw new Error('核查时间或有效期无效');
    return parsed;
}
function amount(value: unknown, minimum: bigint): bigint {
    if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,39})$/.test(value))
        throw new Error('费率必须是规范的非负整数纳元字符串');
    const parsed = BigInt(value);
    if (parsed < minimum)
        throw new Error('配置费率不能低于代码中已核查的保守费率；降价需重新审查上界');
    return parsed;
}
function officialSources(value: unknown): URL[] {
    if (!Array.isArray(value) || value.length === 0 || value.length > 32)
        throw new Error('需要非空的 DeepSeek 官方来源列表');
    const urls = value.map(item => {
        if (typeof item !== 'string' || item.length > 2048)
            throw new Error('费率来源格式无效');
        let url: URL;
        try {
            url = new URL(item);
        }
        catch {
            throw new Error('费率来源格式无效');
        }
        if (url.origin !== 'https://api-docs.deepseek.com' || url.username || url.password || url.hash || url.search)
            throw new Error('只接受无凭证的标准 DeepSeek 官方 HTTPS 文档地址');
        return url;
    });
    if (!urls.some(url => /^\/(?:zh-cn\/)?quick_start\/pricing\/?$/.test(url.pathname)))
        throw new Error('来源必须包含官方模型与价格文档');
    return urls;
}
/** Configuration may raise reviewed prices; lowering the safety floor requires code review. */
export function validateProfiles(value: unknown): RateProfiles {
    if (!record(value))
        throw new Error('费率文件格式无效');
    const baseline = reviewedDeepSeekProfiles();
    const now = Date.now();
    if (!Number.isFinite(now))
        throw new Error('当前时间无效，拒绝费率准入');
    for (const operation of ['generation', 'search', 'fetch'] as const) {
        const raw = value[operation];
        if (!record(raw))
            throw new Error('费率文件缺少完整的请求路线');
        const card = raw as unknown as RateCard;
        if (card.operation !== operation || card.model !== 'deepseek-flash' || card.verified !== true || card.hardOutputIncludesReasoning !== true || typeof card.version !== 'string' || !card.version.trim() || card.version.length > 200)
            throw new Error('需要明确且已核查的 DeepSeek 费率证明');
        if (!Number.isSafeInteger(card.contextTokens) || card.contextTokens < 1048576)
            throw new Error('上下文上界必须是不少于 1048576 的安全整数');
        const checkedAt = timestamp(card.checkedAt), validUntil = timestamp(card.validUntil);
        if (checkedAt > now || validUntil <= checkedAt || validUntil <= now || validUntil - checkedAt > 86400000)
            throw new Error('费率已过期或核查时间/24小时有效期无效');
        const urls = officialSources(card.sourceUrls);
        const inputRate = amount(card.inputNanoPerMillion, BigInt(baseline[operation].inputNanoPerMillion));
        amount(card.outputNanoPerMillion, BigInt(baseline[operation].outputNanoPerMillion));
        if (card.cacheHitNanoPerMillion !== undefined) {
            const hitRate = amount(card.cacheHitNanoPerMillion, BigInt(baseline[operation].cacheHitNanoPerMillion!));
            if (hitRate > inputRate)
                throw new Error('缓存命中费率不能超过已预留的输入费率上界');
        }
        if (operation === 'generation') {
            if (card.restriction !== 'deepseek-text-nonthinking-v1' || card.strategy && card.strategy !== 'full-context')
                throw new Error('只能更新已验证的全文本完整上下文路线');
            if (!urls.some(url => /^\/api\/create-chat-completion\/?$/.test(url.pathname)) || !urls.some(url => /^\/guides\/thinking_mode\/?$/.test(url.pathname)))
                throw new Error('文本路线须保留输出硬上限及关闭思考的官方依据');
            if (card.fixedNano !== undefined)
                amount(card.fixedNano, 0n);
        }
        else {
            amount(card.fixedNano, BigInt(baseline[operation].fixedNano!));
        }
        new PriceService().upperBound({
            requestId: 'validate', endpoint: operation === 'generation' ? 'https://api.deepseek.com/chat/completions' : 'https://api.deepseek.com/v1/tools/' + operation,
            payload: operation === 'generation' ? {
                model: 'deepseek-flash', messages: [{
                        role: 'user', content: 'validate'
                    }], thinking: {
                    type: 'disabled'
                }, max_tokens: 1024, stream: false
            } : {}, rate: card
        }, card);
    }
    return structuredClone(value) as RateProfiles;
}
export function configuredProfiles(getSetting: (key: string) => string | undefined): RateProfiles {
    const raw = getSetting('reviewedRates');
    if (raw === undefined)
        return validateProfiles(reviewedDeepSeekProfiles());
    if (typeof raw !== 'string' || !raw.trim() || raw.length > 65536)
        throw new Error('已保存费率配置损坏；请重新导入完整的已核查配置');
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new Error('已保存费率配置不是有效 JSON；请重新导入');
    }
    return validateProfiles(parsed);
}
