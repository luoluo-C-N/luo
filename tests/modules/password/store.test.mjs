import test from 'node:test';
import assert from 'node:assert/strict';
import { createVault } from '../../../src/core/vault.js';
import { loadEntries, saveEntries, addEntry, updateEntry, deleteEntry, searchEntries } from '../../../src/modules/password/store.js';

/** 内存 driver + 已解锁的 vault + ctx */
async function makeCtx() {
  const map = new Map();
  const driver = {
    get: async (k) => (map.has(k) ? map.get(k) : null),
    set: async (k, v) => { map.set(k, String(v)); },
  };
  const vault = createVault({ driver, iterations: 1000 });
  await vault.setMaster('test-master');
  const store = {
    get: async (k) => (map.has(k) ? map.get(k) : null),
    set: async (k, v) => { map.set(k, String(v)); },
  };
  return { vault, ctx: { vault, store } };
}

test('vault 未解锁时操作全部拒绝', async () => {
  const map = new Map();
  const driver = { get: async()=>null, set: async()=>{} };
  const vault = createVault({ driver, iterations: 100 });
  await vault.setMaster('pw');
  vault.lock();
  const store = { get: async()=>null, set: async()=>{} };
  const ctx = { vault, store };
  await assert.rejects(() => loadEntries(ctx), /已锁定/);
  await assert.rejects(() => saveEntries(ctx, []), /已锁定/);
});

test('无 vault 权限时操作拒绝', async () => {
  await assert.rejects(() => loadEntries({ vault: null }), /vault 不可用/);
});

test('新增→读取→更新→删除 全链路', async () => {
  const { ctx } = await makeCtx();

  const item = await addEntry(ctx, { title: 'GitHub', username: 'luo', password: 'gh_123' });
  assert.ok(item.id.startsWith('pw-'));
  assert.equal(item.title, 'GitHub');

  let entries = await loadEntries(ctx);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].password, 'gh_123');

  await updateEntry(ctx, item.id, { password: 'new_pass' });
  entries = await loadEntries(ctx);
  assert.equal(entries[0].password, 'new_pass');

  await deleteEntry(ctx, item.id);
  entries = await loadEntries(ctx);
  assert.equal(entries.length, 0);
});

test('落盘数据不含明文密码（加密验证）', async () => {
  const map = new Map();
  const driver = { get: async(k)=>map.get(k)??null, set: async(k,v)=>{map.set(k,String(v));} };
  const vault = createVault({ driver, iterations: 100 });
  await vault.setMaster('pw');
  const store = { get: async(k)=>map.get(k)??null, set: async(k,v)=>{map.set(k,String(v));} };
  const ctx = { vault, store };

  await addEntry(ctx, { title: 'Bank', password: 'super_secret_123' });
  const raw = JSON.stringify([...map.entries()]);
  assert.ok(!raw.includes('super_secret_123'), '落盘数据不得包含明文密码');
  assert.ok(!raw.includes('Bank'), '落盘数据不得包含明文标题');
});

test('搜索：标题/用户名/URL 模糊匹配', () => {
  const entries = [
    { title: 'GitHub', username: 'luo', url: 'https://github.com' },
    { title: '银行', username: 'admin', url: 'https://bank.cn' },
    { title: '邮箱', username: 'test@gmail.com', url: '' },
  ];
  assert.equal(searchEntries(entries, 'git').length, 1);
  assert.equal(searchEntries(entries, 'bank').length, 1);
  assert.equal(searchEntries(entries, 'gmail').length, 1);
  assert.equal(searchEntries(entries, 'zzz').length, 0);
  assert.equal(searchEntries(entries, '').length, 3);
});
