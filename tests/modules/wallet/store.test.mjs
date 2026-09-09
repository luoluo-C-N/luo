import test from 'node:test';
import assert from 'node:assert/strict';
import { createVault } from '../../../src/core/vault.js';
import { loadEntries, saveEntries, addEntry, deleteEntry, monthlySummary, categorySummary } from '../../../src/modules/wallet/store.js';

async function makeCtx() {
  const map = new Map();
  const driver = { get: async(k)=>map.get(k)??null, set: async(k,v)=>{map.set(k,String(v));} };
  const vault = createVault({ driver, iterations: 100 });
  await vault.setMaster('pw');
  const store = { get: async(k)=>map.get(k)??null, set: async(k,v)=>{map.set(k,String(v));} };
  return { vault, ctx: { vault, store } };
}

test('收支 CRUD + 月度汇总', async () => {
  const { ctx } = await makeCtx();
  await addEntry(ctx, { type: 'income', amount: 5000, category: '工资', date: '2026-09-01' });
  await addEntry(ctx, { type: 'expense', amount: 30, category: '餐饮', date: '2026-09-05' });
  await addEntry(ctx, { type: 'expense', amount: 120, category: '交通', date: '2026-09-06' });

  const entries = await loadEntries(ctx);
  assert.equal(entries.length, 3);

  const summary = monthlySummary(entries, '2026-09');
  assert.equal(summary.income, 5000);
  assert.equal(summary.expense, 150);
  assert.equal(summary.net, 4850);
});

test('分类汇总：支出按类别排序', async () => {
  const { ctx } = await makeCtx();
  await addEntry(ctx, { type: 'expense', amount: 30, category: '餐饮', date: '2026-09-01' });
  await addEntry(ctx, { type: 'expense', amount: 120, category: '交通', date: '2026-09-02' });
  await addEntry(ctx, { type: 'expense', amount: 50, category: '餐饮', date: '2026-09-03' });

  const entries = await loadEntries(ctx);
  const cats = categorySummary(entries, 'expense');
  assert.equal(cats[0].category, '交通');
  assert.equal(cats[0].total, 120);
  assert.equal(cats[1].category, '餐饮');
  assert.equal(cats[1].total, 80);
});

test('锁定后拒绝操作', async () => {
  const map = new Map();
  const driver = { get: async()=>map.get(k)??null, set: async(k,v)=>{map.set(k,String(v));} };
  const vault = createVault({ driver, iterations: 100 });
  await vault.setMaster('pw');
  vault.lock();
  const store = { get: async()=>null, set: async()=>{} };
  await assert.rejects(() => loadEntries({ vault, store }), /已锁定/);
});

test('明文不落盘', async () => {
  const map = new Map();
  const driver = { get: async(k)=>map.get(k)??null, set: async(k,v)=>{map.set(k,String(v));} };
  const vault = createVault({ driver, iterations: 100 });
  await vault.setMaster('pw');
  const store = { get: async(k)=>map.get(k)??null, set: async(k,v)=>{map.set(k,String(v));} };
  const ctx = { vault, store };
  await addEntry(ctx, { type: 'expense', amount: 99999, category: '大额', date: '2026-09-01' });
  const raw = JSON.stringify([...map.entries()]);
  assert.ok(!raw.includes('99999'));
  assert.ok(!raw.includes('大额'));
});
