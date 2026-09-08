/**
 * 路由与容器 —— Tab/子页切换、模块挂载与卸载。
 *
 * 隔离保证：
 * - 每个模块独占一个容器 `<section class="module" data-module="{id}">`
 * - 切换 = 卸载上一个（unmount/onHide）+ 清空容器 + 挂载下一个
 * - mount 抛错 → 只标记该模块 broken 并在容器内画降级卡片，其余模块照常
 *
 * 路由不 import 任何模块内部文件，只通过 registry 拿 manifest。
 */

import { attempt, guard } from './errors.js';

/**
 * @param {{
 *   registry: ReturnType<import('./registry.js').createRegistry>,
 *   makeContext: (m:any)=>any,
 *   mountRoot: Element|null,
 *   navRoot?: Element|null,
 *   doc?: Document,
 *   bus?: any,
 *   log?: ReturnType<import('./errors.js').createDegradationLog>,
 *   defaultModule?: string
 * }} options
 */
export function createRouter(options) {
  const doc = options.doc ?? globalThis.document;
  const { registry, makeContext, bus, log } = options;

  /** @type {{id:string|null, ctx:any, manifest:any}} */
  let current = { id: null, ctx: null, manifest: null };
  /** @type {Map<string, any>} */
  const contexts = new Map();

  function containerFor(id) {
    const existing = options.mountRoot?.querySelector?.(`[data-module="${id}"]`);
    if (existing) return existing;
    const section = doc.createElement('section');
    section.className = 'module';
    section.dataset.module = id;
    options.mountRoot?.appendChild(section);
    return section;
  }

  function degradeCard(id, message) {
    const box = doc.createElement('div');
    box.className = 'module-degraded';
    box.dataset.module = id;
    box.innerHTML =
      `<div class="module-degraded__icon">⚠️</div>` +
      `<div class="module-degraded__title">该模块暂时不可用</div>` +
      `<div class="module-degraded__hint">其他功能不受影响</div>`;
    if (message) box.title = message;
    return box;
  }

  async function unmount(id) {
    if (!id) return;
    const manifest = registry.get(String(id));
    if (!manifest) return;
    const ctx = contexts.get(String(id));
    await guard(String(id), 'unmount', () => manifest.unmount?.(ctx), { log });
    await guard(String(id), 'unmount', () => manifest.onHide?.(ctx), { log });
    bus?.emit('module:hidden', { id });
  }

  const api = {
    /** 当前挂载的模块 id。 */
    get currentId() {
      return current.id;
    },

    /** 渲染导航项（由 registry 动态生成，index.html 不再硬编码 Tab）。 */
    renderNav() {
      const root = options.navRoot;
      if (!root) return [];
      root.innerHTML = '';
      const items = registry.nav();
      for (const item of items) {
        const btn = doc.createElement('button');
        btn.className = 'nav-item';
        btn.type = 'button';
        btn.dataset.module = item.id;
        btn.dataset.status = item.status;
        if (item.status === 'broken') {
          btn.disabled = false; // 保留可见性，点击后展示降级卡片
          btn.classList.add('is-broken');
          btn.title = item.error || '模块加载失败';
        }
        btn.innerHTML = `<span class="nav-item__icon">${item.icon ?? '🧩'}</span><span class="nav-item__name">${item.name}</span>`;
        btn.addEventListener('click', () => api.show(item.id));
        root.appendChild(btn);
      }
      return items;
    },

    /**
     * 切换到指定模块。
     * @param {string} id
     * @returns {Promise<{ok:boolean, id:string, error?:string}>}
     */
    async show(id) {
      const manifest = registry.get(id);
      if (!manifest) {
        return { ok: false, id, error: `模块未注册：${id}` };
      }

      // 0. 注册阶段就已损坏的模块：直接给降级卡片，不执行任何模块代码
      if (registry.status(id) === 'broken') {
        const reason = registry.errorOf(id) || '模块不可用';
        const brokenBox = containerFor(id);
        brokenBox.replaceChildren?.();
        brokenBox.appendChild(degradeCard(id, reason));
        bus?.emit('module:degraded', { id, message: reason });
        current = { id, ctx: null, manifest };
        return { ok: false, id, error: reason };
      }

      // 1. 卸载上一个（失败不影响切换）
      if (current.id && current.id !== id) {
        await unmount(current.id);
        options.mountRoot
          ?.querySelector?.(`[data-module="${current.id}"]`)
          ?.replaceChildren?.();
      }

      // 2. 准备容器与上下文
      const container = containerFor(id);
      container.replaceChildren?.();
      let ctx = contexts.get(id);
      if (!ctx) {
        ctx = makeContext(manifest);
        contexts.set(id, ctx);
      }

      // 3. 挂载（失败 → 降级）
      const result = await attempt(id, 'mount', () => manifest.mount?.(ctx), { log });
      if (!result.ok) {
        registry.markBroken(id, result.error.message);
        container.appendChild(degradeCard(id, result.error.message));
        bus?.emit('module:degraded', { id, message: result.error.message });
        current = { id, ctx, manifest };
        options.navRoot?.querySelector?.(`[data-module="${id}"]`)?.classList.add('is-broken');
        return { ok: false, id, error: result.error.message };
      }

      await guard(id, 'mount', () => manifest.onShow?.(ctx), { log });
      current = { id, ctx, manifest };
      bus?.emit('module:shown', { id });
      return { ok: true, id };
    },

    /** 卸载当前模块（App 退后台/销毁时调用）。 */
    async destroy() {
      await unmount(current.id);
      contexts.clear();
      current = { id: null, ctx: null, manifest: null };
    },

    /** 测试与调试用：当前已建立的上下文。 */
    contextOf(id) {
      return contexts.get(id) ?? null;
    },
  };

  return api;
}
