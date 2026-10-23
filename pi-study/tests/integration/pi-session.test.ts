import {it,expect} from 'vitest';
import { interceptInput, isTrustedMenu } from '../../src/adapters/pi/input.js';
import { offlineStream } from '../../src/adapters/pi/provider.js';
it('interactive_input_intercepted_before_model',async()=>expect(await interceptInput(true,()=>{})).toEqual({action:'handled'}));
it('rpc_extension_do_not_submit',()=>{expect(isTrustedMenu({mode:'rpc',hasUI:true})).toBe(false);expect(isTrustedMenu({mode:'tui',hasUI:true})).toBe(true);});
it('transformed_ambiguous_input_rejected',async()=>{for(const source of ['interactive','extension','rpc'])expect(await interceptInput(true,()=>{},source)).toEqual({action:'handled'});});
it('handler_error_returns_handled',async()=>expect(await interceptInput(true,()=>{throw Error('UI failed');})).toEqual({action:'handled'}));
it('offline provider finishes without fetch',async()=>{const result=await offlineStream({id:'local',provider:'study-offline',api:'openai-completions'} as any,{} as any).result();expect(result.stopReason).toBe('stop');expect(result.content).toEqual([{type:'text',text:expect.stringContaining('/study')}]);});
import {registerStudy} from '../../src/adapters/pi/index.js';
import {createApp} from '../../src/composition.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function harness(){const dir=mkdtempSync(join(tmpdir(),'pi-test-')),app=createApp({home:dir,dataDir:join(dir,'data')});const handlers:Record<string,any>={},tools:any[]=[],commands:Record<string,any>={};let current=['read','bash'];const old={provider:'old',id:'old'};const model={provider:'study-offline',id:'local-quick'};const pi={registerProvider(){},registerCommand(n:string,v:any){commands[n]=v;},on(n:string,v:any){handlers[n]=v;},registerTool(t:any){tools.push(t);},getActiveTools:()=>current.slice(),setActiveTools:(v:string[])=>{current=v;},setModel:async()=>true};const state=registerStudy(pi as any,app);const ui={notify(){},select:async()=>undefined,confirm:async()=>true};const ctx={mode:'tui',hasUI:true,ui,model:old,modelRegistry:{find:()=>model}};return {app,state,handlers,tools,commands,ctx,pi,getTools:()=>current,close(){app.close();rmSync(dir,{recursive:true,force:true});}};}
it('extension_triggered_slash_cannot_score',async()=>{const h=harness();try{await h.commands.study.handler('submit A',{...h.ctx,mode:'rpc'});expect(h.state.active).toBe(false);expect(h.app.store.db.prepare('SELECT count(*) n FROM audit').get()?.n).toBe(0);await h.commands.study.handler('submit A',h.ctx);expect(h.state.active).toBe(false);expect(h.app.store.db.prepare('SELECT count(*) n FROM audit').get()?.n).toBe(0);}finally{h.close();}});
it('tools_exclude_privileged_writes',()=>{const h=harness();try{expect(h.tools.map(t=>t.name).sort()).toEqual(['study_banks','study_budget','study_feedback','study_pending','study_question','study_session','study_stats']);for(const t of h.tools)expect(t.parameters.type).toBe('object');}finally{h.close();}});
it('restores tools when external model chosen',async()=>{const h=harness();try{await h.state.enter(h.ctx as any);expect(h.getTools()).toEqual([]);await h.handlers.model_select({model:{provider:'external',id:'paid'}},h.ctx);expect(h.state.active).toBe(false);expect(h.getTools()).toEqual(['read','bash']);}finally{h.close();}});
it('refuses controlled state if setModel returns false',async()=>{const h=harness();try{h.pi.setModel=async()=>false;await expect(h.state.enter(h.ctx as any)).rejects.toThrow('无法切换');expect(h.state.active).toBe(false);expect(h.getTools()).toEqual(['read','bash']);}finally{h.close();}});
import {studyAction,type LearningFactory} from '../../src/adapters/pi/ui.js';
async function runSelectedAction(app:any,session:any,ctx:any,factory?:LearningFactory){return studyAction(app,session,ctx,await ctx.ui.select(),factory);}
async function seedNavigation(h:ReturnType<typeof harness>){
 const imported=await h.app.banks.importBank({schemaVersion:1,source:{id:'nav',name:'Navigation',sha256:'nav-fixture'},report:{candidateCount:1,ready:1,needsReview:0,gaps:[]},questions:[{sourceKey:'1',kind:'single',stem:'Choose one',options:[{id:'A',text:'one'},{id:'B',text:'two'}],answer:['A'],rawAnswer:'A',explanation:'Local explanation',topics:[],status:'ready',basisStatus:'source_only',issues:[],locations:[],assets:[]}]});
 h.app.setSetting('activeBank',imported.bankId);
 const session=await h.app.study.start({bankId:imported.bankId});h.app.setSetting('activeSession',session.id);await h.app.study.next(session.id);
}
it.each(['input','confidence','confirmation'])('quick answer cancellation at %s returns to question page without grading',async(cancelAt)=>{
 const h=harness();try{await seedNavigation(h);const choices:Array<string|undefined>=['继续刷题','提交答案',...(cancelAt==='input'?[]:[cancelAt==='confidence'?undefined:'确定']),'返回主菜单','退出学习'];let questionPages=0;
 h.ctx.ui={notify(){},select:async(title:string,options:string[])=>{if(title.includes('当前题目'))questionPages++;const choice=choices.shift();if(choice!==undefined)expect(options).toContain(choice);return choice;},input:async()=>cancelAt==='input'?undefined:'A',confirm:async(title:string)=>title.includes('退出学习')} as any;
 await h.commands.study.handler('',h.ctx);
 expect(choices).toEqual([]);expect(questionPages).toBe(2);expect(h.state.active).toBe(false);expect(h.app.store.db.prepare('SELECT count(*) n FROM submissions').get()?.n).toBe(0);
 }finally{h.close();}
});
it('confirmed answer is graded once and Esc navigates from question to main menu',async()=>{
 const h=harness();try{await seedNavigation(h);const choices:Array<string|undefined>=['继续刷题','提交答案','确定',undefined,'退出学习'];let confirmations=0;
 h.ctx.ui={notify(){},select:async(_title:string,options:string[])=>{if(confirmations===1&&options.includes('下一题')){expect(options[0]).toBe('下一题');expect(options).not.toContain('提交答案');}const choice=choices.shift();if(choice!==undefined)expect(options).toContain(choice);return choice;},input:async()=> 'A',confirm:async()=>{confirmations++;return true;}} as any;
 await h.commands.study.handler('',h.ctx);expect(choices).toEqual([]);expect(confirmations).toBe(2);expect(h.state.active).toBe(false);
 const rows=h.app.store.db.prepare('SELECT receipt FROM submissions').all();expect(rows).toHaveLength(1);expect(JSON.parse(String(rows[0]!.receipt)).grade.correct).toBe(true);
 }finally{h.close();}
});
it.each(['题库与会话','解析与查证','预算'])('Esc from %s returns to main without ending the session or making changes',async(group)=>{
 const h=harness();try{await seedNavigation(h);const choices:Array<string|undefined>=[group,undefined,'退出学习'];let page=0;
 h.ctx.ui={notify(){},select:async(_title:string,options:string[])=>{if(page++===2)expect(h.state.active).toBe(true);const choice=choices.shift();if(choice)expect(options).toContain(choice);return choice;},confirm:async()=>true} as any;
 await h.commands.study.handler('',h.ctx);expect(choices).toEqual([]);expect(h.state.active).toBe(false);expect(h.app.store.db.prepare('SELECT count(*) n FROM audit').get()?.n).toBe(0);
 }finally{h.close();}
});
it('answer shortcut ignores command arguments and RPC cannot open a submission dialog',async()=>{
 const h=harness();try{await seedNavigation(h);const choices=['返回主菜单','退出学习'];let inputs=0;
 h.ctx.ui={notify(){},select:async()=>choices.shift(),input:async(_title:string,placeholder?:string)=>{inputs++;expect(placeholder).toBeUndefined();return undefined;},confirm:async()=>true} as any;
 await h.commands['study-answer'].handler('A',{...h.ctx,mode:'rpc'});expect(inputs).toBe(0);
 await h.commands['study-answer'].handler('A',h.ctx);expect(inputs).toBe(1);expect(choices).toEqual([]);expect(h.app.store.db.prepare('SELECT count(*) n FROM submissions').get()?.n).toBe(0);
 }finally{h.close();}
});
it('exit shortcut requires TUI confirmation and never enters learning when inactive',async()=>{
 const h=harness();try{let confirms=0;let allow=false;h.ctx.ui={notify(){},select:async()=>undefined,confirm:async()=>{confirms++;return allow;}};
 await h.commands['study-exit'].handler('yes',h.ctx);expect(confirms).toBe(0);expect(h.state.active).toBe(false);
 await h.state.enter(h.ctx as any);await h.commands['study-exit'].handler('yes',{...h.ctx,mode:'rpc'});expect(confirms).toBe(0);expect(h.state.active).toBe(true);
 await h.commands['study-exit'].handler('yes',h.ctx);expect(confirms).toBe(1);expect(h.state.active).toBe(true);
 allow=true;await h.commands['study-exit'].handler('',h.ctx);expect(h.state.active).toBe(false);expect(h.getTools()).toEqual(['read','bash']);
 }finally{h.close();}
});
it('failed model restoration still allows closing the menu while keeping inputs and tools protected',async()=>{
 const h=harness();try{await h.state.enter(h.ctx as any);h.pi.setModel=async()=>false;const choices=['退出学习','收起菜单（仍在学习态）'];const messages:string[]=[];
 h.ctx.ui={notify:(s:string)=>messages.push(s),select:async()=>choices.shift(),confirm:async()=>true} as any;await h.commands.study.handler('',h.ctx);
 expect(choices).toEqual([]);expect(h.state.active).toBe(true);expect(h.getTools()).toEqual([]);expect(messages.join('\n')).toContain('原模型恢复失败');expect(messages.join('\n')).toContain('/quit');
 expect(await h.handlers.input({text:'A',source:'interactive'},h.ctx)).toEqual({action:'handled'});
 }finally{h.close();}
});
it('quit releases local resources without attempting model authentication again',async()=>{
 const h=harness();const originalClose=h.app.close.bind(h.app);let closed=false,modelCalls=0;
 try{await h.state.enter(h.ctx as any);h.pi.setModel=async()=>{modelCalls++;return false;};h.app.close=()=>{closed=true;};
 await h.handlers.session_shutdown({reason:'quit'},h.ctx);expect(closed).toBe(true);expect(modelCalls).toBe(0);expect(h.state.active).toBe(false);
 }finally{h.app.close=originalClose;h.close();}
});
it('an exhausted session offers navigation instead of another answer submission',async()=>{
 const h=harness();try{await seedNavigation(h);const sid=h.app.getSetting('activeSession')!;await h.app.study.skip(sid,{origin:'cli',eventId:'finish-fixture'},(await h.app.study.inspect(sid)).question!.presentationId);await h.app.study.next(sid);
 const choices=['继续刷题','返回主菜单','退出学习'];h.ctx.ui={notify(){},select:async(title:string,options:string[])=>{if(title.includes('暂无题目'))expect(options).not.toContain('提交答案');const choice=choices.shift();if(choice)expect(options).toContain(choice);return choice;},confirm:async()=>true} as any;
 await h.commands.study.handler('',h.ctx);expect(choices).toEqual([]);expect(h.state.active).toBe(false);
 }finally{h.close();}
});
it('paid explanation checks feedback before credentials and requires explicit menu confirmation',async()=>{
 const order:string[]=[];let locked=true;let confirm=true;
 const app={getSetting:()=> 'session',study:{inspect:async()=>({question:{presentationId:'original-pid'}}),feedback:async()=>{order.push('feedback');if(locked)throw Error('locked');return {};}}};
 const ctx={mode:'tui',hasUI:true,ui:{select:async()=> '受控 AI 讲解',notify(){},confirm:async()=>confirm},modelRegistry:{getApiKeyForProvider:async()=>{order.push('auth');return 'test-nonsecret';}}};
 const factory=async()=>({explain:async(pid:string)=>{expect(pid).toBe('original-pid');order.push('gateway');return {text:'bounded'};},verify:async()=>({})});
 const session={enter:async()=>{}};
 await expect(runSelectedAction(app as any,session as any,ctx as any,factory)).rejects.toThrow('locked');expect(order).toEqual(['feedback']);
 locked=false;confirm=false;order.length=0;await runSelectedAction(app as any,session as any,ctx as any,factory);expect(order).toEqual(['feedback']);
 confirm=true;order.length=0;await runSelectedAction(app as any,session as any,ctx as any,factory);expect(order).toEqual(['feedback','auth','gateway']);
});
it('manual verification cancellation never resolves credentials',async()=>{
 let auth=false;const app={getSetting:()=> 's',study:{inspect:async()=>({question:{presentationId:'p'}}),feedback:async()=>({})}};
 const ctx={mode:'tui',hasUI:true,ui:{select:async()=> '手动资料查证',input:async()=>undefined},modelRegistry:{getApiKeyForProvider:async()=>{auth=true;return undefined;}}};
 await runSelectedAction(app as any,{enter:async()=>{}} as any,ctx as any,async()=>{throw Error('must not call');});expect(auth).toBe(false);
});
it('manual verification passes explicit query and original presentation only',async()=>{
 const calls:unknown[]=[];const app={getSetting:()=> 's',study:{inspect:async()=>({question:{presentationId:'p-original'}}),feedback:async()=>({})}};
 const ctx={mode:'tui',hasUI:true,ui:{select:async()=> '手动资料查证',input:async()=> '  official units  ',confirm:async()=>true,notify(){}},modelRegistry:{getApiKeyForProvider:async()=> 'fake-test-key'}};
 await runSelectedAction(app as any,{enter:async()=>{}} as any,ctx as any,async()=>({explain:async()=>{throw Error('wrong operation');},verify:async(...args)=>{calls.push(args);return {status:'complete'};}}));expect(calls[0]).toMatchObject(['p-original','official units',expect.any(AbortSignal)]);
});
it('missing credentials fail actionably before constructing paid service',async()=>{
 let built=false;const app={getSetting:()=> 's',study:{inspect:async()=>({question:{presentationId:'p'}}),feedback:async()=>({})}};
 const ctx={mode:'tui',hasUI:true,ui:{select:async()=> '受控 AI 讲解',confirm:async()=>true},modelRegistry:{getApiKeyForProvider:async()=>undefined}};
 await expect(runSelectedAction(app as any,{enter:async()=>{}} as any,ctx as any,async()=>{built=true;throw Error('must not construct');})).rejects.toThrow('本地学习仍可使用');expect(built).toBe(false);
});
import {parseAnswer} from '../../src/study/answer-input.js';
import {safeQuestionImages,formatQuestion} from '../../src/adapters/pi/ui.js';
import {mkdirSync,writeFileSync,symlinkSync,realpathSync} from 'node:fs';
it('Pi input parser accepts compact multiple, Chinese boolean and space-preserving fill',()=>{
 expect(parseAnswer('AC','multiple')).toEqual(['A','C']);expect(parseAnswer('正确','truefalse')).toEqual(['true']);expect(parseAnswer('错误','truefalse')).toEqual(['false']);expect(parseAnswer('hello world | second answer','fill')).toEqual(['hello world','second answer']);
});
it('question images include all safe cross-page crops but reject traversal and symlink escape',()=>{
 const dir=realpathSync(mkdtempSync(join(tmpdir(),'pi-image-')));try{mkdirSync(join(dir,'assets'));writeFileSync(join(dir,'assets','page1.png'),'x');writeFileSync(join(dir,'assets','page2.png'),'x');writeFileSync(join(dir,'secret.png'),'secret');symlinkSync(join(dir,'secret.png'),join(dir,'assets','escape.png'));
 const asset=(path:string,role:'question'|'source'='question')=>({path,role,mime:'image/png',sha256:'test'});
 const images=safeQuestionImages(dir,[asset('assets/page1.png'),asset('assets/page2.png'),asset('secret.png','source')]);expect(images.map(x=>x.path)).toEqual([join(dir,'assets/page1.png'),join(dir,'assets/page2.png')]);
 expect(()=>safeQuestionImages(dir,[asset('assets/../secret.png')])).toThrow('不安全');expect(()=>safeQuestionImages(dir,[asset('assets/escape.png')])).toThrow('不安全');
 const text=formatQuestion({dataDir:dir} as any,{sourceId:'source-a',sourceKey:'Q1',stem:'Question',options:[{id:'A',text:'one'}],locations:[{page:1},{page:2}],assets:[asset('assets/page1.png'),asset('assets/page2.png')]} as any);expect(text).toContain('source-a');expect(text).toContain('第 2 页');expect(text).toContain('A. one');expect(text).toContain(join(dir,'assets/page2.png'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
it('source quick selection forwards chosen source only',async()=>{
 const choices=['按来源开始 quick','2. second [source-b]'];let started:any;
 const app={getSetting:(k:string)=>k==='activeBank'?'bank':undefined,setSetting(){},banks:{listSources:async()=>[{id:'source-a',name:'first'},{id:'source-b',name:'second'}]},study:{start:async(x:unknown)=>{started=x;return {id:'new'};},next:async()=>null}};
 const ctx={mode:'tui',hasUI:true,ui:{select:async()=>choices.shift(),notify(){}}};await runSelectedAction(app as any,{enter:async()=>{}} as any,ctx as any);expect(started).toMatchObject({bankId:'bank',sourceId:'source-b',mode:'quick'});
});
it('verification cancel menu aborts active request and completion closes cancel dialog',async()=>{
 const {withVerificationCancel}=await import('../../src/adapters/pi/ui.js');
 let received:AbortSignal|undefined;
 const cancelled=await withVerificationCancel({ui:{select:async()=> '取消本次查证'}} as any,signal=>{received=signal;return new Promise(resolve=>signal.addEventListener('abort',()=>resolve('cancelled'),{once:true}));});
 expect(cancelled).toBe('cancelled');expect(received?.aborted).toBe(true);
 let dialogSignal:AbortSignal|undefined;
 const complete=await withVerificationCancel({ui:{select:(_t:any,_o:any,opts:any)=>{dialogSignal=opts.signal;return new Promise(resolve=>opts.signal.addEventListener('abort',()=>resolve(undefined),{once:true}));}}} as any,async()=> 'complete');
 expect(complete).toBe('complete');expect(dialogSignal?.aborted).toBe(true);
});
it('failed original model restore remains intercepted with tools disabled and reports failure',async()=>{
 const h=harness();try{await h.state.enter(h.ctx as any);h.pi.setModel=async()=>false;await expect(h.state.exit()).rejects.toThrow('原模型恢复失败');expect(h.state.active).toBe(true);expect(h.getTools()).toEqual([]);expect(await h.handlers.input({text:'A',source:'interactive'},h.ctx)).toEqual({action:'handled'});
 h.pi.setModel=async()=>true;await h.state.exit();expect(h.state.active).toBe(false);expect(h.getTools()).toEqual(['read','bash']);}finally{h.close();}
});
it('throwing original model restore keeps safe tools and shutdown closes app despite failure',async()=>{
 const h=harness();const originalClose=h.app.close.bind(h.app);let closed=false;const messages:string[]=[];try{await h.state.enter(h.ctx as any);h.pi.setModel=async()=>{throw Error('auth unavailable');};await expect(h.state.exit()).rejects.toThrow('原模型恢复失败');expect(h.state.active).toBe(true);expect(h.getTools()).toEqual([]);h.app.close=()=>{closed=true;};await h.handlers.session_shutdown({}, {...h.ctx,ui:{notify:(s:string)=>messages.push(s)}});expect(closed).toBe(true);expect(messages.join(' ')).toContain('原模型恢复失败');}finally{h.app.close=originalClose;h.close();}
});
it('exit menu reports confirmed restoration and never success on failed restore',async()=>{
 const messages:string[]=[];let reject=false;const ctx={mode:'tui',hasUI:true,ui:{select:async()=> '退出学习',notify:(text:string)=>messages.push(text)}};
 const session={enter:async()=>{},exit:async()=>{if(reject)throw Error('原模型恢复失败');}};
 await runSelectedAction({getSetting:()=>undefined} as any,session as any,ctx as any);expect(messages).toEqual(['已退出学习，已恢复原模型；后续普通聊天不受本包预算保护']);
 messages.length=0;reject=true;await expect(runSelectedAction({getSetting:()=>undefined} as any,session as any,ctx as any)).rejects.toThrow('原模型恢复失败');expect(messages).toEqual([]);
});
