/**
 * 本架构的核心价值回归测试：
 *   任一模块加载/挂载/卸载失败，只降级它自己，其余模块照常可用。
 *
 * 这条线一旦挂了，说明内核化白做了。
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { bootstrap } from '../../src/core/index.js';
import { makeManifest, createFakeCore, createMemoryStorage } from './helpers/fake-dom.mjs';
import { createPreferencesDriver } from '../../src/core/capabilities.js';

async function boot(modules, extra = {}) {
  const { doc, mountRoot, navRoot } = createFakeCore();
  const core = await bootstrap({
    modules,
    mountRoot,
    navRoot,
    doc,
    driver: createPreferencesDriver(createMemoryStorage()),
    defaultModule: null,
    ...extra,
  });
  return { core, doc, mountRoot, navRoot };
}

test('mount 抛错 → 该模块降级，其余模块照常挂载', async () => {
  const mounted = [];
  const { core, mountRoot } = await boot([
    makeManifest({ id: 'good1', name: '正常一', mount: () => mounted.push('good1') }),
    makeManifest({
      id: 'boom',
      name: '爆炸模块',
      mount: () => {
        throw new Error('模拟模块内部崩溃');
      },
    }),
    makeManifest({ id: 'good2', name: '正常二', mount: () => mounted.push('good2') }),
  ]);

  // 三个模块都注册成功（注册阶段不执行业务代码）
  assert.equal(core.registry.size(), 3);
  assert.equal(core.registry.status('boom'), 'registered');

  await core.router.show('good1');
  await core.router.show('boom');
  await core.router.show('good2');

  // 爆炸模块被标记 broken，另外两个正常挂载
  assert.equal(core.registry.status('boom'), 'broken');
  assert.equal(core.registry.status('good1'), 'registered');
  assert.equal(core.registry.status('good2'), 'registered');
  assert.deepEqual(mounted, ['good1', 'good2']);

  // 爆炸模块的容器内画了降级卡片，且不影响别人
  const boomContainer = mountRoot.querySelector('[data-module="boom"]');
  assert.ok(boomContainer);
  assert.ok(boomContainer.querySelector('.module-degraded'));
  assert.equal(core.log.forModule('boom').length, 1);
  assert.equal(core.log.forModule('good1').length, 0);
});

test('异步 mount 失败同样只降级自己', async () => {
  const { core } = await boot([
    makeManifest({ id: 'async-boom', mount: async () => { throw new Error('async 炸'); } }),
    makeManifest({ id: 'ok', mount: () => {} }),
  ]);
  const a = await core.router.show('async-boom');
  const b = await core.router.show('ok');
  assert.equal(a.ok, false);
  assert.equal(b.ok, true);
});

test('非法 manifest 不影响合法模块注册与导航渲染', async () => {
  const { core, navRoot } = await boot([
    { id: 'Bad', name: '非法', version: '0.1.0' },
    makeManifest({ id: 'fine', name: '好的', mount: () => {} }),
  ]);
  assert.equal(core.registry.status('Bad'), 'broken');
  assert.equal(core.registry.status('fine'), 'registered');
  // broken 模块依然出现在导航上（可见但标记不可用），而不是悄悄消失
  const items = navRoot.children;
  assert.equal(items.length, 2);
  assert.equal(items.find((c) => c.dataset.module === 'Bad').classList.contains('is-broken'), true);
  assert.equal(items.find((c) => c.dataset.module === 'fine').classList.contains('is-broken'), false);
});

test('点击已损坏的导航项只显示降级卡片，不执行任何模块代码', async () => {
  let executed = false;
  const { core, mountRoot } = await boot([
    { id: 'Bad!', name: '非法', version: '0.1.0', mount: () => { executed = true; } },
  ]);
  const result = await core.router.show('Bad!');
  assert.equal(result.ok, false);
  assert.equal(executed, false);
  assert.ok(mountRoot.querySelector('[data-module="Bad!"]').querySelector('.module-degraded'));
});

test('切换 Tab 会调用上一个模块的 unmount / onHide', async () => {
  const calls = [];
  const { core } = await boot([
    makeManifest({
      id: 'm1',
      mount: () => { calls.push('mount:m1'); },
      unmount: () => { calls.push('unmount:m1'); },
      onHide: () => { calls.push('onHide:m1'); },
    }),
    makeManifest({ id: 'm2', mount: () => { calls.push('mount:m2'); } }),
  ]);

  await core.router.show('m1');
  await core.router.show('m2');
  assert.deepEqual(calls, ['mount:m1', 'unmount:m1', 'onHide:m1', 'mount:m2']);
  assert.equal(core.router.currentId, 'm2');
});

test('unmount 抛错不会阻断切换到下一个模块', async () => {
  const calls = [];
  const { core } = await boot([
    makeManifest({ id: 'sticky', unmount: () => { throw new Error('unmount 炸'); } }),
    makeManifest({ id: 'next', mount: () => { calls.push('mount:next'); } }),
  ]);
  await core.router.show('sticky');
  const result = await core.router.show('next');
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ['mount:next']);
  assert.equal(core.log.forModule('sticky').length, 1);
});

test('onShow 抛错不导致模块被判死', async () => {
  const { core } = await boot([
    makeManifest({ id: 'partial', mount: () => {}, onShow: () => { throw new Error('onShow 炸'); } }),
  ]);
  const result = await core.router.show('partial');
  assert.equal(result.ok, true, 'mount 成功即视为可用，onShow 异常只记日志');
  assert.equal(core.registry.status('partial'), 'registered');
});

test('导航点击可切换模块；模块间通过 bus 通信且失败不扩散', async () => {
  const seen = [];
  const { core, navRoot } = await boot([
    makeManifest({ id: 'sender', name: '发送方', mount: (ctx) => { ctx.bus.emit('sender:ping', 1); } }),
    makeManifest({
      id: 'receiver',
      name: '接收方',
      mount: (ctx) => {
        ctx.bus.on('sender:ping', (n) => seen.push(n));
        ctx.bus.on('sender:ping', () => { throw new Error('监听器炸'); });
      },
    }),
  ]);

  await core.router.show('sender');
  await core.router.show('receiver');
  await core.router.show('sender');
  assert.deepEqual(seen, [1]);
  assert.equal(core.bus.drainFailures().length, 1);

  navRoot.children.find((c) => c.dataset.module === 'receiver').click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(core.router.currentId, 'receiver');
});

test('未注册模块直接返回失败，不抛异常', async () => {
  const { core } = await boot([]);
  const result = await core.router.show('nope');
  assert.equal(result.ok, false);
  assert.equal(result.error.includes('未注册'), true);
});

test('enabled 清单未包含的模块被标记为不可用', async () => {
  const { core } = await boot(
    [makeManifest({ id: 'on' }), makeManifest({ id: 'off' })],
    { defaultModule: null },
  );
  await core.setEnabled(['on']);
  const rebooted = await bootstrap({
    modules: [makeManifest({ id: 'on' }), makeManifest({ id: 'off' })],
    mountRoot: null,
    navRoot: null,
    driver: core.driver,
    defaultModule: null,
  });
  assert.equal(rebooted.registry.status('on'), 'registered');
  assert.equal(rebooted.registry.status('off'), 'broken');
});

test('模块加载器（动态 import）失败只影响它自己', async () => {
  const { core } = await boot([
    () => {
      throw new Error('import 失败');
    },
    makeManifest({ id: 'survivor', mount: () => {} }),
  ]);
  assert.equal(core.registry.status('survivor'), 'registered');
  assert.equal(core.log.forModule('<loader>').length, 1);
});
