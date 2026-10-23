#!/usr/bin/env node
import {runCli,renderCli} from './commands.js';
try{const result=await runCli(process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):renderCli(result));}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
