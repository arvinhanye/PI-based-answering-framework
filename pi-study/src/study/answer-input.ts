import type {QuestionKind} from '../contracts.js';
export function parseAnswer(text:string,kind:QuestionKind):string[]{
 const s=text.trim();if(!s)throw new Error('答案不能为空');
 if(kind==='multiple')return s.toUpperCase().replace(/[，,、\s;；]/g,'').split('');
 if(kind==='truefalse'){if(['A','TRUE','正确','对','是'].includes(s.toUpperCase()))return ['true'];if(['B','FALSE','错误','错','否'].includes(s.toUpperCase()))return ['false'];}
 return kind==='fill'?s.split('|').map(x=>x.trim()):[kind==='single'?s.toUpperCase():s];
}
