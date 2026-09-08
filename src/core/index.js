/**
 * 内核启动入口：初始化内核 → 注册模块 → 渲染导航 → 挂载默认模块。
 *
 * 这里不允许出现任何业务语义。判断标准：新增一个模块如果需要改本文件以外
 * 的内核代码，说明设计错了。
 */

import { createBus } from './bus.js';
import { createRegistry } from './registry.js';
import { createRouter } from './router.js';
import { createContext, createPreferencesDriver } from './capabilities.js';
import { createDegradationLog } from './errors.js';

const ENABLED_KEY = 'core:enabled-modules';

/**
 * @param {{
 *   modules?: Array<any|(()=>any|Promise<any>)>,
 *   mountRoot?: Element|null,
 *   navRoot?: Element|null,
 *   doc?: Document,
 *   driver?: any,
 *   defaultModule?: string,
 *   vault?: any
 * }} [options]
 */
export async function bootstrap(options = {}) {
  const doc = options.doc ?? globalThis.document;
  const log = createDegradationLog();
  const bus = createBus();
  const registry = createRegistry({ log });
  const driver = options.driver ?? createPreferencesDriver();

  /** 逐个加载模块：任何一步失败都只影响它自己。 */
  const sources = options.modules ?? [];
  for (const source of sources) {
    try {
      const loaded = typeof source === 'function' ? await source() : await source;
      const manifest = loaded?.default ?? loaded;
      registry.register(manifest);
    } catch (error) {
      log.record('<loader>', 'register', error);
    }
  }

  /** 已启用清单（可选）。未设置时全部启用。 */
  let enabled = null;
  try {
    const raw = await driver.get(ENABLED_KEY);
    enabled = raw ? JSON.parse(raw) : null;
  } catch {
    enabled = null;
  }
  if (Array.isArray(enabled)) {
    for (const record of registry.all()) {
      if (!enabled.includes(record.manifest.id) && record.status === 'registered') {
        registry.markBroken(record.manifest.id, '模块未启用');
      }
    }
  }

  const router = createRouter({
    registry,
    makeContext: (manifest) =>
      createContext(manifest, { driver, bus, doc, vault: options.vault }),
    mountRoot: options.mountRoot ?? null,
    navRoot: options.navRoot ?? null,
    doc,
    bus,
    log,
  });

  router.renderNav();

  // 显式传 null 表示「启动后不自动挂载任何模块」（测试/嵌入场景）
  const first =
    options.defaultModule !== undefined
      ? options.defaultModule
      : registry.nav().find((m) => m.status === 'registered')?.id ?? null;
  if (first) await router.show(first);

  const core = {
    bus,
    log,
    registry,
    router,
    driver,
    /** 运行时热插拔：注册 + 重渲染导航 */
    async register(manifest) {
      const result = registry.register(manifest);
      router.renderNav();
      return result;
    },
    async setEnabled(ids) {
      await driver.set(ENABLED_KEY, JSON.stringify(ids));
    },
  };

  // 供调试与后续 devtools 使用；业务模块禁止依赖它
  globalThis.__POCKET_CORE__ = core;
  return core;
}

export { createBus, createRegistry, createRouter, createContext, createDegradationLog };
export { CoreError, CoreErrorCode } from './errors.js';
export { PERMISSIONS } from './registry.js';
