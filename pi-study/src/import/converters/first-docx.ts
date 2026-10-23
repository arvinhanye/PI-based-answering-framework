import type {SourceInput,ConversionResult,QuestionInput,QuestionKind} from '../../contracts.js';
import {readDocx} from './docx.js';
import {parseOptions,normalizeAnswer} from './text.js';
import {saveBank,validateCandidate,topics} from './common.js';
export async function convertFirstDocx(input:SourceInput):Promise<ConversionResult>{
 const doc=await readDocx(input);const questions:QuestionInput[]=[];const kinds:Record<string,QuestionKind>={'单选题':'single','多选题':'multiple','判断题':'truefalse','填空题':'fill'};
 for(let i=0;i<doc.paragraphs.length;i++){
 const marker=doc.paragraphs[i]!;const kind=kinds[marker.text.trim()];if(!kind)continue;
 const parts=[];let j=i+1;for(;j<doc.paragraphs.length&&!kinds[doc.paragraphs[j]!.text.trim()];j++)parts.push(doc.paragraphs[j]!);
 const first=parts.find(p=>p.text.trim());if(!first)continue;
 const stem=first.text.replace(/^\s*\d+[.．、]\s*/,'').trim();const number=first.text.match(/^\s*(\d+)/)?.[1]??String(questions.length+1);
 const ai=parts.findIndex(p=>/^正确答案\s*[:：]/.test(p.text));const ei=parts.findIndex(p=>/^解析\s*[:：]/.test(p.text));
 const rawAnswer=ai>=0?parts[ai]!.text.replace(/^正确答案\s*[:：]\s*/,'').trim():'';
 const optionText=parts.slice(parts.indexOf(first)+1,ai>=0?ai:ei>=0?ei:undefined).map(p=>p.text).join('\n');
 let options=parseOptions(optionText);if(kind==='truefalse')options=[{id:'true',text:'正确'},{id:'false',text:'错误'}];
 const assets=parts.flatMap(p=>p.images);const issues:string[]=[];
 if(!assets.length&&/如图|下图|图所示/.test(stem))issues.push('missing_figure');
 if(number==='3')issues.push('source_explanation_disputed');
 if(ei<0)issues.push('no_explanation');
 const q:QuestionInput={sourceKey:number,kind,stem,options,answer:normalizeAnswer(rawAnswer,kind),rawAnswer,explanation:ei>=0?parts.slice(ei).map(p=>p.text).join('\n').replace(/^解析\s*[:：]\s*/,'').trim():'',topics:topics(stem),status:'ready',basisStatus:number==='3'?'disputed':'source_only',issues,locations:[{paragraph:first.index}],assets};
 questions.push(validateCandidate(q));i=j-1;
 }
 return saveBank({schemaVersion:1,source:{id:'first-docx',name:doc.name,sha256:doc.sha256,originalPath:input.path,paragraphCount:doc.paragraphs.length},questions,report:{candidateCount:0,ready:0,needsReview:0,processedParagraphs:doc.paragraphs.length,gaps:[],notes:['Source answers preserved; knowledge correctness is not independently verified.']}},input.outputDir,'first-docx');
}
