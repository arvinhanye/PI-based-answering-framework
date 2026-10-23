import {mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {QuestionInput,QuestionBankInput,ConversionResult} from '../../contracts.js';
export function validateCandidate(q:QuestionInput):QuestionInput {
 if(!q.stem.trim())q.issues.push('empty_stem');
 if(q.answer.length===0)q.issues.push('missing_answer');
 if(q.kind==='single'||q.kind==='multiple'||q.kind==='truefalse') {
 if(q.options.length<2||q.options.some(o=>!o.text.trim()))q.issues.push('missing_options');
 if(q.answer.some(a=>!q.options.some(o=>o.id===a)))q.issues.push('invalid_option_answer');
 if(new Set(q.options.map(o=>o.id)).size!==q.options.length)q.issues.push('duplicate_option_labels');
 if(q.kind==='single'&&q.answer.length!==1)q.issues.push('single_answer_cardinality');
 }
 if(q.issues.some(i=>!['no_explanation','ocr_text_unverified'].includes(i)))q.status='needs_review';
 if(q.issues.some(i=>['missing_answer','missing_options','missing_option_content','missing_figure','unsafe_crop','empty_stem','invalid_option_answer','unresolved_image_text'].includes(i)))q.basisStatus='insufficient';
 q.issues=[...new Set(q.issues)];return q;
}
export async function saveBank(bank:QuestionBankInput,outputDir:string,name:string):Promise<ConversionResult>{
 bank.report.candidateCount=bank.questions.length;bank.report.ready=bank.questions.filter(q=>q.status==='ready').length;bank.report.needsReview=bank.questions.length-bank.report.ready;
 await mkdir(outputDir,{recursive:true});const outputPath=resolve(outputDir,name+'.json');await writeFile(outputPath+'.tmp',JSON.stringify(bank,null,2));await rename(outputPath+'.tmp',outputPath);return {bank,outputPath};
}
export function topics(stem:string):string[]{const tags=[...stem.matchAll(/【(安全|无线|数通)考点】/g)].map(m=>m[1]!);return tags.length?tags:['未分类'];}
