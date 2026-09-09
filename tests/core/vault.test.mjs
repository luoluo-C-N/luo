import test from 'node:test';
import assert from 'node:assert/strict';
import { createVault } from '../../src/core/vault.js';

/** 内存 driver（与 capabilities 的 Preferences driver 同形状） */
function memoryDriver() {
  const map = new Map();
  return {
    get: async (k) => (map.has(k) ? map.get(k) : null),
    set: async (k, v) => { map.set(k, String(v)); },
    _map: map,
  };
}

test('初始状态：未设置主密码、处于锁定', async () => {
  const vault = createVault({ driver: memoryDriver() });
  assert.equal(await vault.isSet(), false);
  assert.equal(vault.isUnlocked(), false);
});

test('设置主密码后解锁：正确密码通过、错误密码返回 false', async () => {
  const vault = createVault({ driver: memoryDriver(), iterations: 1000 });
  await vault.setMaster('correct horse');
  assert.equal(await vault.isSet(), true);
  assert.equal(vault.isUnlocked(), true);

  vault.lock();
  assert.equal(await vault.unlock('wrong password'), false);
  assert.equal(vault.isUnlocked(), false, '密码错误不应解锁');

  assert.equal(await vault.unlock('correct horse'), true);
  assert.equal(vault.isUnlocked(), true);
});

test('加解密往返：对象数据完整还原', async () => {
  const vault = createVault({ driver: memoryDriver(), iterations: 1000 });
  await vault.setMaster('pw');
  const payload = { title: '工行卡', password: 'secret-123', tags: ['银行'] };
  const record = await vault.encrypt(payload);
  assert.ok(record.iv && record.ct, '应返回 iv + 密文');
  assert.ok(!record.ct.includes('secret-123'), '密文不得包含明文');
  assert.deepEqual(await vault.decrypt(record), payload);
});

test('锁定后不可加解密，且内存密钥已丢弃', async () => {
  const vault = createVault({ driver: memoryDriver(), iterations: 1000 });
  await vault.setMaster('pw');
  const record = await vault.encrypt({ a: 1 });
  vault.lock();
  await assert.rejects(() => vault.encrypt({ b: 2 }), /已锁定/);
  await assert.rejects(() => vault.decrypt(record), /已锁定/);
});

test('主密码只存盐与校验密文，明文永不落盘', async () => {
  const driver = memoryDriver();
  const vault = createVault({ driver, iterations: 1000 });
  await vault.setMaster('super-secret');
  const dumped = JSON.stringify([...driver._map.entries()]);
  assert.ok(!dumped.includes('super-secret'), '明文密码不得出现在存储中');
  assert.ok(dumped.includes('vault:salt'));
  assert.ok(dumped.includes('vault:verify'));
});
