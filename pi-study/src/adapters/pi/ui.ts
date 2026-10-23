import {realpathSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep,extname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {QuestionView,AssetInput,FeedbackView} from '../../contracts.js';
import {parseAnswer} from '../../study/answer-input.js';
import {randomUUID} from 'node:crypto';
import type {ExtensionContext} from '@earendil-works/pi-coding-agent';
import type {StudyApp} from '../../composition.js';
import type {ControlledSession} from './session.js';
import {isTrustedMenu} from './input.js';
export interface LearningClient {explain(presentationId:string,signal?:AbortSignal):Promise<unknown>;verify(presentationId:string,query:string,signal?:AbortSignal):Promise<unknown>;}
export type LearningFactory=(app:StudyApp,apiKey:string)=>LearningClient|Promise<LearningClient>;
export const defaultLearningFactory:LearningFactory=async(app,apiKey)=>{const {LearningService}=await import('../../learning.js');return new LearningService(app,apiKey);};
export function safeQuestionImages(dataDir:string,assets:AssetInput[]){
 const candidates=assets.filter(a=>a.role==='question'&&['image/png','image/jpeg','image/webp','image/gif'].includes(a.mime));if(!candidates.length)return [];
 const base=realpathSync(resolve(dataDir,'assets'));
 return candidates.map(a=>{
  const path=realpathSync(resolve(dataDir,a.path)),rel=relative(base,path);
  if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel)||!statSync(path).isFile()||!/^\.(png|jpe?g|webp|gif)$/i.test(extname(path)))throw Error('题图路径不安全');
  return {path,caption:a.caption??''};
 });
}
export function formatQuestion(app:StudyApp,q:QuestionView){
 let images:Array<{path:string;caption:string}>=[];let issue='';
 if(q.assets?.length)try{images=safeQuestionImages(app.dataDir,q.assets);}catch{issue='部分题图不可安全读取，请检查导入资源。';}
 return [`来源：${q.sourceId} / ${q.sourceKey}`,`位置：${(q.locations??[]).map(l=>l.page?`第 ${l.page} 页`:l.paragraph?`段落 ${l.paragraph}`:'').filter(Boolean).join('、')}`,q.stem,...q.options.map(o=>`${o.id}. ${o.text}`),...images.map((a,i)=>`题图 ${i+1}${a.caption?'（'+a.caption+'）':''}：${a.path}`),issue].filter(Boolean).join('\n');
}
export function formatFeedback(feedback:FeedbackView,assisted?:boolean){
 const grade=feedback.grade;
 return [grade?`参考判分：${grade.correct===true?'正确':grade.correct===false?'错误':'暂不计分'}${grade.score===null?'':`（${grade.score}/${grade.maxScore} 分）`}`:'题目已揭晓，未提交判分',grade?.reason,assisted===undefined?'':`作答方式：${assisted?'辅助作答':'独立作答'}`,`参考答案：${feedback.answer.join('、')||feedback.rawAnswer||'资料未提供'}`,`题库解析：${feedback.explanation||'资料未提供解析'}`,...feedback.issues.map(issue=>`资料提示：${issue}`)].filter(Boolean).join('\n');
}
/** Escape or explicit selection cancels; task completion aborts and closes the dialog. */
export async function withVerificationCancel<T>(ctx:ExtensionContext,operation:(signal:AbortSignal)=>Promise<T>,title='手动查证进行中（最长 30 秒）',cancelLabel='取消本次查证'):Promise<T>{
 const request=new AbortController(),dialog=new AbortController();let finished=false;
 const task=operation(request.signal).finally(()=>{finished=true;dialog.abort();});
 const choice=ctx.ui.select(title,[cancelLabel],{signal:dialog.signal}).then(()=>{if(!finished)request.abort(new Error('用户取消请求'));},()=>{if(!finished)request.abort(new Error('取消对话框关闭'));});
 try{return await task;}finally{finished=true;dialog.abort();await choice;}
}
const action=()=>({origin:'pi-menu' as const,eventId:randomUUID()});
export async function studyAction(app:StudyApp,session:ControlledSession,ctx:ExtensionContext,choice:string,learningFactory:LearningFactory=defaultLearningFactory){
 if(!isTrustedMenu(ctx)){ctx.ui.notify('仅真实 TUI 菜单可操作；RPC/print/JSON 请使用独立 CLI。','warning');return;}
 await session.enter(ctx);
 const sid=app.getSetting('activeSession'),bankId=app.getSetting('activeBank');
 const display=(x:unknown)=>ctx.ui.notify(typeof x==='string'?x:JSON.stringify(x,null,2),'info');
 if(choice==='退出学习'){await session.exit();ctx.ui.notify('已退出学习，已恢复原模型；后续普通聊天不受本包预算保护','info');return;}
 if(choice==='选择题库'){const banks=await app.banks.list();const selected=await ctx.ui.select('题库',banks.map(b=>`${b.id} ${b.name}`));if(selected)app.setSetting('activeBank',selected.split(' ')[0]!);return;}
 if(choice==='开始 quick'||choice==='按来源开始 quick'){
  if(!bankId)throw Error('请先选择题库');let sourceId:string|undefined;
  if(choice==='按来源开始 quick'){const sources=await app.banks.listSources(bankId);const labels=sources.map((x,i)=>`${i+1}. ${x.name} [${x.id}]`);const picked=await ctx.ui.select('选择来源',labels);if(!picked)return;sourceId=String(sources[labels.indexOf(picked)]!.id);}
  const started=await app.study.start({bankId,sourceId,mode:'quick',examDate:app.getSetting('examDate'),timezone:app.getSetting('timezone')});app.setSetting('activeSession',started.id);const q=await app.study.next(started.id);display(q?formatQuestion(app,q):'该来源没有可用题目');return true;
 }
 if(choice==='恢复会话'){const sessions=await app.study.listSessions(bankId);const picked=await ctx.ui.select('恢复',sessions.filter(s=>s.status==='active').map(s=>s.id));if(picked){app.setSetting('activeSession',picked);const snap=await app.study.resume(picked,action());display(snap.question?formatQuestion(app,snap.question):'会话已恢复，选择“下一题”开始');return true;}return false;}
 if(choice==='预算查看'){display(app.budget.snapshot());return;}
 if(choice==='预算设置'){const value=await ctx.ui.input('每月预算（元）');if(value!==undefined&&await ctx.ui.confirm('确认修改预算',`新上限：${value} 元`)){app.budget.setLimit(value,{source:'interactive-menu',confirmed:true});display(app.budget.snapshot());}return;}
 if(choice==='参考成绩'){if(!bankId)throw Error('请选择题库');display(await app.stats.read({bankId,timezone:app.getSetting('timezone')}));return;}
 if(!sid)throw Error('请先开始或恢复会话');
 if(choice==='下一题'){const next=await app.study.next(sid);display(next?formatQuestion(app,next):'本轮题目已完成');return;}
 const snap=await app.study.inspect(sid),q=snap.question;if(!q)throw Error('没有当前题目');
 if(choice==='受控 AI 讲解'||choice==='手动资料查证'){
  // Feedback visibility must pass before resolving credentials or making any paid call.
  await app.study.feedback(q.presentationId);
  let query:string|undefined;
  if(choice==='手动资料查证'){query=await ctx.ui.input('手动查证关键词（仅当前已提交/揭晓题目）');if(!query?.trim())return;}
  if(!await ctx.ui.confirm(choice,'仅文本、非流式受控网关；消耗本月预算。宿主继续使用离线模型。'))return;
  const key=await ctx.modelRegistry.getApiKeyForProvider('deepseek');
  if(!key)throw Error('Pi 未找到 DeepSeek API key；请在 Pi 配置 deepseek 凭证后重试，本地学习仍可使用');
  const learning=await learningFactory(app,key);
  try{display(choice==='受控 AI 讲解'?await withVerificationCancel(ctx,signal=>learning.explain(q.presentationId,signal),'DeepSeek 讲解进行中（最长 60 秒）','取消讲解并返回'):await withVerificationCancel(ctx,signal=>learning.verify(q.presentationId,query!.trim(),signal)));}
  catch(error){if(error instanceof Error&&error.message==='用户取消请求')display('已取消并返回。已发送但账单未确认的请求仍保留预算预占。');else throw error;}
  return;
 }
 if(choice==='当前题目'){display(formatQuestion(app,q));return;}
 if(choice==='打开题图'){if(process.platform!=='darwin')throw Error('自动打开题图仅支持 macOS；请复制当前题目显示的安全绝对路径');const images=safeQuestionImages(app.dataDir,q.assets);if(!images.length)throw Error('当前题目没有安全题图');const labels=images.map((a,i)=>`${i+1}. ${a.caption||a.path}`);const picked=await ctx.ui.select('选择当前题图',labels);if(!picked)return;const image=images[labels.indexOf(picked)]!;if(await ctx.ui.confirm('打开题图',image.path))await promisify(execFile)('open',[image.path]);return;}
 if(choice==='提示'){display(await app.study.hint(sid,action(),q.presentationId));return;}
 if(choice==='保存草稿'){const raw=await ctx.ui.input('草稿答案（填空用 | 分隔）');if(raw!==undefined)display(await app.study.saveDraft(sid,parseAnswer(raw,q.kind),action(),q.presentationId));return;}
 if(choice==='提交答案'){const raw=await ctx.ui.input('答案（多选可写 AC；判断正确/错误；填空用 | 分隔）');if(raw===undefined)return;const confidence=await ctx.ui.select('把握程度',['确定','不确定']);if(!confidence)return;if(!await ctx.ui.confirm('提交参考判分',raw))return;const receipt=await app.study.submit({sessionId:sid,presentationId:q.presentationId,questionRevisionId:q.questionRevisionId,answer:parseAnswer(raw,q.kind),confidence:confidence==='确定'?'sure':'unsure',idempotencyKey:randomUUID()},action());display(formatFeedback(await app.study.feedback(q.presentationId),receipt.assisted));return;}
 if(choice==='跳过'&&await ctx.ui.confirm('跳过当前题目','不计参考成绩'))display(await app.study.skip(sid,action(),q.presentationId));
 if(choice==='揭晓答案'&&await ctx.ui.confirm('揭晓答案','将标记为辅助作答'))display(await app.study.reveal(q.presentationId,action()));
}
