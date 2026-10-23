import type {SourceInput,ConversionResult,QuestionInput} from '../../contracts.js';
import {readDocx,type Paragraph} from './docx.js';
import {parseOptions,normalizeAnswer} from './text.js';
import {saveBank,validateCandidate} from './common.js';
export async function convertProvinceDocx(input:SourceInput):Promise<ConversionResult>{
 const doc=await readDocx(input);const questions:QuestionInput[]=[];let parts:Paragraph[]=[];
 function finish(answerParagraph?:Paragraph){
 const nonempty=parts.filter(p=>p.text.trim()||p.images.length);if(!nonempty.length)return;
 for(let k=1;k<nonempty.length;k++){const p=nonempty[k]!;p.text=p.text.replace(/^([A-H])(?:\s+|(?=[\u4e00-\u9fff]))/,'$1.');}
 const first=nonempty[0]!;const optionIndex=nonempty.findIndex(p=>/^\s*[A-H]\s*[.．、:：]/.test(p.text)||/^(正确|错误)$/.test(p.text.trim()));
 const rawAnswer=answerParagraph?.text.replace(/^答案\s*[:：]\s*/,'').trim()??'';
 const stem=nonempty.slice(0,optionIndex<0?undefined:optionIndex).map(p=>p.text).join('\n').replace(/^\d+[、.．]\s*/,'').trim();
 let options=parseOptions(nonempty.slice(Math.max(0,optionIndex)).map(p=>p.text).join('\n'));
 const kind=/^(正确|错误|对|错)$/.test(rawAnswer)?'truefalse':/多选|哪些|哪几/.test(stem)||rawAnswer.replace(/[^A-H]/g,'').length>1?'multiple':'single';
 if(kind==='truefalse')options=[{id:'true',text:'正确'},{id:'false',text:'错误'}];
 const assets=nonempty.flatMap(p=>p.images);const issues:string[]=['no_explanation'];let explanation='';
 for(const option of options)if(/拍照没拍到|原件缺失|选项缺失/.test(option.text)){explanation+='来源选项附注：'+option.id+'. '+option.text;option.text='[原件选项未提供]';issues.push('missing_option_content');}
 if(/如图|下图|图所示/.test(stem)&&!assets.length)issues.push('missing_figure');
 questions.push(validateCandidate({sourceKey:`p${first.index}`,kind,stem,options,answer:normalizeAnswer(rawAnswer,kind),rawAnswer,explanation,topics:['未分类'],status:'ready',basisStatus:'source_only',issues,locations:[{paragraph:first.index}],assets}));parts=[];
 }
 for(const p of doc.paragraphs){if(/^答案\s*[:：]/.test(p.text.trim()))finish(p);else parts.push(p);}finish();
 return saveBank({schemaVersion:1,source:{id:'province-docx',name:doc.name,sha256:doc.sha256,originalPath:input.path,paragraphCount:doc.paragraphs.length},questions,report:{candidateCount:0,ready:0,needsReview:0,processedParagraphs:doc.paragraphs.length,gaps:[],notes:['Word numbering.xml decoded, duplicate printed question numbers retained by paragraph sourceKey.']}},input.outputDir,'province-docx');
}
