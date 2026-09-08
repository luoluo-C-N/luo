/**
 * 能力出口 —— 模块唯一入口。
 *
 * 模块拿到的 ctx 里，只出现它在 permissions 里声明过的能力；
 * 未声明的能力在 ctx 中根本不存在（而不是存在但报错），从类型层面杜绝越权。
 *
 * @typedef {Object} ModuleContext
 * @property {string} id
 * @property {{get(k:string):Promise<any>, set(k:string,v:any):Promise<void>, remove(k:string):Promise<void>, keys():Promise<string[]>}} store
 * @property {{request(path:string,opts?:RequestInit):Promise<any>, base():string, setBase(v:string):void}} net
 * @property {{toast(msg:string):void, confirm(msg:string):Promise<boolean>, card(html:string):Element, esc(s:string):string}} ui
 * @property {{schedule(opt:any):Promise<boolean>, cancel(ids:any):Promise<void>}} notify
 * @property {{on(e:string,fn:Function):()=>void, emit(e:string,data?:any):{delivered:number,errors:number}}} bus
 * @property {any} [vault]  仅 permissions 含 'vault' 时注入
 */

import { CoreError, CoreErrorCode } from './errors.js';

/* ---------------------------------- 存储 ---------------------------------- */

/**
 * 默认驱动：浏览器 localStorage。无 localStorage 时退化为内存（不抛错）。
 * @param {Storage|undefined} [ls]
 */
export function createPreferencesDriver(ls = globalThis.localStorage) {
  const fallback = new Map();
  const store = ls ?? {
    getItem: (k) => (fallback.has(k) ? fallback.get(k) : null),
    setItem: (k, v) => fallback.set(k, String(v)),
    removeItem: (k) => fallback.delete(k),
    key: (i) => Array.from(fallback.keys())[i] ?? null,
    get length() {
      return fallback.size;
    },
  };

  return {
    async get(key) {
      const raw = store.getItem(key);
      return raw === null ? null : raw;
    },
    async set(key, value) {
      store.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    async remove(key) {
      store.removeItem(key);
    },
    async keys() {
      const out = [];
      for (let i = 0; i < store.length; i += 1) {
        const k = store.key(i);
        if (k) out.push(k);
      }
      return out;
    },
  };
}

/**
 * 带命名空间前缀的存储视图。前缀 `mod:{id}:`，模块之间不可能互相覆盖。
 * 值以 JSON 存取，读取失败（脏数据）返回 null 而不是崩溃。
 */
export function createStore(moduleId, driver) {
  const prefix = `mod:${moduleId}:`;

  async function get(key) {
    const raw = await driver.get(prefix + key);
    if (raw === null || raw === undefined) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return {
    async get(key) {
      return get(key);
    },
    async set(key, value) {
      await driver.set(prefix + key, JSON.stringify(value));
    },
    async remove(key) {
      await driver.remove(prefix + key);
    },
    async keys() {
      const all = await driver.keys();
      return all.filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
    },
    /** 仅供内核/测试使用：清空本模块全部数据 */
    async clear() {
      const keys = await this.keys();
      for (const k of keys) await driver.remove(prefix + k);
    },
    prefix,
  };
}

/* ---------------------------------- 网络 ---------------------------------- */

/**
 * 后端基址解析优先级：显式配置 > window.POCKET_BASE > localStorage['pocket.server'] > 同源相对路径。
 * 消灭一切硬编码 http://localhost:8000。
 */
export function resolveBase() {
  const g = globalThis;
  if (typeof g.POCKET_BASE === 'string' && g.POCKET_BASE) return g.POCKET_BASE.replace(/\/$/, '');
  try {
    const saved = g.localStorage?.getItem('pocket.server');
    if (saved) return saved.replace(/\/$/, '');
  } catch {
    /* 隐私模式下 localStorage 可能不可用 */
  }
  return '';
}

/**
 * @param {{fetchImpl?:typeof fetch, getBase?:()=>string}} [options]
 */
export function createNet(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
  const getBase = options.getBase ?? resolveBase;
  let override = null;

  function base() {
    return override ?? getBase();
  }

  function buildUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    const b = base();
    if (!b) return path.startsWith('/') ? path : `/${path}`;
    return b + (path.startsWith('/') ? path : `/${path}`);
  }

  return {
    base,
    setBase(value) {
      override = (value || '').replace(/\/$/, '');
    },
    /**
     * @param {string} path
     * @param {RequestInit & {json?:any, raw?:boolean}} [opts]
     */
    async request(path, opts = {}) {
      if (typeof fetchImpl !== 'function') {
        throw new CoreError(CoreErrorCode.CAPABILITY_DENIED, '当前环境不支持 fetch');
      }
      const { json, raw, ...init } = opts;
      const headers = new Headers(init.headers || {});
      if (json !== undefined) {
        headers.set('content-type', 'application/json');
        init.body = JSON.stringify(json);
      }
      const response = await fetchImpl(buildUrl(path), { ...init, headers });
      if (raw) return response;
      const text = await response.text();
      let data = text;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        /* 非 JSON 响应原样返回文本 */
      }
      if (!response.ok) {
        throw new CoreError(
          CoreErrorCode.MODULE_RUNTIME,
          `请求 ${path} 失败：HTTP ${response.status}`,
          { cause: data },
        );
      }
      return data;
    },
  };
}

