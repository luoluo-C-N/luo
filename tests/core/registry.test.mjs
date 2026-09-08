import test from 'node:test';
import assert from 'node:assert/strict';

import { createRegistry, validateManifest, PERMISSIONS } from '../../src/core/registry.js';
import { CoreErrorCode } from '../../src/core/errors.js';
import { createDegradationLog } from '../../src/core/errors.js';
import { makeManifest } from './helpers/fake-dom.mjs';

test('合法 manifest 通过校验并补全默认值', () => {
  const m = validateManifest({ id: 'task', name: '今日任务', version: '0.1.0', mount() {} });
  assert.equal(m.nav, 'tab');
  assert.equal(m.order, 100);
  assert.equal(m.icon, '🧩');
  assert.deepEqual(m.permissions, []);
});

test('id 非法 / 重复 / 版本号不合规 → broken，不抛异常', () => {
  const log = createDegradationLog();
  const registry = createRegistry({ log });

  const badId = registry.register({ ...makeManifest({ id: 'Bad_Id' }) });
  assert.equal(badId.ok, false);
  assert.equal(badId.status, 'broken');

  const badVersion = registry.register(makeManifest({ id: 'x1', version: '1.0' }));
  assert.equal(badVersion.ok, false);

  const ok = registry.register(makeManifest({ id: 'okmod' }));
  assert.equal(ok.ok, true);
  const dup = registry.register(makeManifest({ id: 'okmod' }));
  assert.equal(dup.ok, false);
  assert.equal(dup.error.includes('重复'), true);

  // 注册失败不影响已有模块
  assert.equal(registry.get('okmod').id, 'okmod');
  assert.equal(registry.status('okmod'), 'registered');
});

test('未知权限被拒；vault 必须实现 onLock', () => {
  const registry = createRegistry();

  const unknown = registry.register(makeManifest({ id: 'p1', permissions: ['root'] }));
  assert.equal(unknown.ok, false);
  assert.equal(logCode(unknown.error), CoreErrorCode.PERMISSION_UNKNOWN);

  const noLock = registry.register(makeManifest({ id: 'p2', permissions: ['vault'] }));
  assert.equal(noLock.ok, false);
  assert.equal(noLock.error.includes('onLock'), true);

  const withLock = registry.register(
    makeManifest({ id: 'p3', permissions: ['vault'], onLock() {} }),
  );
  assert.equal(withLock.ok, true);
  assert.equal(registry.hasPermission('p3', 'vault'), true);
  assert.equal(registry.hasPermission('p3', 'net'), false);
});

test('全部合法权限都可以通过', () => {
  const registry = createRegistry();
  const r = registry.register(
    makeManifest({ id: 'all', permissions: [...PERMISSIONS], onLock() {} }),
  );
  assert.equal(r.ok, true);
});

test('nav 排序：order 升序，相同则按 id；hidden 不进导航', () => {
  const registry = createRegistry();
  registry.register(makeManifest({ id: 'b', order: 20 }));
  registry.register(makeManifest({ id: 'a', order: 10 }));
  registry.register(makeManifest({ id: 'z', order: 10 }));
  registry.register(makeManifest({ id: 'h', order: 1, nav: 'hidden' }));

  const nav = registry.nav();
  assert.deepEqual(
    nav.map((m) => m.id),
    ['a', 'z', 'b'],
  );
  assert.equal(nav.some((m) => m.id === 'h'), false);
  assert.equal(registry.all().length, 4);
});

test('unregister 会调用 unmount 并移除模块', () => {
  const registry = createRegistry();
  let unmounted = 0;
  registry.register(makeManifest({ id: 'gone', unmount: () => { unmounted += 1; } }));
  assert.equal(registry.unregister('gone'), true);
  assert.equal(unmounted, 1);
  assert.equal(registry.status('gone'), 'missing');
  assert.equal(registry.unregister('gone'), false);
});

test('markBroken 把已注册模块降级，healthy() 不再返回它', () => {
  const registry = createRegistry();
  registry.register(makeManifest({ id: 'fragile' }));
  registry.markBroken('fragile', new Error('boom'));
  assert.equal(registry.status('fragile'), 'broken');
  assert.equal(registry.healthy().length, 0);
  assert.equal(registry.nav()[0].status, 'broken');
});

function logCode(message) {
  // register 返回的是 message 文本；通过关键字反查错误码语义
  const map = {
    [CoreErrorCode.PERMISSION_UNKNOWN]: '未知权限',
    [CoreErrorCode.PERMISSION_MISSING]: 'onLock',
    [CoreErrorCode.MANIFEST_DUPLICATE]: '重复',
  };
  for (const [code, keyword] of Object.entries(map)) {
    if (String(message).includes(keyword)) return code;
  }
  return null;
}
