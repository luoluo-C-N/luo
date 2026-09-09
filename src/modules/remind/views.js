/**
 * remind · 通知中心（v0.61-65 完整视图）
 *
 * 渲染到 pg-notif：从后端拉取待审数据（评论/留言/说说评论），显示通知列表。
 */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}

export async function renderNotifPage(container) {
  if (!container) container = document.getElementById('notifContainer');
  if (!container) return;
  container.replaceChildren?.();

  container.appendChild(el('div', 'preset-loading', '⏳ 加载中…'));

  try {
    const base = globalThis.API_BASE ?? '';
    const fetcher = globalThis.jfetch ?? globalThis.fetch;
    const headers = typeof globalThis.authHeaders === 'function' ? globalThis.authHeaders() : {};

    const sources = [
      { name: '📝 待审评论', url: base + '/api/comments/admin?status=pending&size=5' },
      { name: '💬 待审留言', url: base + '/api/messages/admin?status=pending&size=5' },
      { name: '🗣 说说评论', url: base + '/api/chatters/comments/admin?status=pending&size=5' },
    ];

    container.replaceChildren?.();
    let hasData = false;

    for (const src of sources) {
      try {
        const raw = await fetcher(src.url, { headers });
        const data = globalThis.unwrap ? globalThis.unwrap(raw) : raw;
        const rows = Array.isArray(data) ? data : [];
        if (!rows.length) continue;
        hasData = true;

        const section = el('div', 'notif-section');
        section.appendChild(el('div', 'wiz-label', src.name + ` (${rows.length})`));
        for (const row of rows.slice(0, 5)) {
          const card = el('div', 'notif-card');
          card.appendChild(el('div', 'notif-body', String(row.content ?? row.body ?? '').slice(0, 60)));
          if (row.created_at) card.appendChild(el('div', 'notif-time', row.created_at));
          section.appendChild(card);
        }
        container.appendChild(section);
      } catch { /* 该数据源不可用，跳过 */ }
    }

    if (!hasData) {
      container.appendChild(el('div', 'pw-empty', '🎉 没有待处理的通知'));
    }
  } catch (error) {
    container.replaceChildren?.();
    container.appendChild(el('div', 'pw-locked', '⚠️ ' + (error.message ?? '加载失败') + '（后端可能未启动）'));
  }
}

export const __exports__ = { renderNotifPage, renderNotifCenter };

/** 兼容旧接口：渲染通知列表（简单版本） */
export function renderNotifCenter(container, notifications) {
  if (!container) return;
  container.replaceChildren?.();
  if (!notifications?.length) {
    container.appendChild(el('div', 'pw-empty', '🎉 没有待处理的通知'));
    return;
  }
  for (const n of notifications) {
    const card = el('div', 'notif-card' + (n.read ? ' read' : ''));
    card.appendChild(el('div', 'notif-title', n.title ?? '通知'));
    if (n.body) card.appendChild(el('div', 'notif-body', n.body));
  }
}
