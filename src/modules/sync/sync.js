/**
 * sync · 同步实现（v0.66-70）
 *
 * push/pull/sync 完整实现（last-write-wins 策略）
 * 加密数据全量推送（后续升级为增量）
 */
export async function doPush(ctx, key, data) {
  const base = globalThis.API_BASE ?? '';
  const fetcher = globalThis.jfetch ?? globalThis.fetch;
  const body = { key, data: JSON.stringify(data), timestamp: Date.now() };
  await fetcher(base + '/api/sync/push', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, typeof globalThis.authHeaders === 'function' ? globalThis.authHeaders() : {}),
    body: JSON.stringify(body),
  });
  return Date.now();
}

export async function doPull(ctx, key) {
  const base = globalThis.API_BASE ?? '';
  const fetcher = globalThis.jfetch ?? globalThis.fetch;
  const headers = typeof globalThis.authHeaders === 'function' ? globalThis.authHeaders() : {};
  const raw = await fetcher(base + '/api/sync/pull?key=' + encodeURIComponent(key), { headers });
  const result = globalThis.unwrap ? globalThis.unwrap(raw) : raw;
  return result ?? null;
}

/** 双向同步：远端新则用远端，本地新则推本地 */
export async function bidirectional(ctx, key, localData, localTs) {
  try {
    const remote = await doPull(ctx, key);
    if (!remote || !remote.data) {
      if (localData) await doPush(ctx, key, localData);
      return { data: localData, direction: 'pushed' };
    }
    if (!localData) return { data: JSON.parse(remote.data), direction: 'pulled' };
    if (remote.timestamp > (localTs ?? 0)) {
      return { data: JSON.parse(remote.data), direction: 'pulled' };
    }
    await doPush(ctx, key, localData);
    return { data: localData, direction: 'pushed' };
  } catch (e) {
    return { data: localData, direction: 'offline', error: e.message };
  }
}

export const __exports__ = { doPush, doPull, bidirectional };
