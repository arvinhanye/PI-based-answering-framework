import type {ExtensionAPI} from '@earendil-works/pi-coding-agent';
import {Type} from '@earendil-works/pi-ai';
import {createApp,type StudyApp} from '../../composition.js';
import {offlineStream,OFFLINE_MODEL,OFFLINE_PROVIDER} from './provider.js';
import {ControlledSession} from './session.js';
import {interceptInput} from './input.js';
import type {LearningFactory} from './ui.js';
import {studyMenu,exitStudy} from './navigation.js';
export function registerStudy(pi:ExtensionAPI,app:StudyApp,learningFactory?:LearningFactory){
 const controlled=new ControlledSession(pi);
 pi.registerProvider(OFFLINE_PROVIDER,{baseUrl:'http://offline.invalid',apiKey:'offline-no-credential',api:'openai-completions',streamSimple:offlineStream,models:[{id:OFFLINE_MODEL,name:'本地 quick（无网络）',reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:131072,maxTokens:1024}]});
 let menuOpen=false;
 const command=(name:string,description:string,run:(ctx:Parameters<typeof studyMenu>[2])=>Promise<unknown>)=>pi.registerCommand(name,{description,handler:async(_args,ctx)=>{
  if(menuOpen){ctx.ui.notify('学习菜单已经打开；Esc 返回上一级，主菜单可选择“退出学习”。','info');return;}
  menuOpen=true;try{await run(ctx);}catch(e){ctx.ui.notify(`学习操作失败：${e instanceof Error?e.message:String(e)}；/study 可重新打开菜单。`,'error');}finally{menuOpen=false;}
 }});
 command('study','打开学习主菜单；参数不作为答案或授权',ctx=>studyMenu(app,controlled,ctx,learningFactory));
 command('study-answer','打开答案输入与提交确认；命令参数不会提交',ctx=>studyMenu(app,controlled,ctx,learningFactory,true));
 command('study-exit','退出学习并返回 Pi 对话（需确认）',ctx=>exitStudy(controlled,ctx));
 pi.on('input',(_event,ctx)=>interceptInput(controlled.active,()=>ctx.ui.notify('答案尚未提交。输入 /study-answer 打开作答；/study 返回学习菜单；/study-exit 返回 Pi 对话。菜单内按 Esc 返回上一级。','info')));
 pi.on('model_select',(event,ctx)=>controlled.switched(event.model,ctx));
 pi.on('session_shutdown',async(event,ctx)=>{try{await controlled.exit(event.reason!=='quit');}catch(e){ctx.ui.notify(e instanceof Error?e.message:'原模型恢复失败','error');}finally{app.close();}});
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
