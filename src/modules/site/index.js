/**
 * site 模块入口 —— 装配视图 + 全局过渡层
 *
 * S2 起承担运行时职责：本模块作为 ES Module 在 prototype.js（经典脚本）之前执行，
 * 把 data 层函数暴露到 globalThis，供 index.html 内联 onclick 与 prototype.js 调用。
 * 迁移完成（S7）后改为事件绑定并删除 exposeGlobals 机制。
 */
import manifest, { siteState } from './manifest.js';
import * as http from './data/http.js';
import * as fmt from './data/format.js';
import { setTokenProvider } from './data/http.js';

export { default as manifest } from './manifest.js';
export { siteState };

/** 认证头注入：authHeaders 仍定义在 prototype.js（S6 迁 auth 视图），此处动态解析 */
setTokenProvider(() => (typeof globalThis.authHeaders === 'function' ? globalThis.authHeaders() : {}));

/**
 * 过渡层登记表：全局函数名 → 模块内实现。
 * 已迁入：S2（data 层 13 个）。后续随 S3-S7 迁移逐步填充。
 */
export const GLOBALS = {
  // S2 · data/format.js
  esc: fmt.esc,
  escAttr: fmt.escAttr,
  fdate: fmt.fdate,
  slugify: fmt.slugify,
  cnt: fmt.cnt,
  emptyCard: fmt.emptyCard,
  lerrEl: fmt.lerrEl,
  toastErr: fmt.toastErr,
  // S2 · data/http.js
  jfetch: http.jfetch,
  unwrap: http.unwrap,
  frontBase: http.frontBase,
  backBase: http.backBase,
  imgSrc: http.imgSrc,
};

/**
 * 把登记表暴露到全局对象（index.html 内联 onclick 的兼容层）。
 * @param {Record<string, Function>} map 全局函数名 → 实现
 * @param {object} [target] 目标全局对象（默认 globalThis，测试可注入假对象）
 * @returns {() => void} restore —— 恢复调用前的全局状态（含删除新增键）
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
