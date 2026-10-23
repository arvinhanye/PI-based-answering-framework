import {it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {convertFirstDocx} from '../../src/import/converters/first-docx.js';
import {convertProvinceDocx} from '../../src/import/converters/province-docx.js';
import {validateCandidate} from '../../src/import/converters/common.js';
import {paragraphText} from '../../src/import/converters/docx.js';
it('XML preserves real breaks and synthetic wcr/wtab',()=>expect(paragraphText('<w:r><w:t>A. x</w:t><w:br/><w:t>B. y</w:t><w:cr/><w:t>C.</w:t><w:tab/><w:t>z</w:t></w:r>')).toBe('A. x\nB. y\nC.\tz'));
it.skipIf(!existsSync(resolve('../ICT网络赛道1500题带解析.docx')))('all_candidates_accounted_for; raw_answer_preserved; missing_topic_unclassified',async()=>{
 const r=await convertFirstDocx({path:resolve('../ICT网络赛道1500题带解析.docx'),outputDir:await mkdtemp(join(tmpdir(),'first-'))});
 expect(r.bank.questions).toHaveLength(1508);expect(r.bank.questions.reduce((n,q)=>n+q.options.length,0)).toBe(5203);
 for(const [key,id,value] of [['641','C','X.25'],['838','C','RSTP.MSTP'],['951','D','NCE-FabriC.']])expect(r.bank.questions.find(q=>q.sourceKey===key)?.options.find(o=>o.id===id)?.text).toContain(value);
 expect(r.bank.questions.find(q=>q.sourceKey==='3')?.rawAnswer).toBe('B');expect(r.bank.questions.find(q=>q.sourceKey==='423')?.status).toBe('needs_review');expect(r.bank.questions.filter(q=>q.topics[0]==='未分类')).toHaveLength(1296);
 const candidate=structuredClone(r.bank.questions[0]!);candidate.answer=['Z'];expect(validateCandidate(candidate).status).toBe('needs_review');
});
it.skipIf(!existsSync(resolve('../网络赛道（省赛）.docx')))('province parses automatic Word list labels and all answer paragraphs',async()=>{const r=await convertProvinceDocx({path:resolve('../网络赛道（省赛）.docx'),outputDir:await mkdtemp(join(tmpdir(),'province-'))});expect(r.bank.questions).toHaveLength(109);expect(r.bank.questions.find(q=>q.sourceKey==='p626')).toMatchObject({status:'needs_review',basisStatus:'insufficient',rawAnswer:'C'});expect(r.bank.questions.find(q=>q.sourceKey==='p626')?.options.at(-1)?.text).toBe('[原件选项未提供]');expect(r.bank.source.paragraphCount).toBe(1310);expect(r.bank.questions.find(q=>q.stem.startsWith('华为VRP'))?.options.map(o=>o.id)).toEqual(['A','B','C','D']);});
