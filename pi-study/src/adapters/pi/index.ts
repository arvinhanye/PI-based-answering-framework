import type {ExtensionAPI} from '@earendil-works/pi-coding-agent';
import {Type} from '@earendil-works/pi-ai';
import {createApp,type StudyApp} from '../../composition.js';
import {offlineStream,OFFLINE_MODEL,OFFLINE_PROVIDER} from './provider.js';
import {ControlledSession} from './session.js';
import {interceptInput} from './input.js';
import {studyMenu,type LearningFactory} from './ui.js';
export function registerStudy(pi:ExtensionAPI,app:StudyApp,learningFactory?:LearningFactory){
 const controlled=new ControlledSession(pi);
 pi.registerProvider(OFFLINE_PROVIDER,{baseUrl:'http://offline.invalid',apiKey:'offline-no-credential',api:'openai-completions',streamSimple:offlineStream,models:[{id:OFFLINE_MODEL,name:'本地 quick（无网络）',reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:131072,maxTokens:1024}]});
 pi.registerCommand('study',{description:'本地学习菜单；参数不作为答案或授权',handler:async(_args,ctx)=>{try{await studyMenu(app,controlled,ctx,learningFactory);}catch(e){ctx.ui.notify(`学习操作失败：${e instanceof Error?e.message:String(e)}`,'error');}}});
 pi.on('input',(_event,ctx)=>interceptInput(controlled.active,()=>ctx.ui.notify('学习态只接受 /study 可验证菜单；此文本未提交、未发送模型。','info')));
 pi.on('model_select',(event,ctx)=>controlled.switched(event.model,ctx));
 pi.on('session_shutdown',async(_event,ctx)=>{try{await controlled.exit();}catch(e){ctx.ui.notify(e instanceof Error?e.message:'原模型恢复失败','error');}finally{app.close();}});
 const queries:Record<string,()=>Promise<unknown>|unknown>={
  study_banks:()=>app.banks.list(),study_session:()=>{const id=app.getSetting('activeSession');return id?app.study.listSessions().then(s=>s.find(x=>x.id===id)??null):null;},
  study_question:async()=>{const id=app.getSetting('activeSession');if(!id)return null;const q=(await app.study.inspect(id)).question;return q?{presentationId:q.presentationId,questionRevisionId:q.questionRevisionId,kind:q.kind,stem:q.stem,options:q.options,topics:q.topics}:null;},
  study_feedback:async()=>{const id=app.getSetting('activeSession');if(!id)return null;const q=(await app.study.inspect(id)).question;return q?app.study.feedback(q.presentationId):null;},
  study_stats:()=>{const bankId=app.getSetting('activeBank');return bankId?app.stats.read({bankId,timezone:app.getSetting('timezone')}):null;},study_budget:()=>app.budget.snapshot(),
  study_pending:()=>{const bankId=app.getSetting('activeBank');if(!bankId)return [];return app.store.db.prepare('SELECT q.id,r.payload FROM questions q JOIN revisions r ON r.id=q.current_revision_id WHERE q.bank_id=?').all(bankId).flatMap(r=>{const q=JSON.parse(String(r.payload));return q.status==='needs_review'?[{questionId:r.id,status:q.status,issueCount:Array.isArray(q.issues)?q.issues.length:0}]:[];});}
 };
 for(const [name,read] of Object.entries(queries))pi.registerTool({name,label:name,description:'只读本地学习查询；不提交、揭晓、改额或推进题目',parameters:Type.Object({}),async execute(){try{const value=await read();return {content:[{type:'text',text:JSON.stringify(value)}],details:{}};}catch(e){return {content:[{type:'text',text:`不可读取：${e instanceof Error?e.message:String(e)}`}],details:{}};}}});
 return controlled;
}
export default function(pi:ExtensionAPI){registerStudy(pi,createApp());}
