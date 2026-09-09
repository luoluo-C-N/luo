/**
 * remind · 通知中心 UI（v0.61-65）
 *
 * 渲染到 pg-notif 子页：待审列表 + 一键操作 + 通知历史
 */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}

export function renderNotifCenter(container, notifications) {
  if (!container) return;
  container.replaceChildren?.();
  container.appendChild(el('div', 'wiz-title', '通知中心'));
  if (!notifications.length) {
    container.appendChild(el('div', 'pw-empty', '🎉 没有待处理的通知'));
    return;
  }
  for (const n of notifications) {
    const card = el('div', 'notif-card' + (n.read ? ' read' : ''));
    card.appendChild(el('div', 'notif-title', n.title ?? '通知'));
    if (n.body) card.appendChild(el('div', 'notif-body', n.body));
    if (n.time) card.appendChild(el('div', 'notif-time', n.time));
    if (!n.read) {
      const markBtn = el('button', 'notif-mark', '标记已读');
      markBtn.addEventListener('click', () => { n.read = true; renderNotifCenter(container, notifications); });
      card.appendChild(markBtn);
    }
    container.appendChild(card);
  }
}

export const __exports__ = { renderNotifCenter };
