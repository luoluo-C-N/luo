/**
 * site 模块入口 —— 装配视图 + 全局过渡层
 *
 * 本模块作为 ES Module 在 prototype.js（经典脚本）之前执行，把已迁移函数暴露到
 * globalThis，供 index.html 内联 onclick 与 prototype.js 调用。
 * 迁移完成（S7）后改为事件绑定并删除 exposeGlobals 机制。
 * 状态与来源: docs/plans/site-migration.md
 */
import * as state from './state.js';
import manifest, { siteState } from './manifest.js';
import { setTokenProvider } from './data/http.js';
import * as appearance from './theme/appearance.js';
import * as audit from './views/audit.js';
import * as auth from './views/auth.js';
import * as backup from './data/backup.js';
import * as content from './views/content.js';
import * as crud from './views/crud.js';
import * as dashboard from './views/dashboard.js';
import * as drawer from './shell/drawer.js';
import * as editor from './views/editor.js';
import * as format from './data/format.js';
import * as http from './data/http.js';
import * as music from './views/music.js';
import * as panels from './shell/panels.js';
import * as profile from './views/profile.js';
import * as rename from './theme/rename.js';
import * as status from './views/status.js';
import * as system from './views/system.js';
import * as tabbar from './shell/tabbar.js';
import * as tabs from './shell/tabs.js';
import * as util from './shell/util.js';
import * as wallpaper from './theme/wallpaper.js';

export { default as manifest } from './manifest.js';
export { siteState };

/** 认证头注入：authHeaders 已迁至 views/auth.js（S6），经过渡层可达；S6 前动态解析 */
setTokenProvider(() => (typeof globalThis.authHeaders === 'function' ? globalThis.authHeaders() : {}));

/**
 * 过渡层登记表：全局函数名 → 模块内实现（脚本自动生成，勿手改名单）。
 */
export const GLOBALS = {
  ...state.__exports__,
  ...appearance.__exports__,
  ...audit.__exports__,
  ...auth.__exports__,
  ...backup.__exports__,
  ...content.__exports__,
  ...crud.__exports__,
  ...dashboard.__exports__,
  ...drawer.__exports__,
  ...editor.__exports__,
  ...format.__exports__,
  ...http.__exports__,
  ...music.__exports__,
  ...panels.__exports__,
  ...profile.__exports__,
  ...rename.__exports__,
  ...status.__exports__,
  ...system.__exports__,
  ...tabbar.__exports__,
  ...tabs.__exports__,
  ...util.__exports__,
  ...wallpaper.__exports__,
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
