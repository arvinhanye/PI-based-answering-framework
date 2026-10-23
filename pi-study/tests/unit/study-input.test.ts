import {it,expect} from 'vitest';
import {classifyStudyInput} from '../../src/study/input.js';
const question=(kind='single')=>({kind,options:['A','B','C','D'].map(id=>({id,text:id}))}) as any;
it.each(['B','b','选B','选择b','答案B','答案是B','我选 b'])('recognizes explicit single choice %s',text=>expect(classifyStudyInput(text,question())).toEqual({type:'answer',answer:['B'],confidence:'sure'}));
it.each(['ac','A,C','选AC','a c','A，C','A、C','CCAA'])('normalizes multiple choice %s',text=>expect(classifyStudyInput(text,question('multiple'))).toEqual({type:'answer',answer:['A','C'],confidence:'sure'}));
it('marks trailing question mark as uncertainty',()=>expect(classifyStudyInput('我选 AC？',question('multiple'))).toEqual({type:'answer',answer:['A','C'],confidence:'unsure'}));
it.each(['对','正确','√','T','t','A','a'])('accepts true aliases %s',text=>expect(classifyStudyInput(text,question('truefalse'))).toMatchObject({type:'answer',answer:['true']}));
it.each(['错','错误','×','F','f','B','b'])('accepts false aliases %s',text=>expect(classifyStudyInput(text,question('truefalse'))).toMatchObject({type:'answer',answer:['false']}));
it.each(['AB','E','AZ','选ACZ'])('rejects malformed choice without grading or asking the model %s',text=>expect(classifyStudyInput(text,question()).type).toBe('invalid'));
it('rejects invalid boolean and empty explicit fill',()=>{expect(classifyStudyInput('C',question('truefalse')).type).toBe('invalid');expect(classifyStudyInput('= ',question('fill')).type).toBe('invalid');});
it.each(['B为什么不对','什么是 Mesh','OSPF','display ip routing-table'])('leaves ambiguous prose as a question %s',text=>expect(classifyStudyInput(text,question()).type).toBe('question'));
it('fill requires equals and retains internal spaces and case',()=>{expect(classifyStudyInput('display ip routing-table',question('fill')).type).toBe('question');expect(classifyStudyInput('= display ip routing-table | My Answer',question('fill'))).toEqual({type:'answer',answer:['display ip routing-table','My Answer'],confidence:'sure'});});
it.each(['n','N','下'])('routes next shortcut %s',text=>expect(classifyStudyInput(text,question())).toEqual({type:'next'}));
it.each(['single','multiple','truefalse','fill','short'] as const)('图 is an image action before %s answer parsing',kind=>{
 expect(classifyStudyInput(' 图 ',{kind,options:[{id:'A',text:'甲'}]})).toEqual({type:'image'});
 expect(classifyStudyInput('这张图怎么理解',{kind,options:[]})).toEqual({type:'question'});
});
