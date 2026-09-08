/**
 * views/audit —— 审核收件箱（迁移步 S4）
 * 待迁函数：refreshAudit(881) auditCard(892) renderRealAudit(925) auditAct(935) auditDel(2500) renderDone(2511)
 * ⚠️ 解除 prototype.js:1980 对 window.renderRealAudit 的猴子补丁，改为显式事件
 * 事件：emit 'site:pending-changed' {count, byType}（remind 模块订阅）
 * 验收：SITE-FR4；通过/删除真实生效；子级内联审核可操作
 */
export async function mount() { /* TODO(S4) */ }
export function unmount() { /* TODO(S4) */ }
