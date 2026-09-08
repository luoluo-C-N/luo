import test from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../../../src/modules/site/manifest.js';

test('site manifest 符合架构 ModuleManifest 契约（架构设计-v1.0 §5.1）', () => {
  assert.equal(typeof manifest.id, 'string');
  assert.match(manifest.id, /^[a-z]+$/, 'id 必须全小写字母');
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/, 'version 必须语义化');
  assert.ok(['tab', 'tool', 'hidden'].includes(manifest.nav), 'nav 必须是三种形态之一');
  assert.equal(typeof manifest.name, 'string');
  assert.equal(typeof manifest.icon, 'string');
  assert.equal(typeof manifest.mount, 'function');
});

test('site 权限声明与功能设计 §4.1 一致', () => {
  const legal = ['storage', 'net', 'notify', 'vault', 'files'];
  for (const p of manifest.permissions ?? []) {
    assert.ok(legal.includes(p), `未登记的权限: ${p}`);
  }
  assert.deepEqual([...(manifest.permissions ?? [])].sort(), ['net', 'storage']);
});

test('声明 vault 必须实现 onLock（site 未声明，不应强制）', () => {
  if (manifest.permissions?.includes('vault')) {
    assert.equal(typeof manifest.onLock, 'function');
  }
});

test('mount/unmount 幂等可调用（空 ctx 不崩溃）', async () => {
  await manifest.mount({});
  manifest.unmount?.();
  await manifest.mount({});
  manifest.unmount?.();
});
