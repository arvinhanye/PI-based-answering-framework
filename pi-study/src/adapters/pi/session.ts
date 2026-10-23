import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent';
import type { Model, Api } from '@earendil-works/pi-ai';
export const PROVIDER = 'deepseek', MODEL = 'deepseek-flash';
export class ControlledSession {
    active = false;
    ready = false;
    private tools: string[] = [];
    private model: Model<Api> | undefined;
    private thinking: ReturnType<ExtensionAPI['getThinkingLevel']> = 'off';
    private changing = false;
    constructor(private pi: ExtensionAPI) { }
    async connect(ctx: ExtensionContext) {
        const model = ctx.modelRegistry.find(PROVIDER, MODEL);
        let credential = false;
        try {
            credential = !!await ctx.modelRegistry.getApiKeyForProvider(PROVIDER);
        }
        catch { /* Offline practice remains available. */ }
        if (!model || !credential)
            return this.ready = false;
        this.changing = true;
        try {
            return this.ready = await this.pi.setModel(model);
        }
        finally {
            this.changing = false;
        }
    }
    async enter(ctx: ExtensionContext) { if (this.active)
        return; this.tools = this.pi.getActiveTools(); this.model = ctx.model; this.thinking = this.pi.getThinkingLevel(); await this.connect(ctx); this.pi.setActiveTools([]); this.pi.setThinkingLevel('off'); this.active = true; }
    async exit(restoreModel = true) { if (!this.active)
        return true; let restored = true; this.changing = true; try {
        if (restoreModel && this.model)
            restored = await this.pi.setModel(this.model);
    }
    catch {
        restored = false;
    }
    finally {
        this.pi.setActiveTools(this.tools);
        this.pi.setThinkingLevel(this.thinking);
        this.active = false;
        this.ready = false;
        this.changing = false;
    } return restored; }
    async switched(model: Model<Api>) { if (this.active && !this.changing && (model.provider !== PROVIDER || model.id !== MODEL)) {
        await this.exit(false);
        return true;
    } return false; }
}
