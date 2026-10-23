/** SDK source survives upstream transforms; it is never an authorization token. */
export function isTrustedMenu(ctx:{mode:string;hasUI:boolean}) {return ctx.mode==='tui'&&ctx.hasUI;}
export async function interceptInput(active:boolean,notify:()=>void,_source?:string){if(!active)return {action:'continue' as const};try{notify();}catch{}return {action:'handled' as const};}
