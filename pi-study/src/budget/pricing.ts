export interface RateCard {
    restriction?: 'deepseek-text-nonthinking-v1';
    checkedAt?: string;
    cacheHitNanoPerMillion?: string;
    operation?: 'generation' | 'search' | 'fetch';
    version: string;
    verified: boolean;
    validUntil: string;
    sourceUrls: string[];
    model: string;
    contextTokens: number;
    inputNanoPerMillion: string;
    outputNanoPerMillion: string;
    fixedNano?: string;
    hardOutputIncludesReasoning: boolean;
    strategy?: 'full-context' | 'validated-tokenizer' | 'verified-byte-bound';
    tokenizerVersion?: string;
    templateVersion?: string;
    imageProof?: string;
}
export interface PaidRequest {
    requestId: string;
    endpoint: string;
    payload: Record<string, unknown>;
    rate?: RateCard;
    signal?: AbortSignal;
}
export interface CostUpperBound {
    amountNano: string;
    strategy: string;
    proofVersion: string;
}
export class PriceService {
    constructor(private now: () => number = Date.now) { }
    upperBound(i: PaidRequest, r: RateCard): CostUpperBound {
        if (!r.verified || !r.version || !r.sourceUrls.length || !Number.isFinite(Date.parse(r.validUntil)) || Date.parse(r.validUntil) <= this.now())
            throw new Error('unverified or expired pricing');
        if (r.operation === 'search' || r.operation === 'fetch') {
            if (i.endpoint !== 'https://api.deepseek.com/v1/tools/' + r.operation || !r.fixedNano || BigInt(r.fixedNano) <= 0n)
                throw new Error('fixed tool rate mismatch');
            return {
                amountNano: r.fixedNano, strategy: 'fixed-request', proofVersion: r.version
            };
        }
        if (i.endpoint.includes('/tools/'))
            throw new Error('tool request requires fixed pricing');
        const allowed = new Set(['model', 'messages', 'max_tokens', 'stream', 'temperature', 'top_p', 'stop', 'seed', 'presence_penalty', 'frequency_penalty', 'user', 'response_format', 'thinking', 'tools', 'tool_choice', 'parallel_tool_calls', 'stream_options']);
        for (const k of Object.keys(i.payload))
            if (!allowed.has(k))
                throw new Error('unverified final payload field: ' + k);
        for (const value of [r.inputNanoPerMillion, r.outputNanoPerMillion, r.fixedNano ?? '0', r.cacheHitNanoPerMillion ?? '0'])
            if (!/^\d+$/.test(value))
                throw new Error('invalid rate');
        if (r.restriction === 'deepseek-text-nonthinking-v1') {
            const keys = new Set(['model', 'messages', 'max_tokens', 'stream', 'thinking', 'response_format']);
            if (Object.keys(i.payload).some(k => !keys.has(k)) || i.payload.stream !== false || i.payload.max_tokens !== 1024 || (i.payload.thinking as any)?.type !== 'disabled' || Object.keys(i.payload.thinking as object).some(k => k !== 'type'))
                throw new Error('restricted payload requires nonstream disabled thinking and 1024 cap');
            if (!Array.isArray(i.payload.messages) || !i.payload.messages.length || i.payload.messages.some((m: any) => !m || !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || Object.keys(m).some(k => !['role', 'content'].includes(k))))
                throw new Error('restricted text messages required');
            if (i.payload.response_format !== undefined && ((i.payload.response_format as any)?.type !== 'json_object' || Object.keys(i.payload.response_format as object).some(k => k !== 'type')))
                throw new Error('restricted response format');
        }
        if (i.payload.model !== r.model)
            throw new Error('rate model mismatch');
        if (!r.hardOutputIncludesReasoning)
            throw new Error('reasoning requires proven hard output cap');
        const cap = i.payload.max_tokens;
        if (!Number.isSafeInteger(cap) || Number(cap) <= 0 || Number(cap) > 384000)
            throw new Error('invalid hard output cap');
        if (!Number.isSafeInteger(r.contextTokens) || r.contextTokens <= 0)
            throw new Error('no proven context bound');
        if (r.strategy === 'validated-tokenizer')
            throw new Error('validated tokenizer implementation/version unavailable');
        // No byte/tokenizer proof is installed. Full context never relies on message byte guesses.
        const input = BigInt(r.contextTokens), out = BigInt(Number(cap));
        const a = (input * BigInt(r.inputNanoPerMillion) + 999999n) / 1000000n + (out * BigInt(r.outputNanoPerMillion) + 999999n) / 1000000n + BigInt(r.fixedNano ?? '0');
        if (a <= 0n)
            throw new Error('invalid cost upper bound');
        return {
            amountNano: String(a), strategy: 'full-context', proofVersion: r.version
        };
    }
}
