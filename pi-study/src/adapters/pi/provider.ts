import {createAssistantMessageEventStream,type Model,type Api,type TranscriptContext} from '@earendil-works/pi-ai';
export const OFFLINE_PROVIDER='study-offline',OFFLINE_MODEL='local-quick';
/** No fetch, credentials, remote adapter, or fallback exists in this handler. */
export function offlineStream(model:Model<Api>,_context:TranscriptContext){
 const stream=createAssistantMessageEventStream();
 const message={role:'assistant' as const,content:[{type:'text' as const,text:'本地学习模式：请使用 /study 菜单操作。受控 AI 讲解请从已提交题目的菜单单独确认。'}],api:model.api,provider:model.provider,model:model.id,usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:'stop' as const,timestamp:Date.now()};
 stream.push({type:'done',reason:'stop',message});stream.end(message);return stream;
}
