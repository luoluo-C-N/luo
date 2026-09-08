/**
 * views/auth —— 登录/游客/退出（迁移步 S6）
 * 待迁函数：skipLogin(1424) doLogin(1425) logout(1533) setAuthMode oauthTry
 * ⚠️ 注意：这些函数物理上位于"自编译模块系统"区块内（区块交错），按函数 grep 定位
 * 事件：登录态失效时 emit 'site:auth-expired'（内核统一登出）
 * 验收：SITE-FR6；游客模式可进；401 保留未提交草稿
 */
export async function mount() { /* TODO(S6) */ }
export function unmount() { /* TODO(S6) */ }
