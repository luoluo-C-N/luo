/**
 * sync 模块 —— 云同步（v0.12 骨架）
 *
 * 推送本地加密数据到后端 / 从后端拉取。
 * 当前实现：骨架 API + 冲突策略（last-write-wins）。
 * 后续：增量同步、断点续传、多端合并。
 */
export default {
  id: 'sync',
  name: '同步',
  icon: '☁️',
  version: '0.1.0',
  nav: 'hidden',
  order: 90,
  permissions: ['storage', 'net'],
  async mount(ctx) { syncState.ctx = ctx; },
  unmount() { syncState.ctx = null; },
};

export const syncState = { ctx: null, lastPush: null, lastPull: null };

/** 推送本地数据到后端 */
export async function push(ctx, key, data) {
  const base = globalThis.API_BASE ?? '';
  const fetcher = globalThis.jfetch ?? globalThis.fetch;
  await fetcher(base + '/api/sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, data, timestamp: Date.now() }),
  });
  syncState.lastPush = Date.now();
}

/** 从后端拉取数据 */
export async function pull(ctx, key) {
  const base = globalThis.API_BASE ?? '';
  const fetcher = globalThis.jfetch ?? globalThis.fetch;
  const raw = await fetcher(base + '/api/sync/pull?key=' + encodeURIComponent(key));
  const data = globalThis.unwrap ? globalThis.unwrap(raw) : raw;
  syncState.lastPull = Date.now();
  return data ?? null;
}

/** 双向同步：本地有则推，远端有则拉，冲突取时间戳较新者 */
export async function sync(ctx, key, localData, localTs) {
  const remote = await pull(ctx, key);
  if (!remote) { await push(ctx, key, localData); return localData; }
  if (!localData) return remote.data;
  // last-write-wins
  return remote.timestamp > (localTs ?? 0) ? remote.data : localData;
}

export const __exports__ = { push, pull, sync };
