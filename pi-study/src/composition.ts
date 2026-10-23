import {mkdirSync,writeFileSync,renameSync} from 'node:fs';import {randomUUID} from 'node:crypto';
import {StudyStore} from './storage/business.js';import {BankService} from './banks/service.js';import {StudyService} from './study/service.js';import {StatisticsService} from './review/statistics.js';import {ReviewService} from './review/service.js';import {JsonImporter} from './import/json.js';import {BackupService} from './backup/service.js';import {BudgetService} from './budget/service.js';import {appPaths} from './storage/paths.js';
export function createApp(options:{home?:string;dataDir?:string}={}){
 const paths=appPaths(options);mkdirSync(paths.home,{recursive:true,mode:0o700});const store=new StudyStore(paths.dataDir);
 store.db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
 const banks=new BankService(store),study=new StudyService(store);
 let financial:BudgetService|undefined;
 return {...paths,store,banks,study,stats:new StatisticsService(store),review:new ReviewService(store),importer:new JsonImporter(banks,paths.dataDir),backup:new BackupService(store,paths.dataDir),
  get budget(){return financial??=BudgetService.open({path:paths.financePath,initialize:true});},
  getSetting(key:string):string|undefined{return store.db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value as string|undefined;},
  setSetting(key:string,value:string){store.db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value);},
  selectSpace(path:string){const temp=paths.pointer+'.'+randomUUID()+'.tmp';writeFileSync(temp,JSON.stringify({path}),{mode:0o600});renameSync(temp,paths.pointer);},
  close(){financial?.close();store.close();}
 };
}
export type StudyApp=ReturnType<typeof createApp>;
