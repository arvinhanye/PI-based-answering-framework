import { randomUUID } from 'node:crypto';
import { PaidGateway } from './gateway.js';
import type { RateCard } from './pricing.js';
/** SDK custom fetch gate: never delegates an uncontrolled request, never retries. */
export function createBudgetFetch(gateway: PaidGateway, rate?: RateCard): typeof fetch {
    return (async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        if (request.method !== 'POST')
            throw new Error('paid transport requires POST');
        const text = await request.text();
        const payload = JSON.parse(text);
        if (!payload || typeof payload !== 'object' || Array.isArray(payload))
            throw new Error('invalid final payload');
        const result = await gateway.execute({
            requestId: randomUUID(), endpoint: request.url, payload, rate, signal: request.signal
        });
        return result.response;
    }) as typeof fetch;
}
