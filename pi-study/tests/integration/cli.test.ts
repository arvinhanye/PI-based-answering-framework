import {test,expect} from 'vitest';import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {runCli} from '../../src/cli/commands.js';
test('CLI import start explicit answer resume works without model credentials',async()=>{const home=mkdtempSync(join(tmpdir(),'study-cli-'));const opts={home};try{const bank=await runCli(['bank','create','人工样本'],opts);const input={schemaVersion:1,source:{id:'manual',name:'人工样本',sha256:'a'.repeat(64)},questions:[{sourceKey:'1',kind:'single',stem:'请选择甲',options:[{id:'A',text:'甲'},{id:'B',text:'乙'}],answer:['A'],rawAnswer:'A',explanation:'人工答案',topics:[],status:'ready',basisStatus:'source_only',issues:[],locations:[],assets:[]}],report:{candidateCount:1,ready:1,needsReview:0,gaps:[]}};const file=join(home,'manual.json');writeFileSync(file,JSON.stringify(input));await runCli(['import',file,'--bank',bank.id],opts);const start=await runCli(['start','--bank',bank.id],opts);expect(start.question.stem).toBe('请选择甲');expect(JSON.stringify(start)).not.toContain('人工答案');const resume=await runCli(['resume'],opts);expect(resume.question.presentationId).toBe(start.question.presentationId);await expect(runCli(['A'],opts)).rejects.toThrow(/未知命令/);expect((await runCli(['stats'],opts)).attempts).toBe(0);const receipt=await runCli(['answer','A'],opts);expect(receipt.grade.correct).toBe(true);expect((await runCli(['stats'],opts)).current.independent).toEqual({numerator:1,denominator:1});}finally{rmSync(home,{recursive:true,force:true});}});
test('CLI budget shares user ledger across business spaces',async()=>{const home=mkdtempSync(join(tmpdir(),'study-cli-budget-'));try{await runCli(['budget','set','8'],{home,dataDir:join(home,'a')});const budget=await runCli(['budget','show'],{home,dataDir:join(home,'b')});expect(budget.limitCny).toBe('8');}finally{rmSync(home,{recursive:true,force:true});}});
test('CLI help flags work without creating an application',async()=>{
 for(const args of [['--help'],['-h'],['help'],[]])expect(await runCli(args)).toContain('Pi Study');
});
test('source policy is per bank and invalid updates preserve the previous policy',async()=>{
 const home=mkdtempSync(join(tmpdir(),'study-cli-policy-'));const opts={home};
 try{
  const a=await runCli(['bank','create','A'],opts);const b=await runCli(['bank','create','B'],opts);
  const file=join(home,'policy.json');const policy={id:'rfc-only',version:'2026-10',allowedDomains:['rfc-editor.org']};
  writeFileSync(file,JSON.stringify(policy));await runCli(['source-policy','set',file,'--bank',a.id],opts);
  expect(await runCli(['source-policy','show','--bank',a.id],opts)).toEqual(policy);
  expect((await runCli(['source-policy','show','--bank',b.id],opts)).id).not.toBe(policy.id);
  for(const allowedDomains of [[],['127.0.0.1'],['example.com/path'],['user:pass@example.com']]){
   writeFileSync(file,JSON.stringify({...policy,allowedDomains}));
   await expect(runCli(['source-policy','set',file,'--bank',a.id],opts)).rejects.toThrow();
   expect(await runCli(['source-policy','show','--bank',a.id],opts)).toEqual(policy);
  }
 }finally{rmSync(home,{recursive:true,force:true});}
});
