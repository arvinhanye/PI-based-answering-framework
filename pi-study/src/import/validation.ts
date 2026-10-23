import { z } from 'zod';
import type { QuestionBankInput } from '../contracts.js';
const hash=z.string().regex(/^[a-f0-9]{64}$/i);
const location=z.object({page:z.number().int().positive().optional(),paragraph:z.number().int().nonnegative().optional(),bbox:z.tuple([z.number(),z.number(),z.number(),z.number()]).optional()}).strict();
const asset=z.object({path:z.string().min(1),sha256:hash,mime:z.string().min(1),role:z.enum(['question','source']),caption:z.string().optional()}).strict();
const question=z.object({sourceKey:z.string().min(1),kind:z.enum(['single','multiple','truefalse','fill','short']),stem:z.string().min(1),options:z.array(z.object({id:z.string().min(1),text:z.string()}).strict()),answer:z.array(z.string()),rawAnswer:z.string(),explanation:z.string(),topics:z.array(z.string()),status:z.enum(['ready','needs_review']),basisStatus:z.enum(['source_only','verified','insufficient','disputed']),issues:z.array(z.string()),locations:z.array(location),assets:z.array(asset),equivalentAnswers:z.array(z.array(z.string())).optional()}).strict();
export const questionBankSchema=z.object({schemaVersion:z.literal(1),source:z.object({id:z.string().min(1),name:z.string().min(1),sha256:hash,originalPath:z.string().optional(),pageCount:z.number().int().positive().optional(),paragraphCount:z.number().int().nonnegative().optional(),processing:z.array(z.object({page:z.number().int().positive(),status:z.enum(['converted','failed']),candidateIds:z.array(z.string()),unrecognizedRegions:z.array(z.string()),outputHash:z.string(),error:z.string().optional()}).strict()).optional()}).strict(),questions:z.array(question).max(100000),report:z.object({candidateCount:z.number().int().nonnegative(),ready:z.number().int().nonnegative(),needsReview:z.number().int().nonnegative(),processedPages:z.number().int().nonnegative().optional(),processedParagraphs:z.number().int().nonnegative().optional(),gaps:z.array(z.string()),notes:z.array(z.string()).optional()}).strict()}).strict();
export function validateQuestionBank(input:unknown):QuestionBankInput {
 const data=questionBankSchema.parse(input);
 const keys=new Set<string>();
 for(const q of data.questions){
  if(keys.has(q.sourceKey))throw new Error(`题号重复: ${q.sourceKey}`);keys.add(q.sourceKey);
  const ids=new Set(q.options.map(o=>o.id));if(ids.size!==q.options.length&&(q.status==='ready'||q.issues.length===0))throw new Error(`选项重复: ${q.sourceKey}`);
  if(q.status==='ready'){
   if(q.answer.length===0)throw new Error(`可评分题缺少答案: ${q.sourceKey}`);
   if(['single','multiple'].includes(q.kind)&&q.answer.some(a=>!ids.has(a)))throw new Error(`答案不在选项中: ${q.sourceKey}`);
   if(q.kind==='single'&&q.answer.length!==1)throw new Error(`单选答案数量错误: ${q.sourceKey}`);
  }
 }
 if(data.report.candidateCount!==data.questions.length||data.report.ready!==data.questions.filter(q=>q.status==='ready').length||data.report.needsReview!==data.questions.filter(q=>q.status==='needs_review').length)throw new Error('报告数量与候选数量不一致');
 if(data.source.pageCount!==undefined){
  const pages=data.source.processing??[];
  if(pages.length!==data.source.pageCount||new Set(pages.map(p=>p.page)).size!==data.source.pageCount||pages.some(p=>p.page>data.source.pageCount!))throw new Error('页级处理记录不完整');
  if(pages.some(p=>p.status==='failed'||p.unrecognizedRegions.length>0)&&data.report.gaps.length===0)throw new Error('页识别缺口必须在报告列出');
  for(const page of pages)if(page.candidateIds.some(id=>!keys.has(id)))throw new Error('页引用未知候选');
 }
 return data;
}
