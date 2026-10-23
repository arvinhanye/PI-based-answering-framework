#!/usr/bin/env node
import {access,mkdir,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const kind=fileURLToPath(import.meta.url).split('/').at(-1).replace('.mjs','');
const moduleURL=new URL(`../dist/import/converters/${kind}.js`,import.meta.url);
try {await access(moduleURL);}catch{console.error('缺少构建产物。请先在 pi-study 目录运行 npm run build。');process.exit(2);}
const args=process.argv.slice(2),path=args[0];const oi=args.indexOf('--output');
if(!path||oi<0||!args[oi+1]){console.error(`usage: node converters/${kind}.mjs SOURCE --output OUTPUT.json`);process.exit(2);}
const outputPath=resolve(args[oi+1]),outputDir=dirname(outputPath);await mkdir(outputDir,{recursive:true});
try {const mod=await import(moduleURL.href);const fn=mod[{ 'first-docx':'convertFirstDocx','province-docx':'convertProvinceDocx','pdf':'convertPdf'}[kind]];const r=await fn({path:resolve(path),outputDir});if(resolve(r.outputPath)!==outputPath)await rename(r.outputPath,outputPath);console.log(JSON.stringify({outputPath,...r.bank.report},null,2));}catch(e){console.error(e.message);process.exit(1);}
