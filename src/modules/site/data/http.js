/**
 * site · 网络层数据模块（迁移步 S2）
 * 来源：src/prototype.js 1944-1970 逐字迁移（docs/plans/site-migration.md §3）。
 *
 * 与原文的差异（唯一）：authHeaders 由模块内注入点提供——原实现引用 prototype.js
 * 顶层函数 authHeaders()（1423 行，留在原地，S6 迁 auth 视图时再动）。
 * site/index.js 在装载时把 globalThis.authHeaders 注入为 tokenProvider，运行时行为不变。
 *
 * 本文件是全项目【唯一】允许出现后端默认地址字面量的地方（CI 守卫允许清单）。
 */

/** 后端默认地址：唯一豁免点。优先级：localStorage pocket.server > 此默认值 */
const DEFAULT_BACKEND = 'http://localhost:8000';

let tokenProvider = () => ({});

/**
 * 注入认证头提供者（由 site/index.js 装载时调用）。
 * @param {() => Record<string,string>} fn 返回 {Authorization: "..."} 或 {}
 */
export function setTokenProvider(fn) {
  tokenProvider = typeof fn === 'function' ? fn : () => ({});
}

function authHeaders() {
  let h = null;
  try { h = tokenProvider(); } catch { h = null; }
  return h && typeof h === 'object' ? h : {};
}

/** 前台（Next.js :3000）基址：/images 相对路径由此解析 */
export function frontBase() {
  try { var v = localStorage.getItem('pocket.front'); if (v) return v.replace(/\/$/, ''); } catch (e) {}
  return 'http://localhost:3000';
}

/** 后端基址：localStorage pocket.server > DEFAULT_BACKEND */
export function backBase() {
  try { var v = localStorage.getItem('pocket.server'); if (v) return v.replace(/\/$/, ''); } catch (e) {}
  return DEFAULT_BACKEND;
}

/** 媒体地址解析：绝对地址原样；/images 走前台；其余走后端（契约：api-contracts.md） */
export function imgSrc(u) {
  u = String(u || '');
  if (!u) return '';
  if (u.indexOf('http') === 0) return u;
  if (u.indexOf('/images') === 0) return frontBase() + u;
  return backBase() + u;
}

/**
 * 统一请求：自动带认证头；401/403 映射为可读文案；混合包装交由 unwrap 处理。
 * 逐字迁移自 prototype.js（除 authHeaders 注入点）。
 */
export function jfetch(url, opts) {
  opts = opts || {};
  if (!(opts.body instanceof FormData)) opts.headers = Object.assign({ 'Content-Type': 'application/json' }, authHeaders(), opts.headers || {});
  else opts.headers = Object.assign({}, authHeaders(), opts.headers || {});
  return fetch(url, opts).then(function (r) {
    return r.text().then(function (t) {
      var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
      if (!r.ok) {
        var m = (j && (j.detail || j.message)) || ('HTTP ' + r.status);
        if (r.status === 401) m = '未登录或登录已过期，请先登录';
        if (r.status === 403 && /authenticated|权限/.test(m)) m = '需要管理员登录后才能操作';
        var err = new Error(m); err.status = r.status; throw err;
      }
      return j;
    });
  });
}

/** 响应解包：{code,data} 包装与裸数组/对象双形状兼容（契约：api-contracts.md「没有统一包装」） */
export function unwrap(j) {
  if (j && typeof j === 'object' && ('code' in j)) {
    if (j.code !== 0) throw new Error(j.message || '请求失败');
    return j.data;
  }
  return j;
}
