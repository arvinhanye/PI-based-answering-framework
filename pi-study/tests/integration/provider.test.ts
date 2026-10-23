import { it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { probeProvider } from '../../probes/provider.js';
import { probeInput } from '../../probes/input.js';
const root = '/usr/local/lib/node_modules/@earendil-works/pi-coding-agent';
it.skipIf(!existsSync(root))('installed_sdk_final_fetch_has_hook_payload_and_no_hidden_retry', async () => { const r = await probeProvider(root); expect(r.calls).toBe(2); expect(r.hookFinalMaxTokens).toBe(777); expect(r.networkSends).toBe(0); });
it.skipIf(!existsSync(root))('installed_input_transform_and_throw_continues', async () => { const r = await probeInput(root); expect(r.seen).toEqual([{
        text: 'changed', source: 'interactive'
    }]); expect(r.transformed.action).toBe('handled'); expect(r.onThrow.action).toBe('continue'); });
