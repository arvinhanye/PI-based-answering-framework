/** Labels are recognized only at paragraph/line/tab boundaries, never dots inside commands. */
export function parseOptions(text:string):Array<{id:string;text:string}>{
 const options:Array<{id:string;text:string}>=[];
 for(const line of text.replace(/\r/g,'\n').split(/[\n\t]/)){
 const match=line.match(/^\s*([A-H])\s*[.．、:：)）]\s*(.*)$/);
 if(match)options.push({id:match[1]!,text:match[2]!.trim()});
 else if(line.trim()&&options.length){const last=options.at(-1)!;last.text+=(last.text?'\n':'')+line.trim();}
 }
 return options;
}
export function splitInlineAnswer(text:string):{body:string;rawAnswer:string}{
 let rawAnswer='';
 const body=text.replace(/[（(]\s*([A-H](?:\s*[,，、]?\s*[A-H]){0,7}|正确|错误|对|错|TRUE|FALSE)\s*[)）]/g,(_,a:string)=>{rawAnswer=a;return '';}).replace(/[ \t]+\n/g,'\n').trim();
 return {body,rawAnswer};
}
export function normalizeAnswer(raw:string,kind:string):string[]{
 const s=raw.trim();if(!s)return [];
 if(kind==='truefalse'){if(/^(正确|对|√|TRUE|True|T|A)$/i.test(s))return ['true'];if(/^(错误|错|×|FALSE|False|F|B)$/i.test(s))return ['false'];return [];}
 return kind==='single'||kind==='multiple'?[...s.toUpperCase().replace(/[^A-H]/g,'')]:[s];
}
