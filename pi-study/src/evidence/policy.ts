import { isIP } from 'node:net';
export function validateTargetUrl(value: string): string {
    if (value.length > 8192)
        throw new Error('URL too long');
    const u = new URL(value);
    const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password || !h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || !h.includes('.'))
        throw new Error('invalid/public target URL required');
    if (isIP(h) === 6 || h.includes(':'))
        throw new Error('literal IPv6 targets unsupported');
    if (isIP(h) === 4) {
        const [a, b] = h.split('.').map(Number);
        if (a === 0 || a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b! >= 16 && b! <= 31 || a === 192 && b === 168 || a! >= 224)
            throw new Error('local target rejected');
    }
    return u.href;
}
export interface SourcePolicy {
    id: string;
    allowedDomains?: string[];
    version: string;
}
export function acceptsSource(url: string, p?: SourcePolicy) { const u = new URL(validateTargetUrl(url)); return !p?.allowedDomains?.length || p.allowedDomains.some(d => u.hostname === d || u.hostname.endsWith('.' + d)); }
