import type {ExtensionContext} from '@earendil-works/pi-coding-agent';
import type {StudyApp} from '../../composition.js';
import type {ControlledSession} from './session.js';
import {isTrustedMenu} from './input.js';
import {studyAction,formatQuestion,formatFeedback,type LearningFactory} from './ui.js';
import {showConnectionStatus} from './connection.js';

type Page='main'|'question'|'library'|'actions'|'explanation'|'budget';
const pages:Record<Page,{title:string;options:string[]}>= {
 main:{title:'学习主菜单 · quick｜本地判题；DeepSeek 仅在讲解/查证时调用',options:['继续刷题','题库与会话','解析与查证','参考成绩','预算','DeepSeek 状态','退出学习','收起菜单（仍在学习态）']},
 question:{title:'当前题目 · 选择“提交答案”后输入 A / AC',options:['提交答案','下一题','题目操作','解析与查证','返回主菜单']},
 library:{title:'题库与会话',options:['选择题库','开始 quick','按来源开始 quick','恢复会话','返回上一级']},
 actions:{title:'题目操作',options:['当前题目','打开题图','保存草稿','提示','跳过','揭晓答案','返回上一级']},
 explanation:{title:'解析与查证 · 先提交或揭晓；AI 调用前会确认费用',options:['本地解析','受控 AI 讲解','手动资料查证','DeepSeek 状态','返回上一级']},
 budget:{title:'预算 · 修改上限不产生模型费用',options:['预算查看','预算设置','返回上一级']},
};
const errorText=(error:unknown)=>`学习操作失败：${error instanceof Error?error.message:String(error)}`;

/** Every child dialog returns to its owning page; only the root can leave learning. */
function childContext(ctx:ExtensionContext):ExtensionContext {
 return {...ctx,ui:{...ctx.ui,
  select:(title,options,opts)=>ctx.ui.select(`${title}\n↑↓ 选择 · Enter 确认 · Esc 返回上一级`,options,opts),
  input:(title,placeholder,opts)=>ctx.ui.input(`${title}\nEnter 继续 · Esc 取消并返回上一级`,placeholder,opts),
  confirm:(title,message,opts)=>ctx.ui.confirm(title,`${message}\n选择 Yes 才执行；No / Esc 取消并返回上一级。`,opts),
 }};
}

export async function exitStudy(session:ControlledSession,ctx:ExtensionContext){
 if(!isTrustedMenu(ctx)){ctx.ui.notify('请在 Pi 交互终端中退出学习。','warning');return false;}
 if(!session.active){ctx.ui.notify('当前没有处于学习态；/study 可打开学习菜单。','info');return true;}
 if(!await ctx.ui.confirm('退出学习，返回 Pi 对话？','已提交的成绩保留；恢复原模型后，普通聊天费用不计入本包预算。\nYes 退出 · No / Esc 取消退出，仍在学习态'))return false;
 await session.exit();
 ctx.ui.notify('已返回 Pi 对话，已恢复原模型。输入 /study 可继续刷题；普通聊天不受本包预算保护。','info');
 return true;
}

export async function studyMenu(app:StudyApp,session:ControlledSession,ctx:ExtensionContext,learningFactory?:LearningFactory,startWithAnswer=false){
 if(!isTrustedMenu(ctx)){ctx.ui.notify('仅 Pi 交互终端支持学习菜单；RPC/print/JSON 请使用独立 CLI。','warning');return;}
 await session.enter(ctx);
 const child=childContext(ctx),stack:Page[]=['main'];
 let showQuestion=false,pendingAnswer=startWithAnswer;
 if(startWithAnswer){stack.push('question');showQuestion=true;}
 while(session.active){
  const page=stack.at(-1)!;
  let selecting=true;
  try{
   if(page==='question'&&showQuestion){
    showQuestion=false;
    const sid=app.getSetting('activeSession');
    if(!sid){stack.splice(1);pendingAnswer=false;ctx.ui.notify('请先在“题库与会话”中开始或恢复会话。','info');continue;}
    const q=(await app.study.inspect(sid)).question;
    ctx.ui.notify(q?formatQuestion(app,q):'当前没有题目，选择“下一题”开始。','info');
   }
   let definition=pages[page];
   if(page==='question'){
    const sid=app.getSetting('activeSession');
    const q=sid?(await app.study.inspect(sid)).question:null;
    if(q){
     try{await app.study.feedback(q.presentationId);definition={title:'当前题目 · 已提交或揭晓，选择“下一题”继续',options:['下一题','本地解析','解析与查证','题目操作','返回主菜单']};pendingAnswer=false;}
     catch(error){if((error as {code?:string}).code!=='ALREADY_FINALIZED')throw error;}
    }else{definition={title:'当前会话暂无题目 · 可尝试下一题，或返回主菜单开始新一轮',options:['返回主菜单','下一题']};pendingAnswer=false;}
   }
   selecting=true;
   const choice=pendingAnswer?'提交答案':await ctx.ui.select(
    `${definition.title}\n${page==='main'?'↑↓ 选择 · Enter 进入 · Esc 打开退出确认':'↑↓ 选择 · Enter 进入 · Esc 返回上一级'}`,
    definition.options);
   selecting=false;
   pendingAnswer=false;
   if(choice==='收起菜单（仍在学习态）'){
    ctx.ui.notify('已收起菜单，仍保持本地学习模式。/study 返回菜单；/study-answer 作答；/study-exit 退出学习；/quit 关闭 Pi。普通文本不会提交或发送模型。','info');return;
   }
   if(!choice||choice==='退出学习'){
    if(page==='main'){if(await exitStudy(session,ctx))return;}
    else stack.pop();
    continue;
   }
   if(choice==='返回上一级'){stack.pop();continue;}
   if(choice==='返回主菜单'){stack.splice(1);continue;}
   const destination:Partial<Record<string,Page>>={'继续刷题':'question','题库与会话':'library','题目操作':'actions','解析与查证':'explanation','预算':'budget'};
   if(destination[choice]){stack.push(destination[choice]!);showQuestion=destination[choice]==='question';continue;}
   if(choice==='DeepSeek 状态'){await showConnectionStatus(app,child);continue;}
   if(choice==='本地解析'){
    const sid=app.getSetting('activeSession');if(!sid)throw Error('请先开始或恢复会话');
    const q=(await app.study.inspect(sid)).question;if(!q)throw Error('没有当前题目');
    ctx.ui.notify(formatFeedback(await app.study.feedback(q.presentationId)),'info');continue;
   }
   const result=await studyAction(app,session,child,choice,learningFactory);
   if((choice==='开始 quick'||choice==='按来源开始 quick'||choice==='恢复会话')&&result===true){stack.splice(1,stack.length,'question');}
  }catch(error){if(selecting)throw error;ctx.ui.notify(errorText(error),'error');}
 }
}
