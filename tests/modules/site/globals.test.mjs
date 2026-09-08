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

test('S1 阶段过渡层为空（函数尚未迁入，禁止提前暴露空实现）', () => {
  assert.deepEqual(Object.keys(GLOBALS), [],
    'GLOBALS 应随 S2-S7 迁移逐步填充；S1 必须为空');
});
