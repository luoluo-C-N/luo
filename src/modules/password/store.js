/**
 * password · 加密 CRUD（v0.06 核心）
 *
 * 存储结构：localStorage['pw:vault'] = JSON.stringify({ iv, ct })
 * 解密后得到 [{id,title,username,password,url,notes,created_at}]
 *
 * 依赖：ctx.vault（内核注入），如果 vault 未解锁则所有操作抛错。
 */

const STORE_KEY = 'pw:vault';

function getVault(ctx) {
  if (!ctx?.vault) throw new Error('vault 不可用（未声明权限或内核未启动）');
  if (!ctx.vault.isUnlocked()) throw new Error('保险库已锁定，请先解锁');
  return ctx.vault;
}

/** 读取全部条目（需解锁） */
export async function loadEntries(ctx) {
  const vault = getVault(ctx);
  const store = ctx.store;
  const raw = await store.get(STORE_KEY);
  if (!raw) return [];
  return vault.decrypt(JSON.parse(raw));
}

/** 保存全部条目（加密落盘） */
export async function saveEntries(ctx, entries) {
  const vault = getVault(ctx);
  const record = await vault.encrypt(entries);
  await ctx.store.set(STORE_KEY, JSON.stringify(record));
  return true;
}

/** 新增条目 */
export async function addEntry(ctx, entry) {
  const entries = await loadEntries(ctx);
  const item = {
    id: 'pw-' + Date.now().toString(36),
    title: entry.title ?? '',
    username: entry.username ?? '',
    password: entry.password ?? '',
    url: entry.url ?? '',
    notes: entry.notes ?? '',
    created_at: new Date().toISOString(),
  };
  entries.push(item);
  await saveEntries(ctx, entries);
  return item;
}

/** 更新条目 */
export async function updateEntry(ctx, id, patch) {
  const entries = await loadEntries(ctx);
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error('条目不存在');
  Object.assign(entries[idx], patch);
  await saveEntries(ctx, entries);
  return entries[idx];
}

/** 删除条目 */
export async function deleteEntry(ctx, id) {
  const entries = await loadEntries(ctx);
  const filtered = entries.filter((e) => e.id !== id);
  await saveEntries(ctx, filtered);
  return true;
}

/** 搜索条目（标题/用户名/URL 模糊匹配） */
export function searchEntries(entries, query) {
  if (!query) return entries;
  const q = query.toLowerCase();
  return entries.filter((e) =>
    (e.title ?? '').toLowerCase().includes(q) ||
    (e.username ?? '').toLowerCase().includes(q) ||
    (e.url ?? '').toLowerCase().includes(q)
  );
}

export const __exports__ = { loadEntries, saveEntries, addEntry, updateEntry, deleteEntry, searchEntries };
