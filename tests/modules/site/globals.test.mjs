import test from 'node:test';
import assert from 'node:assert/strict';
import { exposeGlobals, GLOBALS } from '../../../src/modules/site/index.js';

test('exposeGlobals 把登记表暴露到目标全局对象', () => {
  const fake = {};
  const restore = exposeGlobals({ tg: () => 1, closeSub: () => 2 }, fake);
  assert.equal(typeof fake.tg, 'function');
  assert.equal(fake.tg(), 1);
  assert.equal(fake.closeSub(), 2);
  restore();
  assert.ok(!('tg' in fake), 'restore 后应删除新增键');
  assert.ok(!('closeSub' in fake), 'restore 后应删除新增键');
});

test('exposeGlobals 覆盖已有键时 restore 应还原旧值', () => {
  const fake = { toast: () => 'old' };
  const restore = exposeGlobals({ toast: () => 'new' }, fake);
  assert.equal(fake.toast(), 'new');
  restore();
  assert.equal(fake.toast(), 'old');
});

test('restore 幂等：重复调用不抛错', () => {
  const fake = {};
  const restore = exposeGlobals({ a: () => {} }, fake);
  restore();
  assert.doesNotThrow(restore);
});

test('S2 data 层 13 个全局函数已在过渡层中（随迁移递增的超集断言）', () => {
  const dataLayer = ['backBase', 'cnt', 'emptyCard', 'esc', 'escAttr', 'fdate', 'frontBase',
    'imgSrc', 'jfetch', 'lerrEl', 'slugify', 'toastErr', 'unwrap'];
  for (const k of dataLayer) {
    assert.ok(k in GLOBALS, `过渡层缺少 data 层函数: ${k}`);
  }
});

test('过渡层暴露的函数与模块导出同一实例（改一处即全局生效）', async () => {
  const { default: site } = await import('../../../src/modules/site/index.js');
  const { jfetch } = await import('../../../src/modules/site/data/http.js');
  assert.equal(site.GLOBALS.jfetch, jfetch);
});
