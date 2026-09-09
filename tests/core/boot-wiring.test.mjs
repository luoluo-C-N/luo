import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeCore, makeManifest } from './helpers/fake-dom.mjs';

/** 内存 driver（createPreferencesDriver 的替身，避免依赖 localStorage） */
function memoryDriver(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get: async (k) => (map.has(k) ? map.get(k) : null),
    set: async (k, v) => { map.set(k, String(v)); },
    _map: map,
  };
}

async function boot(modules, options = {}) {
  const { bootstrap } = await import('../../src/core/index.js');
  return bootstrap({
    modules,
    mountRoot: null,
    navRoot: null,
    defaultModule: null,
    driver: memoryDriver(),
    ...createFakeCore(),
    ...options,
  });
}

test('内核登记 site / lab 两个模块，状态均为 registered', async () => {
  const { default: site } = await import('../../src/modules/site/manifest.js');
  const { default: lab } = await import('../../src/modules/lab/manifest.js');
  const core = await boot([site, lab]);
  assert.equal(core.registry.status('site'), 'registered');
  assert.equal(core.registry.status('lab'), 'registered');
});

test('故障隔离：坏模块被标记 broken，不影响其余模块登记', async () => {
  const { default: site } = await import('../../src/modules/site/manifest.js');
  const broken = makeManifest({ id: 'boom', name: '会炸的模块' });
  Object.defineProperty(broken, 'id', {
    get() { throw new Error('读取 id 就炸'); },
  });
  const core = await boot([site, broken]);
  assert.equal(core.registry.status('site'), 'registered');
  assert.equal(core.log.list().length > 0, true, '降级日志应记录坏模块');
});

test('ctx 能力按 permissions 注入（架构 §5.2）', async () => {
  const { default: site } = await import('../../src/modules/site/manifest.js');
  const { createContext } = await import('../../src/core/capabilities.js');
  const { createBus } = await import('../../src/core/bus.js');
  const ctx = createContext(site, {
    driver: memoryDriver(),
    bus: createBus(),
    doc: new (await import('./helpers/fake-dom.mjs')).FakeDocument(),
  });
  assert.equal(ctx.id, 'site');
  assert.ok(ctx.store, '声明 storage 应注入 store');
  assert.ok(ctx.net, '声明 net 应注入 net');
  assert.ok(ctx.ui && ctx.bus, 'ui / bus 始终可用');
  assert.equal(ctx.notify, undefined, '未声明 notify 不应注入');
});

test('mount 抛错时内核降级并暴露降级日志（架构 §6.2 故障隔离）', async () => {
  const throwing = makeManifest({
    id: 'throwing',
    permissions: ['storage'],
    mount() { throw new Error('mount 故意失败'); },
  });
  const core = await boot([throwing]);
  assert.equal(core.registry.status('throwing'), 'registered');
  const result = await core.router.show('throwing');
  assert.equal(result.ok, false);
  assert.equal(core.registry.status('throwing'), 'broken', '挂载失败后应标记 broken');
});
