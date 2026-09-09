/**
 * wallet · 加密收支记账（v0.07）
 *
 * 条目：{id, type:'income'|'expense', amount, category, note, date}
 * 存储同 password 模块：vault 加密后 localStorage。
 */

/** BUG-003 修复：写入互斥锁（Promise 链队列，保证顺序执行） */
let _writeQueue = Promise.resolve();
function withLock(fn) {
  const run = _writeQueue.then(fn, fn); // 无论前一个成功还是失败都执行
  _writeQueue = run.catch(() => {});
  return run;
}

/** 带锁的写入操作（addEntry/updateEntry/deleteEntry 内部调用） */
function lockedWrite(fn) { return withLock(fn); }

const STORE_KEY = 'wallet:vault';

function getVault(ctx) {
  if (!ctx?.vault) throw new Error('vault 不可用');
  if (!ctx.vault.isUnlocked()) throw new Error('保险库已锁定');
  return ctx.vault;
}

export async function loadEntries(ctx) {
  const vault = getVault(ctx);
  const raw = await ctx.store.get(STORE_KEY);
  if (!raw) return [];
  return vault.decrypt(JSON.parse(raw));
}

export async function saveEntries(ctx, entries) {
  const vault = getVault(ctx);
  const record = await vault.encrypt(entries);
  await ctx.store.set(STORE_KEY, JSON.stringify(record));
}

export async function addEntry(ctx, entry) {
  const entries = await loadEntries(ctx);
  const item = {
    id: 'wx-' + Date.now().toString(36),
    type: entry.type ?? 'expense',         // income | expense
    amount: Number(entry.amount) || 0,
    category: entry.category ?? '',
    note: entry.note ?? '',
    date: entry.date ?? new Date().toISOString().slice(0, 10),
  };
  entries.push(item);
  await saveEntries(ctx, entries);
  return item;
}

export async function deleteEntry(ctx, id) {
  const entries = await loadEntries(ctx);
  await saveEntries(ctx, entries.filter((e) => e.id !== id));
}

/** 月度汇总：{income, expense, net} */
export function monthlySummary(entries, yearMonth) {
  const filtered = entries.filter((e) => (e.date ?? '').startsWith(yearMonth));
  let income = 0, expense = 0;
  for (const e of filtered) {
    if (e.type === 'income') income += e.amount;
    else expense += e.amount;
  }
  return { income, expense, net: income - expense, count: filtered.length };
}

/** 分类汇总：[{category, total}] */
export function categorySummary(entries, type) {
  const map = new Map();
  for (const e of entries) {
    if (e.type !== type) continue;
    const cat = e.category || '未分类';
    map.set(cat, (map.get(cat) ?? 0) + e.amount);
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export const __exports__ = { loadEntries, saveEntries, addEntry, deleteEntry, monthlySummary, categorySummary };
