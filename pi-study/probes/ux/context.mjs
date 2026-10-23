import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAgentSession,DefaultResourceLoader,SessionManager,SettingsManager,ModelRuntime} from '@earendil-works/pi-coding-agent';
import {createAssistantMessageEventStream} from '@earendil-works/pi-ai';
const dir=mkdtempSync(join(tmpdir(),'pi-context-probe-'));
const captures=[];let api,current='q1';
const model={id:'capture',name:'capture',provider:'study-probe',api:'openai-completions',baseUrl:'http://offline.invalid',reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:131072,maxTokens:64};
const settings=SettingsManager.inMemory({compaction:{enabled:false},retry:{enabled:false},cacheWarming:{enabled:false}});
const loader=new DefaultResourceLoader({cwd:dir,agentDir:dir,settingsManager:settings,noExtensions:true,noSkills:true,noPromptTemplates:true,noThemes:true,noContextFiles:true,systemPrompt:'Local context experiment.',extensionFactories:[pi=>{
 api=pi;
 pi.registerProvider('study-probe',{baseUrl:model.baseUrl,apiKey:'nonsecret-local-probe',api:model.api,models:[model],streamSimple:(m,context)=>{captures.push(JSON.stringify(context));const stream=createAssistantMessageEventStream();const message={role:'assistant',content:[{type:'text',text:current==='q1'?'OLD_ANSWER':'NEW_ANSWER'}],api:m.api,provider:m.provider,model:m.id,usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:'stop',timestamp:Date.now()};stream.push({type:'done',reason:'stop',message});stream.end(message);return stream;}});
 pi.on('context',event=>{const index=event.messages.findLastIndex(m=>m.role==='custom'&&m.customType==='study-card'&&m.details?.question===current);return {messages:event.messages.slice(index+1).filter(m=>m.role==='user'||m.role==='assistant')};});
}]});
let session;
try{
 await loader.reload();const runtime=await ModelRuntime.create({authPath:join(dir,'auth.json'),modelsPath:join(dir,'models.json'),allowModelNetwork:false,refreshOnCreate:false});
 ({session}=await createAgentSession({cwd:dir,agentDir:dir,settingsManager:settings,modelRuntime:runtime,resourceLoader:loader,model,tools:[],thinkingLevel:'off',sessionManager:SessionManager.inMemory(dir)}));
 await session.bindExtensions({});
 api.sendMessage({customType:'study-card',content:'CARD_ONE',display:true,details:{question:'q1'}});
 await session.prompt('OLD_QUESTION');await session.prompt('FOLLOWUP_ONE');
 current='q2';api.sendMessage({customType:'study-card',content:'CARD_TWO',display:true,details:{question:'q2'}});await session.prompt('NEW_QUESTION');
 const transcript=JSON.stringify(session.state.messages);
 const result={requests:captures.length,firstContainsCurrent:captures[0]?.includes('OLD_QUESTION'),followupContainsPrevious:captures[1]?.includes('OLD_QUESTION')&&captures[1]?.includes('OLD_ANSWER'),lastContainsOld:captures[2]?.includes('OLD_QUESTION')||captures[2]?.includes('OLD_ANSWER'),lastContainsCurrent:captures[2]?.includes('NEW_QUESTION'),cardsSent:captures.some(x=>x.includes('CARD_')),oldPreservedOnScreen:transcript.includes('OLD_QUESTION')&&transcript.includes('OLD_ANSWER')};
 console.log(JSON.stringify(result));if(result.requests!==3||!result.firstContainsCurrent||!result.followupContainsPrevious||result.lastContainsOld||!result.lastContainsCurrent||result.cardsSent||!result.oldPreservedOnScreen)process.exitCode=1;
}finally{session?.dispose();rmSync(dir,{recursive:true,force:true});}
