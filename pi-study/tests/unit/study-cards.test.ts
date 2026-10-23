import {it,expect} from 'vitest';
import {questionCard,resultCard} from '../../src/presentation/cards.js';
const q={sourceId:'first-docx',sourceKey:'37',kind:'multiple',stem:'Choose the commands',options:[{id:'A',text:'one'},{id:'C',text:'three'}],topics:[],status:'ready',assets:[{role:'question',path:'assets/q.png'}],presentationId:'secret-id',questionRevisionId:'secret-revision'} as any;
const budget={spentCny:'0.12',limitCny:'10'};
it('question card has original number, progress, images and actionable input footer without storage identifiers',()=>{
 const text=questionCard(q,{correct:8,total:10},budget);expect(text).toContain('第 37 题');expect(text).toContain('多选');expect(text).toContain('1500题');expect(text).toContain('本轮 8/10 ✓');expect(text).toContain('Ctrl+Alt+O');expect(text).toContain('输入答案');expect(text).toContain('0.12 / 10 元');expect(text).not.toMatch(/secret|UUID|source_only|未分类|参考判分/);
});
it('incorrect multiple choice shows missing/extra choices and full source explanation',()=>{
 const text=resultCard(q,['A','D'],{questionRevisionId:'revision',answer:['A','C'],rawAnswer:'AC',explanation:'First paragraph.\nSecond paragraph.',issues:['Known issue'],grade:{status:'scored',correct:false,score:0,maxScore:1,basisStatus:'source_only',reason:'参考判分'}},budget);
 expect(text).toContain('✗ 错误');expect(text).toContain('漏选 C · 多选 D');expect(text).toContain('First paragraph.\nSecond paragraph.');expect(text).toContain('Known issue');expect(text).not.toMatch(/参考判分|source_only|辅助作答/);
});
it('unscorable and missing explanations remain readable',()=>{
 const text=resultCard(q,['A'],{questionRevisionId:'revision',answer:['C'],rawAnswer:'C',explanation:'',issues:[],grade:{status:'unscorable',correct:null,score:null,maxScore:1,basisStatus:'source_only',reason:'internal'}},budget);
 expect(text).toContain('这题资料有问题，本次不计分');expect(text).toContain('题库未提供解析');expect(text).not.toContain('internal');
});
it('CLI cards give executable answer/next commands and quote fill answers',async()=>{const {renderCli}=await import('../../src/cli/commands.js');const text=renderCli({question:q,progress:{correct:0,total:0},budget});expect(text).toContain('study answer A');expect(text).toContain('study next');expect(text).not.toMatch(/输入答案|n \/|直接打字/);const fill=renderCli({question:{...q,kind:'fill'},progress:{correct:0,total:0},budget});expect(fill).toContain("study answer '第一空|第二空'");});
