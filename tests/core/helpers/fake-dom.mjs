/**
 * 极简 DOM 替身，仅覆盖内核用到的 API。
 * 目的：让 router 的挂载/卸载/降级逻辑能在 node:test 下无浏览器验证。
 */

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
  }
  add(...names) {
    names.forEach((n) => this.owner._classes.add(n));
  }
  remove(...names) {
    names.forEach((n) => this.owner._classes.delete(n));
  }
  contains(name) {
    return this.owner._classes.has(name);
  }
  toggle(name, force) {
    const on = force === undefined ? !this.contains(name) : force;
    if (on) this.add(name);
    else this.remove(name);
    return on;
  }
}

export class FakeElement {
  constructor(tag = 'div') {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.dataset = {};
    this.title = '';
    this.innerHTML = '';
    this.type = '';
    this.disabled = false;
    this.parentNode = null;
    this.listeners = new Map();
    this._classes = new Set();
    this.classList = new FakeClassList(this);
  }

  get className() {
    return Array.from(this._classes).join(' ');
  }

  set className(value) {
    this._classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  replaceChildren(...nodes) {
    this.children = nodes;
    nodes.forEach((n) => {
      n.parentNode = this;
    });
  }

  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }

  dispatch(type, event = {}) {
    (this.listeners.get(type) ?? []).forEach((fn) => fn(event));
  }

  click() {
    this.dispatch('click', { target: this });
  }

  /** 支持 `[data-module="x"]` 与 `.cls`；深度优先。 */
  querySelector(selector) {
    const match = parseSelector(selector);
    if (!match) return null;
    for (const child of this.children) {
      if (match(child)) return child;
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(selector) {
    const match = parseSelector(selector);
    if (!match) return [];
    const out = [];
    for (const child of this.children) {
      if (match(child)) out.push(child);
      out.push(...child.querySelectorAll(selector));
    }
    return out;
  }

  /** 测试断言用：容器内是否出现降级卡片。 */
  get text() {
    return this.innerHTML;
  }
}

export class FakeDocument {
  createElement(tag) {
    return new FakeElement(tag);
  }
}

function parseSelector(selector) {
  const attr = selector.match(/^\[data-([a-z-]+)="([^"]+)"\]$/);
  if (attr) {
    const key = attr[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return (el) => el.dataset?.[key] === attr[2];
  }
  const cls = selector.match(/^\.([a-z0-9_-]+)$/i);
  if (cls) return (el) => el._classes.has(cls[1]);
  return null;
}

/** 内存版 Storage，供 capabilities 的 driver 使用。 */
export function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
    _map: map,
  };
}

/** 造一个合法的 manifest，测试里按需覆盖字段。 */
export function makeManifest(overrides = {}) {
  return {
    id: 'demo',
    name: '演示模块',
    icon: '🧩',
    version: '0.1.0',
    nav: 'tab',
    order: 100,
    permissions: [],
    mount() {},
    ...overrides,
  };
}

export function createFakeCore() {
  const doc = new FakeDocument();
  const mountRoot = doc.createElement('main');
  const navRoot = doc.createElement('nav');
  return { doc, mountRoot, navRoot };
}
