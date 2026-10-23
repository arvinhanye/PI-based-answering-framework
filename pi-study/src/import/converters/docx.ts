import AdmZip from 'adm-zip';
import {XMLParser} from 'fast-xml-parser';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,basename,extname} from 'node:path';
import type {AssetInput,SourceInput} from '../../contracts.js';
export const hash=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
export interface Paragraph {text:string;index:number;images:AssetInput[];numbering?:string;}
const decode=(s:string):string=>new XMLParser({processEntities:true,trimValues:false}).parse(`<x>${s}</x>`).x?.toString() ?? '';
export function paragraphText(xml:string):string {
 return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(br|cr|tab)\b[^>]*\/?\s*>/g)].map(m=>m[2] ? m[2]==='tab'?'\t':'\n':decode(m[1]??'')).join('');
}
export async function readDocx(input:SourceInput):Promise<{paragraphs:Paragraph[];sha256:string;name:string}> {
 const bytes=await readFile(input.path), zip=new AdmZip(bytes), xml=zip.readAsText('word/document.xml');
 const numbering=zip.getEntry('word/numbering.xml') ? zip.readAsText('word/numbering.xml'):'';
 const abstract=new Map<string,{format:string;start:number}>();
 for(const m of numbering.matchAll(/<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g)) abstract.set(m[1]!,{format:m[2]!.match(/<w:numFmt[^>]*w:val="([^"]+)"/)?.[1]??'',start:Number(m[2]!.match(/<w:start[^>]*w:val="(\d+)"/)?.[1]??1)});
 const nums=new Map<string,{format:string;next:number}>();
 for(const m of numbering.matchAll(/<w:num\b[^>]*w:numId="(\d+)"[^>]*>([\s\S]*?)<\/w:num>/g)) {const a=abstract.get(m[2]!.match(/<w:abstractNumId[^>]*w:val="(\d+)"/)?.[1]??'');if(a)nums.set(m[1]!,{format:a.format,next:Number(m[2]!.match(/<w:startOverride[^>]*w:val="(\d+)"/)?.[1]??a.start)});}
 const rels=new Map<string,string>();
 for(const m of zip.readAsText('word/_rels/document.xml.rels').matchAll(/<Relationship\b([^>]*)\/?\s*>/g)){const id=m[1]!.match(/\bId="([^"]+)"/)?.[1],target=m[1]!.match(/\bTarget="([^"]+)"/)?.[1];if(id&&target)rels.set(id,target);}
 const paragraphs:Paragraph[]=[];await mkdir(resolve(input.outputDir,'assets'),{recursive:true});
 for(const [i,m] of [...xml.matchAll(/<w:p\b[^>]*\/>|<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].entries()) {
  let text=paragraphText(m[1]??'');const numId=(m[1]??'').match(/<w:numId[^>]*w:val="(\d+)"/)?.[1];const num=nums.get(numId??'');let label:string|undefined;
  if(num&&text.trim()){label=num.format==='upperLetter'?`${String.fromCharCode(64+num.next)}.`:num.format==='decimal'?`${num.next}、`:undefined;num.next++;if(label)text=label+text;}
  const images:AssetInput[]=[];
  for(const im of (m[1]??'').matchAll(/(?:r:embed|r:id)="([^"]+)"/g)){const target=rels.get(im[1]!);if(!target||!target.includes('media/'))continue;const data=zip.readFile('word/'+target.replace(/^\.\//,''));if(!data)continue;const path=resolve(input.outputDir,'assets',hash(data)+extname(target));await writeFile(path,data);images.push({path,sha256:hash(data),mime:extname(target)==='.png'?'image/png':'image/jpeg',role:'question',caption:`来源段落 ${i+1}`});}
  paragraphs.push({text,index:i+1,images,...(label?{numbering:label}:{})});
 }
 return {paragraphs,sha256:hash(bytes),name:basename(input.path)};
}
