/** Read-only exact installed runner behavior; no TUI/system input simulated. */
import { pathToFileURL } from 'node:url';
export async function probeInput(root = '/usr/local/lib/node_modules/@earendil-works/pi-coding-agent') {
    const { ExtensionRunner } = await import(pathToFileURL(root + '/dist/core/extensions/runner.js').href);
    const proto = ExtensionRunner.prototype;
    const make = (handlers: any[]) => ({
        extensions: handlers.map((h, i) => ({
            path: 'probe-' + i, handlers: new Map([['input', [h]]])
        })), createContext: () => ({}), emitError: () => { }
    });
    const seen: any[] = [];
    const transformed = await proto.emitInput.call(make([(e: any) => ({
            action: 'transform', text: 'changed'
        }), (e: any) => { seen.push({
            text: e.text, source: e.source
        }); return {
            action: 'handled'
        }; }]), 'original', undefined, 'interactive');
    const onThrow = await proto.emitInput.call(make([() => { throw new Error('probe'); }]), 'x', undefined, 'rpc');
    return {
        transformed, seen, onThrow
    };
}
