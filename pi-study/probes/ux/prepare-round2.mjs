// Read-only source extraction; all sessions, grades and finance stay in a temporary home.
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import {join,dirname} from 'node:path';import {tmpdir} from 'node:os';
import {createApp} from '../../dist/composition.js';
import {safeQuestionImages} from '../../dist/adapters/pi/images.js';
const sourceDir=process.argv[2];if(!sourceDir)throw Error('Pass the source data directory');
const db=new DatabaseSync(join(sourceDir,'study.sqlite'),{readOnly:true});
const rows=db.prepare('SELECT q.source_id,r.payload FROM questions q JOIN revisions r ON r.id=q.current_revision_id').all().map(r=>({source:r.source_id,q:JSON.parse(r.payload)}));db.close();
const dir=mkdtempSync(join(tmpdir(),'pi-round2-')),home=join(dir,'home'),app=createApp({home});
const picks=[rows.find(r=>r.source==='first-docx'&&r.q.sourceKey==='3'),rows.find(r=>r.source==='first-docx'&&r.q.issues.includes('missing_figure')),rows.find(r=>r.source==='province-docx'&&r.q.issues.includes('no_explanation')), ...['p1-q1','p1-q2','p1-q3'].map(key=>rows.find(r=>r.source==='wlan-pdf'&&r.q.sourceKey===key))];
if(picks.some(r=>!r))throw Error('Expected source samples are missing');
const bank=await app.banks.create('二轮审查真实题库样本');
for(const source of ['first-docx','province-docx','wlan-pdf']){
 const questions=picks.filter(r=>r.source===source).map(r=>r.q);
 for(const q of questions)for(const image of safeQuestionImages(sourceDir,q.assets)){
  const asset=q.assets.find(a=>join(sourceDir,a.path)===image.path || image.path.endsWith('/'+a.path));
  if(!asset)throw Error('Asset mapping failed');const target=join(app.dataDir,asset.path);mkdirSync(dirname(target),{recursive:true});copyFileSync(image.path,target);
 }
 await app.banks.importBank({schemaVersion:1,source:{id:source,name:source,sha256:'round2-sample'},questions,report:{candidateCount:questions.length,ready:questions.filter(q=>q.status==='ready').length,needsReview:questions.filter(q=>q.status!=='ready').length,gaps:[]}},bank.id);
}
app.setSetting('activeBank',bank.id);app.setSetting('examDateAsked','true');app.budget.record(app.budget.begin(),{input:17911,output:0,cacheRead:0,cacheWrite:0});app.close();
writeFileSync(join(dir,'samples.json'),JSON.stringify(picks.map(r=>({source:r.source,key:r.q.sourceKey,answer:r.q.answer,issues:r.q.issues})),null,2));
const entry=new URL('../../dist/adapters/pi/index.js',import.meta.url).pathname,composition=new URL('../../dist/composition.js',import.meta.url).pathname;
writeFileSync(join(dir,'extension.mjs'),`import {appendFileSync} from 'node:fs';import{createApp}from ${JSON.stringify(composition)};import{registerStudy}from ${JSON.stringify(entry)};
export default pi=>{const app=createApp({home:${JSON.stringify(home)}});const log=x=>appendFileSync(${JSON.stringify(join(dir,'events.jsonl'))},JSON.stringify(x)+'\\n');
const wrap=ctx=>({...ctx,ui:{...ctx.ui,setWidget:(...a)=>{log({type:'widget',args:a});return ctx.ui.setWidget(...a);},setStatus:(...a)=>{log({type:'status',args:a});return ctx.ui.setStatus(...a);}}});
registerStudy({...pi,sendMessage:(m,...a)=>{log({type:'card',content:m.content,images:m.details?.images?.length??0});return pi.sendMessage(m,...a);},registerCommand:(n,c)=>pi.registerCommand(n,{...c,handler:(a,ctx)=>c.handler(a,wrap(ctx))}),on:(n,h)=>pi.on(n,(e,ctx)=>h(e,wrap(ctx)))},app);};`);
console.log(dir);
