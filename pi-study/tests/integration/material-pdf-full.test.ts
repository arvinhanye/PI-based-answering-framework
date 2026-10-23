import {it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';import {resolve} from 'node:path';
import type {QuestionBankInput} from '../../src/contracts.js';
const path=resolve('converted/pdf.json');
it.skipIf(!existsSync(path))('all_235_pages_have_processing_records; all_recognizable_candidates_retained',()=>{
 const b=JSON.parse(readFileSync(path,'utf8')) as QuestionBankInput;
 expect(b.source.pageCount).toBe(235);expect(b.source.processing?.map(p=>p.page)).toEqual(Array.from({length:235},(_,i)=>i+1));
 expect(new Set(b.questions.map(q=>q.sourceKey)).size).toBe(b.questions.length);expect(b.questions.length).toBeGreaterThan(943);
 expect(b.questions.find(q=>q.sourceKey==='p34-q144')?.answer).toEqual(['C','D']);
 expect(b.questions.find(q=>q.sourceKey==='p235-q960')).toMatchObject({status:'needs_review',basisStatus:'insufficient',answer:[]});
 for(const q of b.questions.filter(q=>q.status==='ready'))expect(q.answer.length).toBeGreaterThan(0);
 for(const q of b.questions)for(const a of q.assets.filter(a=>a.role==='question'))expect(a.path).not.toContain('pdf-page-');
});
