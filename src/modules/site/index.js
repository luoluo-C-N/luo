/**
 * site 模块入口 —— 装配视图 + 全局过渡层
 *
 * S1 仅含骨架与过渡层；视图按 docs/plans/site-migration.md S3-S7 逐步迁入。
 * 迁移期间 index.html 的 154 个内联 onclick 依赖全局函数（约 40 个），
 * 由 exposeGlobals 提供过渡：每迁入一个函数，就在 manifest 级的 GLOBALS
 * 映射中登记一行；S7 后改为事件绑定并删除本机制（PROCESS 中已列 TODO）。
 */
import manifest, { siteState } from './manifest.js';

export { default as manifest } from './manifest.js';
export { siteState };

/** 过渡层登记表：全局函数名 → 模块内实现。S1 为空，随 S2-S7 迁入填充。 */
export const GLOBALS = {};

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

export default { manifest, GLOBALS, exposeGlobals, siteState };
