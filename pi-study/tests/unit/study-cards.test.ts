import {it,expect} from 'vitest';
import {questionCard,resultCard} from '../../src/presentation/cards.js';
const q={sourceId:'first-docx',sourceKey:'37',kind:'multiple',stem:'Choose the commands',options:[{id:'A',text:'one'},{id:'C',text:'three'}],topics:[],status:'ready',assets:[{role:'question',path:'assets/q.png'}],presentationId:'secret-id',questionRevisionId:'secret-revision'} as any;
const budget={spentCny:'0.12',limitCny:'10'};
it('question card separates stem/options, removes trailing topic and keeps actions and progress out',()=>{
 const text=questionCard({...q,stem:'Choose the commands【无线考点】'},{correct:8,total:10},budget);
 expect(text).toContain('第 37 题 · 多选 · 1500题\nChoose the commands\n\nA. one');
 expect(text).not.toMatch(/本轮|输入答案|下一题|study menu|study exit|本月|【无线考点】|secret/);
 expect(questionCard({...q,stem:'保留【中间考点】内容'},{correct:0,total:0},budget)).toContain('保留【中间考点】内容');
});
it('incorrect multiple choice shows missing/extra choices and full source explanation',()=>{
 const text=resultCard(q,['A','D'],{questionRevisionId:'revision',answer:['A','C'],rawAnswer:'AC',explanation:'First paragraph.\nSecond paragraph.',issues:['Known issue'],grade:{status:'scored',correct:false,score:0,maxScore:1,basisStatus:'source_only',reason:'参考判分'}},budget);
 expect(text).toContain('✗ 错误');expect(text).toContain('漏选 C · 多选 D');expect(text).toContain('\n\n解析：First paragraph.\nSecond paragraph.');expect(text).not.toMatch(/下一题|study undo|本月/);expect(text).toContain('这题资料有其他问题');expect(text).not.toContain('Known issue');expect(text).not.toMatch(/参考判分|source_only|辅助作答/);
});
it('unscorable and missing explanations remain readable',()=>{
 const text=resultCard(q,['A'],{questionRevisionId:'revision',answer:['C'],rawAnswer:'C',explanation:'',issues:[],grade:{status:'unscorable',correct:null,score:null,maxScore:1,basisStatus:'source_only',reason:'internal'}},budget);
 expect(text).toContain('— 不计分（缺少评分条件）');expect(text).toContain('题库未提供解析');expect(text).not.toContain('internal');
});
it('CLI shares clean card layout without persistent actions',async()=>{
 const {renderCli}=await import('../../src/cli/commands.js');
 const text=renderCli({question:{...q,assets:[]},progress:{correct:0,total:0},budget});
 expect(text).toContain('Choose the commands\n\nA. one');expect(text).not.toMatch(/study answer|study next|输入答案|直接打字|本月/);
});
it.each([['0','0.00'],['0.000000001','<0.01'],['0.00999999','<0.01'],['0.01','0.01'],['0.03582312','0.04'],['1.005','1.01']])('CLI rounds display %s without changing ledger precision',async(value,want)=>{
 const {renderCli}=await import('../../src/cli/commands.js');const b={spentCny:value,limitCny:'10'};
 expect(renderCli(b)).toBe(`本月已用 ${want} / 10.00 元`);expect(b.spentCny).toBe(value);
});
it('hides process codes and shows explanation caveat only after answering',()=>{
 const f={answer:['A'],explanation:'完整解析',issues:['ocr_text_unverified','source_explanation_disputed'],grade:{status:'scored',correct:true}} as any;
 const before=questionCard({...q,status:'needs_review',warnings:[]},{correct:0,total:0},budget);
 expect(before).not.toContain('⚠');
 const after=resultCard(q,['A'],f,budget);expect(after).toContain('这段解析可能有误');expect(after).not.toMatch(/ocr_text_unverified|source_explanation_disputed/);
});
it('combines answer-affecting warnings and gives a concrete unscored reason',()=>{
 const before=questionCard({...q,warnings:['原题缺图','原题选项编号重复']},{correct:0,total:0},budget);
 expect(before).toContain('⚠ 原题缺图；原题选项编号重复，本题不计分');expect(before.match(/⚠/g)).toHaveLength(1);
 const after=resultCard(q,['A'],{answer:[],explanation:'',issues:['missing_figure','duplicate_option_labels'],grade:{status:'unscorable'}} as any,budget);
 expect(after).toContain('— 不计分（原题缺图；原题选项编号重复）');
});
