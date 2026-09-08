/**
 * site 模块入口 —— 装配视图 + 全局过渡层
 *
 * 本模块作为 ES Module 在 prototype.js（经典脚本）之前执行，把已迁移函数暴露到
 * globalThis，供 index.html 内联 onclick 与 prototype.js 调用。
 * 迁移完成（S7）后改为事件绑定并删除 exposeGlobals 机制。
 * 状态与来源: docs/plans/site-migration.md
 */
import manifest, { siteState } from './manifest.js';
import { setTokenProvider } from './data/http.js';
import * as format from './data/format.js';
import * as http from './data/http.js';
import * as status from './views/status.js';

export { default as manifest } from './manifest.js';
export { siteState };

/** 认证头注入：authHeaders 已迁至 views/auth.js（S6），经过渡层可达；S6 前动态解析 */
setTokenProvider(() => (typeof globalThis.authHeaders === 'function' ? globalThis.authHeaders() : {}));

/**
 * 过渡层登记表：全局函数名 → 模块内实现（脚本自动生成，勿手改名单）。
 */
export const GLOBALS = {
  ...format.__exports__,
  ...http.__exports__,
  ...status.__exports__,
};

/**
 * 把登记表暴露到全局对象（index.html 内联 onclick 的兼容层）。
 */
export function exposeGlobals(map, target) {
  const g = target ?? globalThis;
  const prev = new Map();
  for (const [name, fn] of Object.entries(map)) {
    prev.set(name, Object.prototype.hasOwnProperty.call(g, name) ? g[name] : undefined);
    g[name] = fn;
  }
  return function restore() {
    for (const [name, old] of prev) {
      if (old === undefined) delete g[name];
      else g[name] = old;
    }
  };
}

// 模块装载即生效：本模块在 prototype.js 之前执行，暴露必须先于其顶层代码
exposeGlobals(GLOBALS);

export default { manifest, GLOBALS, exposeGlobals, siteState };
