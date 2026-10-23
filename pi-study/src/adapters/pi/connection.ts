import type {ExtensionContext} from '@earendil-works/pi-coding-agent';
import type {StudyApp} from '../../composition.js';
import {configuredProfiles} from '../../budget/config.js';
import {isTrustedMenu} from './input.js';

/** Inspect local readiness only. Never send a provider request or open the financial ledger. */
export async function showConnectionStatus(app:StudyApp,ctx:ExtensionContext):Promise<void>{
 if(!isTrustedMenu(ctx)){
  ctx.ui.notify('请从真实 TUI 学习菜单查看连接状态；此处未读取凭证。','warning');
  return;
 }
 let credential:string;
 try{
  const key=await ctx.modelRegistry.getApiKeyForProvider('deepseek');
  credential=key
   ?'DeepSeek 凭证：已配置。'
   :'DeepSeek 凭证：未找到可用凭证，请在 Pi 中配置 deepseek；本地刷题仍可继续。';
 }catch{
  // Credential resolvers may include secrets or shell commands in their errors.
  credential='DeepSeek 凭证：读取失败，请检查 Pi 凭证配置；这不是服务器连接测试，本地刷题仍可继续。';
 }
 let pricing:string;
 try{
  const {generation}=configuredProfiles(app.getSetting);
  pricing=`受控讲解模型：${generation.model}。\n费率配置可用；价格变动时手动更新费率数字。`;
 }catch{
  pricing=`费率配置无效，受控 AI 暂不可用；核查官方价格并更新费率后可重试，本地刷题仍可继续。`;
 }
 ctx.ui.notify([
  '学习态宿主：local-quick（本地离线）。底栏模型名不表示 DeepSeek 的连接状态。',
  credential,
  '未进行实时连接测试；本次状态查询不发送模型请求、不扣预算。',
  pricing,
  '真正联网：当前题目须已提交或明确揭晓，再选择“受控 AI 讲解”或“手动资料查证”，确认费用后才发起请求。'
 ].join('\n'),'info');
}