/* ----------------------------------- UI ----------------------------------- */

/**
 * @param {{doc?:Document, container?:()=>Element|null}} [options]
 */
export function createUi(moduleId, options = {}) {
  const doc = options.doc ?? globalThis.document;

  return {
    esc(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /** 生成一张模块私有样式的卡片元素（自带 .mod-{id} 命名空间类）。 */
    card(html) {
      const el = doc.createElement('div');
      el.className = `mod-${moduleId} mod-card`;
      el.innerHTML = html;
      return el;
    },

    toast(message) {
      if (typeof globalThis.__coreToast === 'function') globalThis.__coreToast(String(message));
      else console.log(`[${moduleId}] ${message}`);
    },

    async confirm(message) {
      if (typeof globalThis.confirm === 'function') return globalThis.confirm(String(message));
      return false;
    },
  };
}

/* --------------------------------- 通知 ---------------------------------- */

/** 优先走 Capacitor 插件；非原生环境（浏览器/测试）降级为 no-op 并返回 false。 */
export function createNotify() {
  function plugin() {
    return globalThis.Capacitor?.Plugins?.LocalNotifications ?? null;
  }
  return {
    async schedule(options) {
      const p = plugin();
      if (!p) {
        console.warn('[core] 当前环境无本地通知能力，schedule 已忽略');
        return false;
      }
      await p.schedule({ notifications: [options] });
      return true;
    },
    async cancel(ids) {
      const p = plugin();
      if (!p) return;
      await p.cancel({ notifications: Array.isArray(ids) ? ids.map((id) => ({ id })) : [{ id: ids }] });
    },
  };
}

/* --------------------------------- 装配 ---------------------------------- */

/**
 * 按 manifest 的 permissions 装配 ctx。未声明的能力不出现在 ctx 上。
 *
 * @param {import('./registry.js').ModuleManifest} manifest
 * @param {{driver?:any, bus?:any, doc?:Document, fetchImpl?:typeof fetch, vault?:any}} [deps]
 * @returns {ModuleContext}
 */
export function createContext(manifest, deps = {}) {
  const driver = deps.driver ?? createPreferencesDriver();
  const bus = deps.bus;
  const ctx = { id: manifest.id, name: manifest.name };

  const perms = new Set(manifest.permissions ?? []);

  if (perms.has('storage')) ctx.store = createStore(manifest.id, driver);
  if (perms.has('net')) ctx.net = createNet({ fetchImpl: deps.fetchImpl });
  if (perms.has('notify')) ctx.notify = createNotify();
  if (perms.has('vault')) {
    // v0.03 前 vault 未就绪：声明了却拿不到 → 直接不注入，模块应自行降级
    ctx.vault = deps.vault ?? null;
  }
  ctx.ui = createUi(manifest.id, { doc: deps.doc });
  ctx.bus = bus;

  return ctx;
}
