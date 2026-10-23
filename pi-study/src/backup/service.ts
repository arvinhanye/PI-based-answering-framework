import { backup, DatabaseSync } from 'node:sqlite';
import { mkdirSync, mkdtempSync, readdirSync, lstatSync, readFileSync, writeFileSync, existsSync, rmSync, renameSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import AdmZip from 'adm-zip';
import { z } from 'zod';
import type { StudyStore } from '../storage/business.js';
import { sha256 } from '../import/json.js';
const LIMIT=512*1024*1024;
const manifestSchema=z.object({schemaVersion:z.literal(1),createdAt:z.string(),files:z.array(z.object({path:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/),size:z.number().int().nonnegative().max(LIMIT)}).strict()).max(100000)}).strict();
function safePath(p:string){return p==='study.sqlite'||(/^(assets|sources|evidence)\//.test(p)&&!p.includes('\\')&&!p.split('/').some(x=>!x||x==='.'||x==='..')&&!p.includes('\0'));}
export class BackupService {
 constructor(private store:StudyStore,private dataDir:string){}
 async create(file:string){
  if(existsSync(file))throw new Error('备份目标已存在，请换文件名');
  const scratch=mkdtempSync(join(tmpdir(),'pi-study-snapshot-'));
  try{
   const snapshot=join(scratch,'study.sqlite');await backup(this.store.db,snapshot);
   const zip=new AdmZip();const files:Array<{path:string;sha256:string;size:number}>=[];let total=0;
   const add=(p:string,absolute:string)=>{const st=lstatSync(absolute);if(st.isSymbolicLink())throw new Error('拒绝备份符号链接');if(!st.isFile())throw new Error('仅支持普通文件');total+=st.size;if(total>LIMIT||files.length>=100000)throw new Error('备份容量超限');const bytes=readFileSync(absolute);files.push({path:p,sha256:sha256(bytes),size:bytes.length});zip.addFile(p,bytes,'',0o600);};
   add('study.sqlite',snapshot);
   const walk=(rel:string)=>{const absolute=join(this.dataDir,rel);if(lstatSync(absolute).isSymbolicLink())throw new Error('拒绝备份符号链接');for(const entry of readdirSync(absolute,{withFileTypes:true})){const path=rel+'/'+entry.name;if(entry.isSymbolicLink())throw new Error('拒绝备份符号链接');if(entry.isDirectory())walk(path);else add(path,join(this.dataDir,path));}};
   for(const dir of ['assets','sources','evidence'])if(existsSync(join(this.dataDir,dir)))walk(dir);
   const manifest={schemaVersion:1 as const,createdAt:new Date().toISOString(),files};zip.addFile('manifest.json',Buffer.from(JSON.stringify(manifest,null,2)));
   mkdirSync(dirname(resolve(file)),{recursive:true});const temporary=file+'.tmp';zip.writeZip(temporary);renameSync(temporary,file);return {file:resolve(file),...manifest};
  }finally{rmSync(scratch,{recursive:true,force:true});}
 }
 private load(file:string){
  if(statSync(file).size>LIMIT)throw new Error('备份包过大');const zip=new AdmZip(file);const entries=zip.getEntries();if(entries.length>100001)throw new Error('备份条目超限');
  const names=new Set<string>();let size=0;
  for(const entry of entries){const name=entry.entryName;if(names.has(name)||entry.isDirectory||(name!=='manifest.json'&&!safePath(name)))throw new Error('备份路径无效或越界');names.add(name);if(((entry.attr>>>16)&0o170000)===0o120000)throw new Error('备份含符号链接');size+=entry.header.size;if(entry.header.size>LIMIT||size>LIMIT)throw new Error('备份展开容量超限');}
  const raw=zip.getEntry('manifest.json');if(!raw||raw.header.size>16*1024*1024)throw new Error('缺少有效 manifest');const manifest=manifestSchema.parse(JSON.parse(raw.getData().toString('utf8')));
  const listed=new Set(manifest.files.map(x=>x.path));if(listed.size!==manifest.files.length||listed.size!==entries.length-1||!listed.has('study.sqlite'))throw new Error('备份清单不匹配');
  for(const record of manifest.files){if(!safePath(record.path))throw new Error('备份路径越界');const e=zip.getEntry(record.path);if(!e||e.header.size!==record.size)throw new Error('备份容量校验失败');const data=e.getData();if(data.length!==record.size||sha256(data)!==record.sha256)throw new Error('备份校验失败');}
  return {zip,manifest};
 }
 inspect(file:string){return this.load(file).manifest;}
 async restore(file:string,target:string){
  if(existsSync(target))throw new Error('恢复必须使用尚不存在的新目录');const {zip,manifest}=this.load(file);mkdirSync(dirname(resolve(target)),{recursive:true});const stage=mkdtempSync(join(dirname(resolve(target)),'.study-restore-'));
  try{
   for(const item of manifest.files){const path=join(stage,item.path);mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,zip.getEntry(item.path)!.getData(),{mode:0o600});}
   const db=new DatabaseSync(join(stage,'study.sqlite'),{readOnly:true});try{if(db.prepare('PRAGMA integrity_check').get()?.integrity_check!=='ok')throw new Error('数据库完整性校验失败');if(db.prepare('SELECT version FROM schema_version').get()?.version!==1)throw new Error('不支持的业务库版本');}finally{db.close();}
   renameSync(stage,target);return resolve(target);
  }catch(e){rmSync(stage,{recursive:true,force:true});throw e;}
 }
}
