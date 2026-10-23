import {readFile,readdir,mkdir,copyFile,writeFile,access} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import type {QuestionBankInput,QuestionInput,SourceInput,ConversionResult} from '../../contracts.js';
import {stablePdfAnchors} from './pdf-stable-anchors.js';
import {verifiedSourceHash,verifiedCorrections,verifiedStructureCorrections,verifiedDiagramCrops,verifiedFinalOptionCorrections} from './pdf-corrections.js';
import {hash} from './docx.js';import {parseOptions,normalizeAnswer,splitInlineAnswer} from './text.js';import {saveBank,validateCandidate} from './common.js';import {loadCheckpoint,savePageCheckpoint} from '../checkpoint.js';
const exec=promisify(execFile);
export interface OCRLine {text:string;confidence:number;bbox:[number,number,number,number];}
export interface OCRPage {page:number;pageCount:number;width:number;height:number;nativeText:string;lines:OCRLine[];error?:string;engine:string;}
interface Row extends OCRLine {page:number;}
export interface PageConversionContext {pagesDir?:string;checkpointPath?:string;skipNative?:boolean;}
const header=(s:string)=>/^\s*\d{1,4}$/.test(s)||/^\s*\d{1,4}\s*(?:[.．、,，。]|(?=[（(［[\u4e00-\u9fffA-Za-z]))/.test(s);
function effectiveNumber(n:number,last:number):number|null {if(!last||n>=last&&n<=last+4)return n;const expected=String(last+1),raw=String(n);if(raw.length===expected.length+1&&[...raw].some((_,i)=>raw.slice(0,i)+raw.slice(i+1)===expected))return last+1;return null;}
function questionHeader(s:string,next:string,lastNumber:number,following:string):boolean {
 if(!header(s))return false;
 const m=s.match(/^\s*(\d{1,4})\s*([.．、,，。])?\s*(.*)$/)!;const n=Number(m[1]),tail=m[3]??'';if(effectiveNumber(n,lastNumber)===null)return false;

 const natural=(tail.match(/[\u4e00-\u9fff]/g)??[]).length>=4||/[?？]|【.*[题題]/.test(tail);
 if(!tail.trim())return (n===lastNumber+1||!lastNumber)&&!option(next)&&((next.match(/[\u4e00-\u9fff]/g)??[]).length>=4||/^[［[<]/.test(next));
 if(!m[2]&&/^[（(]/.test(tail))return natural;
 if(!m[2])return natural&&(lastNumber===0?n===1:Math.abs(n-lastNumber)<=3);
 if(!tail.trim())return (n===lastNumber+1||n===1)&&!option(next)&&((next.match(/[\u4e00-\u9fff]/g)??[]).length>=4||/^[［[<]/.test(next));
 return natural||n===lastNumber+1&&(/^<|^[A-Za-z]|^[［[]/.test(tail)||/[（(]\s*[A-H]+\s*[)）】》]|【.*[题題]/.test(tail+following));
}
const option=(s:string)=>!(/^[A-H]+\s*[)）]\s*(?:【|$)/.test(s.trim()))&&(/^[A-H]$/.test(s.trim())||/^\s*[A-H](?:\s*[.．、,，:：)）［[]|\s+|(?=[\u4e00-\u9fff0-9])|(?=True|False|[A-Z][A-Za-z-]{1,30}\b|source\s))/.test(s));
function normalizeOptionLine(s:string):string{if(/^[A-Ha-h]$/.test(s.trim()))return s.trim().toUpperCase()+'.';return s.replace(/^\s*([A-H])(?:\s+(?![.．、])|(?=[\u4e00-\u9fff0-9])|(?=True|False|[A-Z][A-Za-z-]{1,30}\b|source\s))/,'$1.');}
function splitSupplementGroup(rows:Row[]):Row[][] {
 const groups:Row[][]=[];let current:Row[]=[];let seenA=false,seenOther=false;
 for(let i=0;i<rows.length;i++){const row=rows[i]!,t=row.text.trim();
 const nearbyA=rows.slice(i+1,i+4).findIndex(l=>/^A(?:[.．、\s]|[\u4e00-\u9fff0-9])/.test(l.text));const directPrompt=nearbyA>=0&&(t.match(/[\u4e00-\u9fff]/g)??[]).length>=6&&rows.slice(i+1,i+1+nearbyA).every(l=>(l.text.match(/[\u4e00-\u9fff]/g)??[]).length<4);
 const startsPrompt=(directPrompt||/^(?:如下图|下图|如图|交换机某|下面关于|管理员|下列关于|路由表中|缺省情况下)/.test(t)&&(t.match(/[\u4e00-\u9fff]/g)??[]).length>=6);
 if(seenA&&seenOther&&startsPrompt&&!option(t)){groups.push(current);current=[];seenA=false;seenOther=false;}
 current.push(row);if(/^A(?:[.．、\s]|[\u4e00-\u9fff0-9])/.test(t))seenA=true;if(/^[B-D](?:[.．、\s]|[\u4e00-\u9fff0-9])/.test(t))seenOther=true;
 }
 if(current.length)groups.push(current);return groups;
}
function parsePdfOptions(rows:Row[]):Array<{id:string;text:string}>{
 const out:Array<{id:string;text:string}>=[];
 for(const row of rows){const t=row.text.trim();if(!t)continue;
 const explicit=t.match(/^([A-H])\s*[.．、,，:：)）]\s*(.*)$/);const expected=String.fromCharCode(65+out.length);
 const implicit=option(t)&&t[0]===expected ? {id:t[0]!,text:t.slice(1).trim()} : null;
 if(out.length&&out.at(-1)!.text===''&&t.length>1&&!explicit){out.at(-1)!.text=t;continue;}
 if(explicit)out.push({id:explicit[1]!,text:explicit[2]!});else if(implicit)out.push(implicit);else if(out.length)out.at(-1)!.text+=(out.at(-1)!.text?'\n':'')+t;
 }
 return out;
}
export function parsePdfPages(pages:OCRPage[]):QuestionBankInput {
 const rows:Row[]=pages.flatMap(p=>p.lines.map(l=>({...l,page:p.page})));const groups:Row[][]=[];let current:Row[]=[];
 const hasOptions=()=>current.some(l=>option(l.text));
 const flush=()=>{if(current.length)groups.push(current);current=[];};
 const orphanRows:string[]=[];let lastNumber=0;
 for(let i=0;i<rows.length;i++){
 const row=rows[i]!,s=row.text.trim().replace(/^(\d{1,3})\s+(\d)([.．、])/,'$1$2$3');if(!s)continue;
 const next=rows[i+1]?.text??'';const boundary=questionHeader(s,next,lastNumber,rows.slice(i+1,i+3).map(r=>r.text).join(''));if(boundary)lastNumber=effectiveNumber(Number(s.match(/\d+/)![0]),lastNumber)??lastNumber;
 // Supplemental unnumbered questions in the source are retained when their prompt precedes a fresh A option.
 const supplement=!boundary&&hasOptions()&&!option(s)&&(/^(?:\d[\dOQIl ]{0,4})?[（(]?(?:单选|多选|判断)[题題][)）]?/.test(s)||((/[?？]$/.test(s)||/[?？]/.test(s)&&/^A\b|^A[.．、]/.test(next))&&/^A(?:[.．、\s]|[\u4e00-\u9fff0-9])/.test(next)));
 if(boundary||supplement)flush();
 if(!current.length&&!boundary&&!supplement){orphanRows.push(`p${row.page}: ${s}`);continue;}
 current.push(row);
 }
 flush();
 const questions:QuestionInput[]=groups.flatMap((g,index)=>splitSupplementGroup(g).map((part,subindex)=>({g:part,index,subindex}))).map(({g,index,subindex})=>{
 const first=g[0]!;const headerEnd=g.findIndex(l=>/[（(]\s*[A-H]+\s*[)）》〉｝}]|【.*[题題]|^[A-H]+\s*[)）]\s*【/.test(l.text));let firstOption=g.findIndex((l,i)=>i>Math.max(0,headerEnd)&&/^\s*A/.test(l.text)&&option(l.text));if(firstOption>=0){const firstB=g.findIndex((l,i)=>i>firstOption&&/^B/.test(l.text)&&option(l.text));if(firstB>firstOption){const candidates=g.map((l,i)=>({l,i})).filter(({l,i})=>i>=firstOption&&i<firstB&&/^A/.test(l.text)&&option(l.text));firstOption=candidates.at(-1)?.i??firstOption;}}
 if(firstOption<0)firstOption=g.findIndex((l,i)=>i>Math.max(0,headerEnd)&&option(l.text));const promptRows=g.slice(0,firstOption<0?undefined:firstOption);
 const prompt=promptRows.filter(l=>!/^(?:参考|婆考|參考|签考|终考|正确)?答案\s*[:：]?/.test(l.text)).map(l=>l.text).join('\n').replace(/【\s*(单选|多选|判断)\s*\n\s*[题題]\s*】/g,'【$1题】');
 // OCR sometimes renders closing fullwidth parentheses as 》/〉/】. Only terminal answer annotations are removed.
 const ref=g.find(l=>/^(?:参考|婆考|參考|签考|终考|正确)?答案\s*[:：]?/.test(l.text));
 const referenceAnswer=ref?.text.replace(/^(?:参考|婆考|參考|签考|终考|正确)?答案\s*[:：]?\s*/,'').trim()??'';
 const zoneCount=headerEnd>=0?headerEnd+1:Math.min(3,promptRows.length);
 const zone=promptRows.slice(0,zoneCount).filter(l=>!/^(?:参考|婆考|參考|签考|终考|正确)?答案/.test(l.text)).map(l=>l.text).join('\n');
 const repair=(v:string)=>v.replace(/([（(]\s*[A-H](?:\s*[,，、]?\s*[A-H]){0,7})[｝}\/]/g,'$1）').replace(/([（(]\s*[A-H](?:\s*[,，、]?\s*[A-H]){0,7})[》〉】]/g,'$1）');
 const headerExtracted=splitInlineAnswer(repair(zone));
 const hasAnswerMetadata=/【|[?？。]\s*[（(]\s*[A-H]/.test(zone);
 const inlineAnswer=headerExtracted.rawAnswer&&(hasAnswerMetadata||!referenceAnswer&&!/如图|下图|图所示/.test(zone))?headerExtracted.rawAnswer:'';
 const extracted={rawAnswer:inlineAnswer,body:inlineAnswer?[headerExtracted.body,...promptRows.slice(zoneCount).map(l=>l.text)].join('\n'):prompt};
 const rawAnswer=inlineAnswer||referenceAnswer;
 let stem=extracted.body.replace(/^\s*\d{1,4}\s*[.．、,，。]?\s*/,'').replace(/【\s*(?:单选|多选|判断)[题題]?\s*】?/g,'').trim();
 const bodyRows=g.slice(Math.max(0,firstOption));const answerRow=bodyRows.findIndex(l=>/^(?:参考|婆考|參考|签考|终考|正确)?答案\s*[:：]?|^解析\s*[:：]/.test(l.text));const cleanRows=bodyRows.slice(0,answerRow<0?undefined:answerRow);
 let options=parsePdfOptions(cleanRows);
 const booleanOptions=options.length===2&&/^(?:正确|对|True)/i.test(options[0]!.text.trim())&&/^(?:错误|错|锴|False)/i.test(options[1]!.text.trim());
 const kind=!/多选/.test(prompt)&&(/【\s*判断|[（(]\s*判断|判断[题題]/.test(prompt)||booleanOptions)?'truefalse':/单选/.test(prompt)?'single':/多选/.test(prompt)||rawAnswer.replace(/[^A-H]/g,'').length>1?'multiple':'single';
 if(kind==='truefalse')options=[{id:'true',text:'正确'},{id:'false',text:'错误'}];
 const issues:string[]=['ocr_text_unverified'];if(extracted.rawAnswer&&referenceAnswer&&extracted.rawAnswer.replace(/\s/g,'')!==referenceAnswer.replace(/\s/g,''))issues.push('conflicting_source_answers');if(!rawAnswer)issues.push('missing_answer');
 // Inline answer remnants must never be sent as a prompt.
 if(hasAnswerMetadata&&/[（(]\s*[A-H](?:\s*[,，、]?\s*[A-H]){0,7}\s*[)）》〉]/.test(headerExtracted.body))issues.push('unsafe_inline_answer');
 if(/如图|下图|图所示/.test(stem))issues.push('missing_figure');
 if(g.some(l=>l.confidence<.3))issues.push('low_ocr_confidence');
 const pageNums=[...new Set(g.map(l=>l.page))];
 return validateCandidate({sourceKey:`p${first.page}-q${index+1}${subindex?'-s'+(subindex+1):''}`,kind,stem,options,answer:normalizeAnswer(rawAnswer,kind),rawAnswer,explanation:'',topics:['未分类'],status:'ready',basisStatus:issues.includes('conflicting_source_answers')?'disputed':'source_only',issues,locations:pageNums.map(page=>({page,bbox:g.find(l=>l.page===page)!.bbox})),assets:[]});
 });
 const processing=pages.map(p=>{const candidateIds=questions.filter(q=>q.locations.some(l=>l.page===p.page)).map(q=>q.sourceKey);const regions:string[]=[];if(p.error||!p.lines.length)regions.push(p.error??'no_recognized_text');const orphan=orphanRows.filter(s=>s.startsWith(`p${p.page}:`));if(orphan.length)regions.push(...orphan);return {page:p.page,status:regions.length?'failed' as const:'converted' as const,candidateIds,unrecognizedRegions:regions,outputHash:hash(JSON.stringify(p))};});
 return {schemaVersion:1,source:{id:'wlan-pdf',name:'PDF',sha256:'',pageCount:pages[0]?.pageCount??pages.length,processing},questions,report:{candidateCount:questions.length,ready:questions.filter(q=>q.status==='ready').length,needsReview:questions.filter(q=>q.status==='needs_review').length,processedPages:pages.length,gaps:processing.flatMap(p=>p.unrecognizedRegions.map(r=>`page ${p.page}: ${r}`)),notes:['Offline Vision OCR, machine extraction only; source-only answers are not independent knowledge verification.']}};
}
/** A safe image region excludes both the answer-bearing prompt and all option lines. */
export function safeFigureCrop(page:OCRPage,startY:number):[number,number,number,number]|null {
 const rows=page.lines.filter(l=>l.bbox[1]>=startY-.002);let marker=-1;
 for(let i=0;i<rows.length;i++){if(header(rows[i]!.text)&&i>0)break;if(/[（(]\s*[A-H]+\s*[)）》〉]|【(?:单选|多选|判断)|[?？]\s*$/.test(rows[i]!.text))marker=i;if(/^A/.test(rows[i]!.text)&&option(rows[i]!.text))break;}
 if(marker<0)return null;let firstOption=rows.findIndex((l,i)=>i>marker&&/^A/.test(l.text)&&option(l.text));if(firstOption<0)return null;
 const top=rows[marker]!.bbox[1]+rows[marker]!.bbox[3]+.006,bottom=rows[firstOption]!.bbox[1]-.006;
 if(bottom-top<.04||rows.slice(marker+1,firstOption).some(l=>/答案|解析/.test(l.text)))return null;
 return [.10,top,.80,bottom-top];
}
export async function convertPdf(input:SourceInput,ctx:PageConversionContext={}):Promise<ConversionResult>{
 const cropBinary=fileURLToPath(new URL('../../../native/crop',import.meta.url));try{await access(cropBinary);}catch{throw new Error('缺少本地媒体构建产物。请在 pi-study 安装目录运行 sh native/build.sh（需要 macOS Command Line Tools），然后重试。');}
 const sha=hash(await readFile(input.path));const pagesDir=resolve(ctx.pagesDir??resolve(input.outputDir,'pdf-pages-local'));const checkpointPath=ctx.checkpointPath??resolve(input.outputDir,'pdf-checkpoint.json');
 await loadCheckpoint(checkpointPath,sha);
 if(!ctx.skipNative){const binary=fileURLToPath(new URL('../../../native/ocr-fast',import.meta.url));try{await access(binary);}catch{throw new Error('缺少 OCR 构建产物。请先在安装目录运行 sh native/build.sh。');}await exec(binary,[resolve(input.path),pagesDir],{maxBuffer:1024*1024});}
 const names=(await readdir(pagesDir)).filter(n=>/^page-\d+\.json$/.test(n)).sort((a,b)=>Number(a.match(/\d+/)![0])-Number(b.match(/\d+/)![0]));
 const pages:OCRPage[]=await Promise.all(names.map(async n=>JSON.parse(await readFile(resolve(pagesDir,n),'utf8')) as OCRPage));
 const bank=parsePdfPages(pages);if(sha===verifiedSourceHash){for(const q of bank.questions){const l=q.locations[0]!,anchor=`${l.page}:${l.bbox!.map(n=>n.toFixed(6)).join(',')}`;q.sourceKey=stablePdfAnchors[anchor]??`p${l.page}-extra-${hash(anchor+q.stem).slice(0,12)}`;}for(const record of bank.source.processing??[])record.candidateIds=bank.questions.filter(q=>q.locations.some(l=>l.page===record.page)).map(q=>q.sourceKey);}
 bank.source.sha256=sha;bank.source.name=basename(input.path);bank.source.originalPath=input.path;
 if(pages.length!==bank.source.pageCount)bank.report.gaps.push(`missing_pages: expected ${bank.source.pageCount}, got ${pages.length}`);
 await mkdir(resolve(input.outputDir,'assets'),{recursive:true});
 for(const p of pages){const src=resolve(pagesDir,`page-${p.page}.png`),dest=resolve(input.outputDir,'assets',`pdf-page-${p.page}.png`);await copyFile(src,dest);const sha256=hash(await readFile(dest));for(const q of bank.questions.filter(q=>q.locations.some(l=>l.page===p.page)))q.assets.push({path:dest,sha256,mime:'image/png',role:'source',caption:`来源 PDF 第 ${p.page} 页（含答案，仅揭晓后查看）`});}
 if(sha===verifiedSourceHash){
 for(const patch of [...verifiedCorrections,...verifiedStructureCorrections,...verifiedFinalOptionCorrections]){const q=bank.questions.find(q=>q.sourceKey===patch.candidateId);if(!q||!patch.sourcePages.every(p=>q.locations.some(l=>l.page===p)))throw new Error(`verified correction candidate drift: ${patch.candidateId}`);
 if(patch.originalStemPrefix){const clean=(v:string)=>v.replace(/\s/g,'');const a=clean(q.stem),b=clean(patch.originalStemPrefix);if(!a.startsWith(b.slice(0,Math.min(12,b.length)))&&!b.startsWith(a.slice(0,Math.min(12,a.length))))throw new Error(`verified correction stem drift: ${patch.candidateId}`);}
 if(patch.classification==='source_missing'){q.issues.push('missing_answer','source_anomaly_confirmed');q.status='needs_review';q.basisStatus='insufficient';continue;}
 if(patch.kind)q.kind=patch.kind;if(patch.stem)q.stem=patch.stem;if(patch.options)q.options=patch.options;
 if(q.kind==='truefalse')q.options=[{id:'true',text:'正确'},{id:'false',text:'错误'}];
 q.rawAnswer=patch.rawAnswer??patch.answer??'';q.answer=normalizeAnswer(patch.answer??'',q.kind);
 q.issues=q.issues.filter(i=>!['missing_answer','missing_options','duplicate_option_labels','invalid_option_answer','single_answer_cardinality','conflicting_source_answers'].includes(i));q.status='ready';q.basisStatus='source_only';
 if(patch.crop){const dest=resolve(input.outputDir,'assets',`verified-figure-${q.sourceKey}.png`);const binary=fileURLToPath(new URL('../../../native/crop',import.meta.url));await exec(binary,[resolve(pagesDir,`page-${patch.crop.page}.png`),dest,...patch.crop.bbox.map(String)]);q.assets.push({path:dest,sha256:hash(await readFile(dest)),mime:'image/png',role:'question',caption:`原页校对指定安全区域，第${patch.crop.page}页（代理视觉校对，非用户验收）`});q.issues=q.issues.filter(i=>i!=='missing_figure');}
 if(patch.classification==='source_anomaly')q.issues.push('source_anomaly_confirmed');validateCandidate(q);
 }
 bank.report.notes!.push('Applied 61 source-pixel agent visual correction records scoped to exact PDF SHA256. These are not human acceptance or independent knowledge verification.');
 }
 if(sha===verifiedSourceHash){for(const patch of verifiedDiagramCrops){const q=bank.questions.find(q=>q.sourceKey===patch.candidateId);if(!q||!q.locations.some(l=>l.page===patch.page))throw new Error(`verified diagram candidate drift: ${patch.candidateId}`);const dest=resolve(input.outputDir,'assets',`verified-diagram-${q.sourceKey}.png`);await exec(cropBinary,[resolve(pagesDir,`page-${patch.page}.png`),dest,...patch.bbox.map(String)]);q.assets.push({path:dest,sha256:hash(await readFile(dest)),mime:'image/png',role:'question',caption:`源页校对安全题图，第${patch.page}页`});q.issues=q.issues.filter(i=>i!=='missing_figure');q.status='ready';q.basisStatus='source_only';validateCandidate(q);}}
 for(const q of bank.questions.filter(q=>q.issues.includes('missing_figure'))){
 let made=0;const firstLoc=q.locations[0]!;const relevant=pages.filter(p=>q.locations.some(l=>l.page===p.page));
 for(const page of relevant){
 let crop=safeFigureCrop(page,page.page===firstLoc.page?firstLoc.bbox?.[1]??0:.075);
 if(!crop&&relevant.length===1){
 const rows=page.lines.filter(l=>l.bbox[1]>=(firstLoc.bbox?.[1]??0)-.002);const ai=rows.findIndex(l=>/^A/.test(l.text)&&option(l.text));
 if(ai>0&&rows.some(l=>/^(?:参考|婆考|參考|签考|正确)?答案/.test(l.text))){const top=rows[0]!.bbox[1]+rows[0]!.bbox[3]+.006,bottom=rows[ai]!.bbox[1]-.006;if(bottom-top>.04&&!rows.slice(1,ai).some(l=>/[（(]\s*[A-H]|答案/.test(l.text)))crop=[.1,top,.8,bottom-top];}
 }
 if(!crop&&relevant.length>1){
 const rows=page.lines.filter(l=>l.bbox[1]>=((page.page===firstLoc.page?firstLoc.bbox?.[1]??0:.075)-.002));
 const firstOption=rows.findIndex(l=>/^A/.test(l.text)&&option(l.text));
 if(page.page===firstLoc.page){let marker=-1;for(let i=0;i<(firstOption<0?rows.length:firstOption);i++)if(/[（(]\s*[A-H]+\s*[)）》〉]|【(?:单选|多选|判断)|[?？]\s*$|^[题題]?】$/.test(rows[i]!.text))marker=i;if(marker>=0){const y=rows[marker]!.bbox[1]+rows[marker]!.bbox[3]+.006;const bottom=firstOption<0?.94:rows[firstOption]!.bbox[1]-.006;if(bottom-y>.04)crop=[.1,y,.8,bottom-y];}}
 else if(firstOption>0){const bottom=rows[firstOption]!.bbox[1]-.006;if(bottom-.075>.04)crop=[.1,.075,.8,bottom-.075];}
 }
 if(crop){const cropRows=page.lines.filter(l=>l.bbox[1]>=crop![1]&&l.bbox[1]<crop![1]+crop![3]);if(cropRows.some(l=>/答案|解析/.test(l.text)))continue;const dest=resolve(input.outputDir,'assets',`figure-${q.sourceKey}-p${page.page}.png`);const binary=fileURLToPath(new URL('../../../native/crop',import.meta.url));await exec(binary,[resolve(pagesDir,`page-${page.page}.png`),dest,...crop.map(String)]);q.assets.push({path:dest,sha256:hash(await readFile(dest)),mime:'image/png',role:'question',caption:`PDF 第 ${page.page} 页安全题图区域`});made++;}
 }
 if(made){q.issues=q.issues.filter(i=>i!=='missing_figure');q.status='ready';q.basisStatus='source_only';validateCandidate(q);}
 }
 for(const q of bank.questions){
 const marker=q.stem.search(/如果\s*(?:是)?\s*(?:单选|多选)(?:题)?\s*(?:选择|选)|应该是错题/);
 if(marker>=0){q.explanation+=(q.explanation?'\n':'')+'来源附注：'+q.stem.slice(marker);q.stem=q.stem.slice(0,marker).trim();}
 const unresolved=q.issues.filter(i=>!q.issues.includes('source_anomaly_confirmed')||i==='missing_figure').filter(i=>['missing_options','invalid_option_answer','duplicate_option_labels','unsafe_inline_answer','missing_figure','empty_stem'].includes(i));
 if(unresolved.length){for(const loc of q.locations){const rec=bank.source.processing!.find(r=>r.page===loc.page)!;rec.unrecognizedRegions.push(`${q.sourceKey} bbox=${JSON.stringify(loc.bbox)}: ${unresolved.join(',')}`);rec.status='failed';}}
 }
 bank.report.gaps=bank.source.processing!.flatMap(r=>r.unrecognizedRegions.map(g=>`page ${r.page}: ${g}`));
 for(const r of bank.source.processing??[]){r.outputHash=hash(JSON.stringify({page:r.page,candidateIds:r.candidateIds,questions:bank.questions.filter(q=>q.locations.some(l=>l.page===r.page)),unrecognizedRegions:r.unrecognizedRegions}));await savePageCheckpoint(checkpointPath,sha,r);}
 return saveBank(bank,input.outputDir,'pdf');
}
