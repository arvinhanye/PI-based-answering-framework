import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {PageProcessingRecord} from '../contracts.js';
export interface PageCheckpoint {sourceVersionId:string;records:PageProcessingRecord[];}
export async function loadCheckpoint(path:string,sourceVersionId:string):Promise<PageCheckpoint>{
 try {const data=JSON.parse(await readFile(path,'utf8')) as PageCheckpoint;if(data.sourceVersionId!==sourceVersionId)throw new Error('changed_source_stops_resume');return data;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {sourceVersionId,records:[]};throw e;}
}
export async function savePageCheckpoint(path:string,sourceVersionId:string,record:PageProcessingRecord):Promise<void>{
 const data=await loadCheckpoint(path,sourceVersionId);data.records=data.records.filter(r=>r.page!==record.page);data.records.push(record);data.records.sort((a,b)=>a.page-b.page);await mkdir(dirname(path),{recursive:true});await writeFile(path+'.tmp',JSON.stringify(data,null,2));await rename(path+'.tmp',path);
}
