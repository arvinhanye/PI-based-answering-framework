import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
type RateCard = unknown;
interface PaidRequest {requestId:string;endpoint:string;payload:Record<string,unknown>;rate?:RateCard;signal?:AbortSignal;}
import { validateTargetUrl, acceptsSource, type SourcePolicy } from './policy.js';
import { unavailablePageReason } from './availability.js';
export interface VerifyInput {
    questionRevisionId: string;
    submissionId?: string;
    intent: string;
    sourcePolicyId: string;
    query: string;
    targetUrl?: string;
    action: {
        source: string;
        confirmed: boolean;
    };
}
export interface EvidenceSource {
    url: string;
    title: string;
    text: string;
    retrievedAt: string;
    hash: string;
    position: string;
    version: string;
}
export interface EvidenceJobView {
    id: string;
    questionRevisionId: string;
    submissionId?: string;
    intent: string;
    sourcePolicyId: string;
    state: 'running' | 'complete' | 'incomplete' | 'cancelled';
    sources: EvidenceSource[];
    regrades: false;
    unavailableSources?: Array<EvidenceSource & {
        reason: string;
    }>;
    qualityNotice?: string;
    error?: string;
}
export interface EvidenceGateway {
    execute(i: PaidRequest): Promise<{
        response: Response;
    }>;
}
export class EvidenceService {
    private jobs = new Map<string, EvidenceJobView>();
    private aborts = new Map<string, AbortController>();
    constructor(private gateway: EvidenceGateway, private options: {
        directory?: string;
        rate?: RateCard;
        rates?: {
            search: RateCard;
            fetch: RateCard;
        };
        policies?: SourcePolicy[];
        timeoutMs?: number;
    } = {}) { }
    private save(job: EvidenceJobView) {
        this.jobs.set(job.id, structuredClone(job));
        if (this.options.directory) {
            mkdirSync(this.options.directory, {
                recursive: true
            });
            writeFileSync(join(this.options.directory, job.id + '.json'), JSON.stringify(job), {
                mode: 0o600
            });
        }
    }
    inspect(id: string) {
        if (!/^[a-f0-9-]{36}$/.test(id))
            throw new Error('invalid job id');
        let j = this.jobs.get(id);
        if (!j && this.options.directory && existsSync(join(this.options.directory, id + '.json')))
            j = JSON.parse(readFileSync(join(this.options.directory, id + '.json'), 'utf8'));
        if (!j)
            throw new Error('evidence job not found');
        return structuredClone(j);
    }
    read(id: string) { return this.inspect(id); }
    cancel(id: string) {
        this.aborts.get(id)?.abort();
        const j = this.inspect(id);
        if (j.state === 'running') {
            j.state = 'cancelled';
            this.save(j);
        }
        return j;
    }
    start(i: VerifyInput) {
        let id = '';
        const result = this.verify(i, j => { id = j.id; });
        return {
            id, result
        };
    }
    async verify(i: VerifyInput, onStarted?: (job: EvidenceJobView) => void): Promise<EvidenceJobView> {
        if (!i.action || !['cli', 'interactive-menu'].includes(i.action.source) || i.action.confirmed !== true)
            throw new Error('explicit trusted user action required');
        if (!i.questionRevisionId || !i.sourcePolicyId || !i.query.trim() || [...i.query].length > 128)
            throw new Error('invalid evidence input');
        const policy = this.options.policies?.find(p => p.id === i.sourcePolicyId);
        if (this.options.policies && !policy)
            throw new Error('unknown source policy');
        if (i.targetUrl)
            validateTargetUrl(i.targetUrl);
        const id = randomUUID(), ac = new AbortController();
        this.aborts.set(id, ac);
        const timer = setTimeout(() => ac.abort(new Error('evidence timeout')), this.options.timeoutMs ?? 30000);
        const j: EvidenceJobView = {
            id, questionRevisionId: i.questionRevisionId, submissionId: i.submissionId, intent: i.intent, sourcePolicyId: i.sourcePolicyId, state: 'running', sources: [], regrades: false, qualityNotice: '仅完成网页获取；域名符合来源策略不代表内容权威、相关或足以支撑结论，需核对原文。'
        };
        this.save(j);
        onStarted?.(structuredClone(j));
        const withAbort = <T>(operation: Promise<T>): Promise<T> => {
            if (ac.signal.aborted)
                return Promise.reject(ac.signal.reason ?? new Error('cancelled'));
            let listener: () => void;
            return Promise.race([operation, new Promise<never>((_, reject) => {
                    listener = () => reject(ac.signal.reason ?? new Error('cancelled'));
                    ac.signal.addEventListener('abort', listener, {
                        once: true
                    });
                })]).finally(() => ac.signal.removeEventListener('abort', listener!));
        };
        const call = async (kind: 'search' | 'fetch', payload: Record<string, unknown>) => withAbort((async () => {
            const result = await this.gateway.execute({
                requestId: randomUUID(), endpoint: 'https://api.deepseek.com/v1/tools/' + kind, payload, rate: this.options.rates?.[kind] ?? this.options.rate, signal: ac.signal
            });
            if (!result.response.ok)
                throw new Error('evidence provider HTTP ' + result.response.status);
            return result.response.json() as Promise<any>;
        })());
        try {
            let target = i.targetUrl;
            if (!target) {
                const data = await call('search', {
                    query: i.query, count: 5, need_content: false
                });
                const first = Array.isArray(data.results) ? data.results.find((r: any) => {
                    try {
                        return typeof r.url === 'string' && acceptsSource(r.url, policy);
                    }
                    catch {
                        return false;
                    }
                }) : undefined;
                target = first?.url;
            }
            if (target) {
                target = validateTargetUrl(target);
                if (!acceptsSource(target, policy))
                    throw new Error('source outside policy');
                const page = await call('fetch', {
                    url: target
                });
                if (typeof page.content !== 'string' || !page.content.trim())
                    throw new Error('source has no original content');
                const source: EvidenceSource = {
                    url: target, title: typeof page.title === 'string' ? page.title : '', text: page.content, retrievedAt: new Date().toISOString(), hash: createHash('sha256').update(page.content).digest('hex'), position: 'provider-content:0-' + page.content.length, version: policy?.version ?? 'manual-v1'
                };
                const unavailableReason = unavailablePageReason(source.title, source.text);
                if (unavailableReason) {
                    j.unavailableSources = [{
                            ...source, reason: unavailableReason
                        }];
                    j.state = 'incomplete';
                    j.error = 'Fetched source unavailable: ' + target + ' (' + unavailableReason + ')';
                }
                else {
                    j.sources.push(source);
                    j.state = 'complete';
                }
            }
            else {
                j.state = 'incomplete';
                j.error = 'No eligible source returned';
            }
        }
        catch (e) {
            j.state = ac.signal.aborted ? 'cancelled' : 'incomplete';
            j.error = e instanceof Error ? e.message : 'evidence failed';
        }
        finally {
            clearTimeout(timer);
            this.aborts.delete(id);
            this.save(j);
        }
        return structuredClone(j);
    }
}
