import type {ExtensionAPI,ExtensionContext} from '@earendil-works/pi-coding-agent';
import type {Model,Api} from '@earendil-works/pi-ai';
import {OFFLINE_MODEL,OFFLINE_PROVIDER} from './provider.js';
export class ControlledSession {
 active=false;private tools:string[]=[];private model:Model<Api>|undefined;private changing=false;
 constructor(private pi:ExtensionAPI){}
 async enter(ctx:ExtensionContext){if(this.active)return;const model=ctx.modelRegistry.find(OFFLINE_PROVIDER,OFFLINE_MODEL);if(!model)throw Error('本地模型未注册');this.tools=this.pi.getActiveTools();this.model=ctx.model;this.changing=true;try{if(!await this.pi.setModel(model))throw Error('无法切换到本地模型；未进入学习态');this.pi.setActiveTools([]);this.active=true;}finally{this.changing=false;}}
 async exit(restoreModel=true){
  if(!this.active)return;
  if(restoreModel){
   this.changing=true;
   try{if(!this.model||!await this.pi.setModel(this.model))throw Error('restore rejected');}
   catch{throw Error('原模型恢复失败（可能缺少凭证）；仍保留离线学习态与禁用工具。请配置原模型凭证后重试退出，或显式选择其他模型结束受控状态。');}
   finally{this.changing=false;}
  }
  this.pi.setActiveTools(this.tools);this.active=false;
 }
 async switched(model:Model<Api>,ctx:ExtensionContext){if(this.active&&!this.changing&&(model.provider!==OFFLINE_PROVIDER||model.id!==OFFLINE_MODEL)){await this.exit(false);ctx.ui.notify('已退出受控学习：外部模型路线不受本项目预算保护。','warning');}}
}
