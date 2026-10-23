/** Narrow page-notice detection. Mentions inside an ordinary document are not enough. */
export function unavailablePageReason(title: string, content: string): string | undefined {
    const normalize = (value: string) => value.trim().replace(/^#{1,6}\s+/, '').replace(/\s+/g, ' ');
    const notice = (value: string): string | undefined => {
        const text = normalize(value);
        if (/^(?:404|403|401|410)(?:$|\s|[-:|])/i.test(text))
            return 'HTTP-style error page';
        if (/^(?:page\s+not\s+found|not\s+found|access\s+denied|forbidden|unauthorized|login(?:\s+required)?|(?:please\s+)?log\s*in(?:\s+to\s+continue)?|sign\s+in(?:\s+to\s+continue)?|log\s*in(?:\s+to\s+continue)?|session\s+expired|content\s+(?:is\s+)?(?:unavailable|expired|removed)|(?:this\s+)?(?:page|content)\s+(?:is\s+)?(?:unavailable|expired|removed))(?:[.!]?|\s*[-|–—]\s*.{1,80})$/i.test(text))
            return 'unavailable or authentication notice';
        if (/^(?:(?:对不起|抱歉)[，,:：!！。\s]*)?(?:您(?:所)?访问的)?(?:网页|页面|内容|资源|链接)(?:到期|过期)?(?:已|已经)?(?:下架|不存在|被删除|删除|失效|不可用|无法访问|过期|到期)(?:[。.!！]?|\s*[-|–—]\s*.{1,80})$/.test(text))
            return '内容下架、失效或不存在';
        if (/^(?:访问被拒绝|拒绝访问|无权访问|没有访问权限|登录|用户登录|账号登录|账户登录|请先登录|请登录后(?:再)?(?:访问|查看)|登录后(?:继续|访问|查看))(?:[。.!！]?|\s*[-|–—]\s*.{1,80})$/.test(text))
            return '访问受限或要求登录';
        return undefined;
    };
    const titleReason = notice(title);
    if (titleReason)
        return 'title: ' + titleReason;
    // Only a leading notice can classify the body. Later paragraphs may legitimately
    // discuss error pages, and must never make an otherwise normal paper unavailable.
    const firstLine = content.split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? '';
    const bodyReason = notice(firstLine);
    return bodyReason ? 'leading content: ' + bodyReason : undefined;
}
