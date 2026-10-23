import {homedir} from 'node:os';import {join,resolve} from 'node:path';import {existsSync,readFileSync} from 'node:fs';
export function appPaths(options:{home?:string;dataDir?:string}={}){
 const home=resolve(options.home??(process.platform==='darwin'?join(homedir(),'Library','Application Support','pi-study'):join(homedir(),'.local','share','pi-study')));
 let selected=join(home,'spaces','default');const pointer=join(home,'current-space.json');
 if(!options.dataDir&&existsSync(pointer)){const value=JSON.parse(readFileSync(pointer,'utf8'));if(typeof value.path!=='string')throw new Error('当前空间配置无效');selected=value.path;}
 return {home,dataDir:resolve(options.dataDir??selected),financePath:join(home,'finance.sqlite'),pointer};
}
