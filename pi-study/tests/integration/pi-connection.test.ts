import {afterEach,expect,it,vi} from 'vitest';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {ExtensionContext} from '@earendil-works/pi-coding-agent';
import {createApp} from '../../src/composition.js';
import {reviewedDeepSeekProfiles} from '../../src/budget/profiles.js';
import {showConnectionStatus} from '../../src/adapters/pi/connection.js';

const cleanup:Array<()=>void>=[];
afterEach(()=>{for(const close of cleanup.splice(0))close();vi.restoreAllMocks();vi.useRealTimers();});
function setup(resolveKey:()=>Promise<string|undefined>=async()=> 'nonsecret-test-key'){
 const dir=mkdtempSync(join(tmpdir(),'pi-connection-'));
 const app=createApp({home:dir,dataDir:join(dir,'data')});
 cleanup.push(()=>{app.close();rmSync(dir,{recursive:true,force:true});});
 const profiles=reviewedDeepSeekProfiles();
 for(const profile of Object.values(profiles)){profile.checkedAt='2026-10-23T00:00:00.000Z';profile.validUntil='2026-10-24T00:00:00.000Z';}
 app.setSetting('reviewedRates',JSON.stringify(profiles));
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-23T12:00:00.000Z'));
 const messages:string[]=[],providers:string[]=[];
 const ctx={mode:'tui',hasUI:true,model:{provider:'study-offline',id:'local-quick'},ui:{notify:(message:string)=>messages.push(message)},modelRegistry:{getApiKeyForProvider:async(provider:string)=>{providers.push(provider);return resolveKey();}}} as unknown as ExtensionContext;
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Status must not contact providers'));
 return {app,ctx,profiles,messages,providers,network};
}

it('reports configured credentials and real stored rate validity without claiming a live connection or charging',async()=>{
 const h=setup();await showConnectionStatus(h.app,h.ctx);const text=h.messages.join('\n');
 expect(h.providers).toEqual(['deepseek']);expect(text).toContain('local-quick');expect(text).toContain('已配置');
 expect(text).toContain('deepseek-flash');expect(text).toContain('2026-10-24');expect(text).toContain('未进行实时连接测试');
 expect(text).toContain('提交');expect(text).toContain('揭晓');expect(text).toContain('确认');expect(text).not.toContain('已连接');
 expect(text).not.toContain('nonsecret-test-key');expect(h.network).not.toHaveBeenCalled();expect(existsSync(h.app.financePath)).toBe(false);
});
it('distinguishes missing credentials from an offline learning host',async()=>{
 const h=setup(async()=>undefined);await showConnectionStatus(h.app,h.ctx);const text=h.messages.join('\n');
 expect(text).toContain('未找到');expect(text).toContain('本地刷题');expect(text).not.toContain('已配置');expect(text).not.toContain('已连接');
 expect(h.network).not.toHaveBeenCalled();expect(existsSync(h.app.financePath)).toBe(false);
});
it('sanitizes credential resolution failures without misreporting a provider connection result',async()=>{
 const h=setup(async()=>{throw new Error('Bearer PRIVATE_TEST_SECRET auth command details');});await showConnectionStatus(h.app,h.ctx);const text=h.messages.join('\n');
 expect(text).toContain('读取失败');expect(text).not.toContain('PRIVATE_TEST_SECRET');expect(text).not.toContain('auth command');expect(text).not.toContain('已连接');
 expect(h.network).not.toHaveBeenCalled();
});
it('uses real profile validation to report expired pricing while keeping local learning available',async()=>{
 const h=setup();vi.setSystemTime(new Date('2026-10-24T00:00:00.000Z'));await showConnectionStatus(h.app,h.ctx);const text=h.messages.join('\n');
 expect(text).toContain('费率已过期');expect(text).toContain('暂不可用');expect(text).toContain('本地刷题');
 expect(h.network).not.toHaveBeenCalled();expect(existsSync(h.app.financePath)).toBe(false);
});
it('does not echo malformed saved configuration as a usable rate or raw error',async()=>{
 const h=setup();h.app.setSetting('reviewedRates','PRIVATE_CONFIG_TEXT invalid JSON');await showConnectionStatus(h.app,h.ctx);const text=h.messages.join('\n');
 expect(text).toContain('费率配置无效');expect(text).toContain('暂不可用');expect(text).not.toContain('PRIVATE_CONFIG_TEXT');
 expect(h.network).not.toHaveBeenCalled();
});
it('rejects non-TUI credential inspection before resolving any provider credential',async()=>{
 const h=setup();await showConnectionStatus(h.app,{...h.ctx,mode:'rpc'});expect(h.providers).toEqual([]);expect(h.messages.join('\n')).toContain('TUI');
 expect(h.network).not.toHaveBeenCalled();expect(existsSync(h.app.financePath)).toBe(false);
});
