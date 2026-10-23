import {it,expect,afterEach,vi} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createApp} from '../../src/composition.js';import {renderCli,runCli} from '../../src/cli/commands.js';
import type {QuestionInput} from '../../src/contracts.js';
const clean:Array<()=>void>=[];afterEach(()=>{clean.splice(0).forEach(fn=>fn());vi.useRealTimers();});
const action={origin:'cli' as const,eventId:'progress-user'};
async function setup(){
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-23T00:30:00Z'));
 const home=mkdtempSync(join(tmpdir(),'study-progress-')),app=createApp({home});clean.push(()=>{app.close();rmSync(home,{recursive:true,force:true});});const bank=await app.banks.create('进度测试');
 for(const [id,name,count] of [['first-docx','1500题',7],['province-docx','省赛',2],['custom','自定义资料',0]] as const){
 const questions:QuestionInput[]=Array.from({length:count},(_,i)=>({sourceKey:String(i+1),kind:'single',stem:'题目'+i,options:[{id:'A',text:'甲'},{id:'B',text:'乙'}],answer:['A'],rawAnswer:'A',explanation:'解析',topics:i<4?['WLAN','安全']:i===5?['未分类','','  ']:['WLAN'],status:i===6?'needs_review':'ready',basisStatus:'source_only',issues:i===6?['missing_figure']:[],locations:[],assets:[]}));
 await app.banks.importBank({schemaVersion:1,source:{id,name,sha256:id},questions,report:{candidateCount:count,ready:count,needsReview:0,gaps:[]}},bank.id);
 }
 app.setSetting('activeBank',bank.id);app.setSetting('timezone','America/Los_Angeles');
 const session=await app.study.start({bankId:bank.id,sourceId:'first-docx',selection:'sequential',timezone:'America/Los_Angeles'});
 const answer=async(sid:string,value:string,assisted=false)=>{const q=(await app.study.next(sid))!;if(assisted)await app.study.markAssisted(sid,action,q.presentationId);await app.study.submit({sessionId:sid,presentationId:q.presentationId,questionRevisionId:q.questionRevisionId,answer:[value],confidence:'sure',idempotencyKey:crypto.randomUUID()},action);};
 return {app,home,bank,session,answer};
}
it('progress distinguishes completed questions from independent accuracy and excludes placeholders',async()=>{
 const {app,bank,session,answer}=await setup();
 for(const value of ['A','B','A','B','A'])await answer(session.id,value);
 await answer(session.id,'A',true);await answer(session.id,'A');
 const r:any=await app.stats.read({bankId:bank.id});expect(r.completed).toBe(7);expect(r.covered).toBe(6);
 expect(r.sources.map((s:any)=>[s.sourceId,s.totalQuestions,s.completed])).toEqual([['first-docx',7,7],['province-docx',2,0],['custom',0,0]]);
 expect(r.current.independent).toEqual({numerator:3,denominator:5});expect(r.current.assisted).toEqual({numerator:1,denominator:1});expect(r.wrong).toBe(2);
 expect(r.topics.map((t:any)=>t.topic)).not.toContain('未分类');expect(r.topics.find((t:any)=>t.topic==='WLAN').current.independent).toEqual({numerator:3,denominator:5});
 const text=renderCli(r);expect(text).toContain('1500题　已做 7 / 7　正确率 60%');expect(text).toContain('省赛　已做 0 / 2');expect(text).toContain('自定义资料　已做 0 / 0');expect(text).toContain('辅助作答　已做 1 题　正确率 100%');expect(text).toContain('WLAN 60%');expect(text).not.toMatch(/安全|未分类|numerator|denominator|sourceId|距比赛|NaN|\{/);
});
it('latest independent result replaces earlier result, assisted does not replace it, undo restores it',async()=>{
 const {app,bank,session,answer}=await setup();await answer(session.id,'A');
 const restart=()=>app.study.start({bankId:bank.id,sourceId:'first-docx',selection:'sequential'});
 const second=await restart();await answer(second.id,'B');
 const third=await restart();await answer(third.id,'A',true);
 let r:any=await app.stats.read({bankId:bank.id});expect(r.completed).toBe(1);expect(r.current.independent).toEqual({numerator:0,denominator:1});expect(r.current.assisted).toEqual({numerator:1,denominator:1});expect(r.wrong).toBe(1);
 await app.study.undo(second.id,action);r=await app.stats.read({bankId:bank.id});expect(r.current.independent).toEqual({numerator:1,denominator:1});expect(r.completed).toBe(1);
});
it('date countdown and due review use the configured local calendar, and CLI uses the same report',async()=>{
 const {app,home,bank,session,answer}=await setup();await answer(session.id,'B');app.store.db.prepare('UPDATE review SET due=?').run('2026-10-23');app.setSetting('examDate','2026-11-13');
 const result=await runCli(['stats'],{home});expect(result.daysUntilExam).toBe(22);expect(result.due).toBe(0);expect(renderCli(result)).toContain('距比赛 22 天');
 const utc:any=await app.stats.read({bankId:bank.id,timezone:'UTC',examDate:'2026-11-13'} as any);expect(utc.daysUntilExam).toBe(21);expect(utc.due).toBe(1);
 app.setSetting('examDate','');expect(renderCli(await runCli(['stats'],{home}))).not.toContain('比赛');
 app.setSetting('examDate','2026-02-31');expect(renderCli(await runCli(['stats'],{home}))).not.toContain('比赛');
 app.setSetting('examDate','2026-10-22');expect(renderCli(await runCli(['stats'],{home}))).toContain('今天比赛');
 app.setSetting('examDate','2026-10-21');expect(renderCli(await runCli(['stats'],{home}))).toContain('比赛日期已过 1 天');
});
it('source and topic filters scope progress, while skipped and undone-only questions remain uncompleted',async()=>{
 const {app,bank,session,answer}=await setup();await answer(session.id,'A');await app.study.undo(session.id,action);const q=(await app.study.inspect(session.id)).question!;await app.study.skip(session.id,action,q.presentationId);
 const r:any=await app.stats.read({bankId:bank.id,sourceId:'first-docx',topic:'安全'});expect(r.totalQuestions).toBe(4);expect(r.completed).toBe(0);expect(r.sources).toHaveLength(1);expect(renderCli(r)).not.toMatch(/正确率 \d+%/);
});
