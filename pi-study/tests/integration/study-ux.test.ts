import {it,expect,afterEach,vi} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createApp} from '../../src/composition.js';import type {QuestionInput} from '../../src/contracts.js';
const clean:Array<()=>void>=[];afterEach(()=>{clean.splice(0).forEach(fn=>fn());vi.useRealTimers();});
const action={origin:'cli' as const,eventId:'real-ux-user'};
async function setup(){
 const home=mkdtempSync(join(tmpdir(),'study-ux-'));const app=createApp({home});clean.push(()=>{app.close();rmSync(home,{recursive:true,force:true});});
 const bank=await app.banks.create('test');
 for(const id of ['wlan-pdf','province-docx','first-docx']){
 const questions:QuestionInput[]=[10,2,1].map(n=>({sourceKey:String(n),kind:'single',stem:id+' '+n,options:[{id:'A',text:'one'},{id:'B',text:'two'}],answer:['A'],rawAnswer:'A',explanation:'explanation',topics:[],status:'ready',basisStatus:'source_only',issues:[],locations:[],assets:[]}));
 await app.banks.importBank({schemaVersion:1,source:{id,name:id,sha256:id},questions,report:{candidateCount:3,ready:3,needsReview:0,gaps:[]}},bank.id);
 }
 const session=await app.study.start({bankId:bank.id,timezone:'UTC'});return {app,home,bank,session};
}
async function submit(app:ReturnType<typeof createApp>,sid:string,answer='A',confidence:'sure'|'unsure'='sure'){
 const q=(await app.study.inspect(sid)).question!;return app.study.submit({sessionId:sid,presentationId:q.presentationId,questionRevisionId:q.questionRevisionId,answer:[answer],confidence,idempotencyKey:crypto.randomUUID()},action);
}
it('new questions use source order and natural original numbers',async()=>{
 const {app,session}=await setup();const seen=[];
 for(let i=0;i<9;i++){const q=(await app.study.next(session.id))!;seen.push([q.sourceId,q.sourceKey]);await app.study.skip(session.id,action,q.presentationId);}
 expect(seen).toEqual(['first-docx','province-docx','wlan-pdf'].flatMap(source=>['1','2','10'].map(n=>[source,n])));
});
it('undo voids the current answer, restores review and allows a single effective re-answer',async()=>{
 const {app,session,bank}=await setup();const q=(await app.study.next(session.id))!;await submit(app,session.id,'B');
 await app.study.undo(session.id,action);
 expect((await app.stats.read({bankId:bank.id})).historical.denominator).toBe(0);expect(app.store.db.prepare('SELECT count(*) n FROM review').get()?.n).toBe(0);
 await submit(app,session.id,'A');expect((await app.stats.read({bankId:bank.id})).historical).toEqual({numerator:1,denominator:1});
 expect(app.store.db.prepare('SELECT count(*) n FROM submissions').get()?.n).toBe(2);expect(app.store.db.prepare('SELECT count(*) n FROM submissions WHERE voided_at IS NOT NULL').get()?.n).toBe(1);
 expect((await app.study.inspect(session.id)).question?.presentationId).toBe(q.presentationId);
 await app.study.next(session.id);await expect(app.study.undo(session.id,action)).rejects.toThrow('只能撤销当前题');
});
it('assistance cannot be recorded against an obsolete presentation',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
 const {app,session,bank}=await setup();const q=(await app.study.next(session.id))!;await submit(app,session.id,'B');
 const second=await app.study.start({bankId:bank.id,selection:'wrong',timezone:'UTC'});expect((await app.study.next(second.id))?.questionId).toBe(q.questionId);
 await expect(app.study.markAssisted(second.id,action,q.presentationId)).rejects.toMatchObject({code:'STALE_PRESENTATION'});
});
it('wrong-only never inserts new questions and assisted correctness cannot clear a wrong answer',async()=>{
 const {app,session,bank}=await setup();const q=(await app.study.next(session.id))!;await submit(app,session.id,'B');
 const second=await app.study.start({bankId:bank.id,selection:'wrong',timezone:'UTC'});const r=(await app.study.next(second.id))!;
 await app.study.markAssisted(second.id,action,r.presentationId);expect((await app.stats.read({bankId:bank.id})).attempts).toBe(1);
 await submit(app,second.id,'A');expect(await app.study.next(second.id)).toBeNull();
 const third=await app.study.start({bankId:bank.id,selection:'wrong'});expect((await app.study.next(third.id))?.questionId).toBe(q.questionId);await submit(app,third.id,'A');
 const fourth=await app.study.start({bankId:bank.id,selection:'wrong'});expect(await app.study.next(fourth.id)).toBeNull();
});
it('uncertainty and assisted answers are due tomorrow without extra counted events',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
 const {app,session,bank}=await setup();await app.study.next(session.id);await submit(app,session.id,'A','unsure');
 const q=(await app.study.next(session.id))!;await app.study.markAssisted(session.id,action,q.presentationId);expect((await app.stats.read({bankId:bank.id})).historical.denominator).toBe(1);
 await submit(app,session.id);expect(app.store.db.prepare('SELECT due FROM review').all().map(x=>x.due)).toEqual(['2026-10-26','2026-10-26']);
});
it('legacy submission migration preserves grades and permits undo after reopening',async()=>{
 const {app,home,session,bank}=await setup();await app.study.next(session.id);const receipt=await submit(app,session.id);
 app.store.db.exec(`DROP INDEX active_submission; ALTER TABLE submissions RENAME TO new_submissions;
 CREATE TABLE submissions(id TEXT PRIMARY KEY,presentation_id TEXT NOT NULL UNIQUE,session_id TEXT NOT NULL,revision_id TEXT NOT NULL,idempotency_key TEXT NOT NULL UNIQUE,input TEXT NOT NULL,receipt TEXT NOT NULL,created_at TEXT NOT NULL);
 INSERT INTO submissions SELECT id,presentation_id,session_id,revision_id,idempotency_key,input,receipt,created_at FROM new_submissions;DROP TABLE new_submissions;UPDATE schema_version SET version=1;`);
 const reopened=createApp({home});try{expect((await reopened.stats.read({bankId:bank.id})).historical).toEqual({numerator:1,denominator:1});expect(reopened.store.db.prepare('SELECT id FROM submissions').get()?.id).toBe(receipt.id);await reopened.study.undo(session.id,action);await submit(reopened,session.id);expect((await reopened.stats.read({bankId:bank.id})).historical.denominator).toBe(1);}finally{reopened.close();}
});
it('four reviews are followed by a naturally ordered new question',async()=>{
 const {app,session}=await setup();const ids=app.store.db.prepare("SELECT id FROM questions WHERE source_id='wlan-pdf' OR (source_id='province-docx' AND source_key='1')").all();
 for(const q of ids)app.store.db.prepare('INSERT INTO review VALUES(?,0,?,0)').run(String(q.id),'2000-01-01');
 const seen=[];for(let i=0;i<5;i++){const q=(await app.study.next(session.id))!;seen.push(q.sourceId);await app.study.skip(session.id,action,q.presentationId);}
 expect(seen.slice(0,4).every(id=>id!=='first-docx')).toBe(true);expect(seen[4]).toBe('first-docx');
});
