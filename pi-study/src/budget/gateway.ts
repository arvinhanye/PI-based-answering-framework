import { createHash, randomUUID } from 'node:crypto';
import { reviewedDeepSeekProfiles } from './profiles.js';
import { PriceService, type PaidRequest } from './pricing.js';
import { BudgetService } from './service.js';
export interface PaidResult {
    requestId: string;
    response: Response;
    state: 'unknown' | 'settled';
}
export const PROVIDER_ENDPOINTS = new Set(['https://api.deepseek.com/chat/completions', 'https://api.deepseek.com/v1/chat/completions', 'https://api.deepseek.com/v1/tools/search', 'https://api.deepseek.com/v1/tools/fetch']);
export const payloadDigest = (text: string) => createHash('sha256').update(text).digest('hex');
export class PaidGateway {
    constructor(private budget: BudgetService, private send: (url: string, init: RequestInit) => Promise<Response>, private headers: () => Record<string, string> = () => ({})) { }
    async generateText(_input: {
        messages: Array<{
            role: 'system' | 'user' | 'assistant';
            content: string;
        }>;
        requestId?: string;
        signal?: AbortSignal;
        json?: boolean;
    }, _rate?: import('./pricing.js').RateCard): Promise<{
        text: string;
        requestId: string;
        state: string;
        estimatedCostNano: string | null;
    }> {
        const rate = _rate ?? reviewedDeepSeekProfiles().generation, requestId = _input.requestId ?? randomUUID();
        const result = await this.execute({
            requestId, endpoint: 'https://api.deepseek.com/chat/completions', rate, signal: _input.signal, payload: {
                model: 'deepseek-flash', messages: _input.messages, thinking: {
                    type: 'disabled'
                }, max_tokens: 1024, stream: false, ...(_input.json ? {
                    response_format: {
                        type: 'json_object'
                    }
                } : {})
            }
        });
        if (!result.response.ok)
            throw new Error('generation provider HTTP ' + result.response.status);
        const data = await result.response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (typeof text !== 'string')
            throw new Error('generation response missing text');
        return {
            text, requestId, state: result.state, estimatedCostNano: this.budget.inspect(requestId).actual_nano
        };
    }
    async execute(input: PaidRequest): Promise<PaidResult> {
        if (!PROVIDER_ENDPOINTS.has(input.endpoint))
            throw new Error('fixed provider endpoint required');
        if (!input.rate)
            throw new Error('paid route disabled: verified pricing and upper bound unavailable');
        const rate = structuredClone(input.rate);
        const payload = JSON.parse(JSON.stringify(input.payload)) as Record<string, unknown>;
        if (payload.stream === true)
            throw new Error('streaming settlement not verified; route disabled');
        const body = JSON.stringify(payload), digest = payloadDigest(body);
        const bound = new PriceService().upperBound({
            ...input, payload
        }, rate);
        const headers = {
            ...this.headers(), 'content-type': 'application/json'
        };
        this.budget.reserve({
            requestId: input.requestId, upperBoundNano: bound.amountNano, payloadDigest: digest, rateVersion: bound.proofVersion
        });
        if (input.signal?.aborted) {
            this.budget.release(input.requestId, {
                confirmedUnbilled: true
            });
            throw new Error('cancelled before dispatch');
        }
        if (payloadDigest(body) !== digest)
            throw new Error('post reservation mutation');
        this.budget.dispatch(input.requestId);
        try {
            const response = await this.send(input.endpoint, {
                method: 'POST', body, headers, redirect: 'error', signal: input.signal
            });
            this.budget.markUnknown(input.requestId);
            if (response.status >= 300 && response.status < 400)
                throw new Error('provider redirect blocked');
            // Without verified usage, interrupted bodies and error responses retain the full reservation.
            if (response.ok) {
                const data = await response.clone().json().catch(() => null);
                if (rate.operation === 'search' || rate.operation === 'fetch') {
                    const valid = rate.operation === 'search' ? Array.isArray(data?.results) : typeof data?.content === 'string';
                    const nonempty = rate.operation === 'search' ? data?.results?.length > 0 : !!data?.content?.trim();
                    if (valid) {
                        if (nonempty)
                            this.budget.settle(input.requestId, rate.fixedNano!);
                        else
                            this.budget.release(input.requestId, {
                                confirmedUnbilled: true
                            });
                        return {
                            requestId: input.requestId, response, state: 'settled'
                        };
                    }
                }
                const usage = data?.usage;
                if (usage && Number.isSafeInteger(usage.prompt_tokens) && usage.prompt_tokens >= 0 && Number.isSafeInteger(usage.completion_tokens) && usage.completion_tokens >= 0 && usage.prompt_tokens <= rate.contextTokens && usage.completion_tokens <= Number(payload.max_tokens)) {
                    let inputCost = (BigInt(usage.prompt_tokens) * BigInt(rate.inputNanoPerMillion) + 999999n) / 1000000n;
                    const hit = usage.prompt_cache_hit_tokens, miss = usage.prompt_cache_miss_tokens;
                    if (rate.cacheHitNanoPerMillion && Number.isSafeInteger(hit) && Number.isSafeInteger(miss) && hit >= 0 && miss >= 0 && hit + miss === usage.prompt_tokens)
                        inputCost = (BigInt(hit) * BigInt(rate.cacheHitNanoPerMillion) + BigInt(miss) * BigInt(rate.inputNanoPerMillion) + 999999n) / 1000000n;
                    const cost = inputCost + (BigInt(usage.completion_tokens) * BigInt(rate.outputNanoPerMillion) + 999999n) / 1000000n + BigInt(rate.fixedNano ?? '0');
                    this.budget.settle(input.requestId, String(cost));
                    return {
                        requestId: input.requestId, response, state: 'settled'
                    };
                }
            }
            return {
                requestId: input.requestId, response, state: 'unknown'
            };
        }
        catch (e) {
            this.budget.markUnknown(input.requestId);
            throw e;
        }
    }
}
