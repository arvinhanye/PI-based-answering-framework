/** Read-only installed SDK probe. Fake key + injected refusing fetch; never calls network. */
import { pathToFileURL } from 'node:url';
export async function probeProvider(root = '/usr/local/lib/node_modules/@earendil-works/pi-coding-agent') {
    const path = root + '/node_modules/@earendil-works/pi-ai/dist/api/openai-completions.js';
    const sdk = await import(pathToFileURL(path).href);
    let calls = 0, final: any;
    const model = {
        id: 'deepseek-flash', name: 'probe', api: 'openai-completions', provider: 'deepseek', baseUrl: 'https://api.deepseek.com', reasoning: false, input: ['text'], cost: {
            input: 2, output: 8, cacheRead: 0, cacheWrite: 0
        }, contextWindow: 1000000, maxTokens: 384000
    };
    const run = async () => { const stream = sdk.stream(model, {
        messages: [{
                role: 'user', content: [{
                        type: 'text', text: 'probe'
                    }], timestamp: 0
            }]
    }, {
        apiKey: 'probe-not-a-secret', maxTokens: 1024, maxRetries: 0, onPayload: (p: any) => ({
            ...p, max_tokens: 777
        }), fetch: async (_u: any, init: any) => { calls++; final = JSON.parse(init.body); throw new Error('PROBE_REFUSED_BEFORE_NETWORK'); }
    }); return stream.result(); };
    const a = await run(), b = await run();
    return {
        calls, hookFinalMaxTokens: final.max_tokens, model: final.model, firstStopReason: a.stopReason, secondStopReason: b.stopReason, networkSends: 0
    };
}
