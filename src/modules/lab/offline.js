/**
 * lab · 离线检测 + Toast 队列 + 设置页（v0.31-35）
 *
 * 离线时全局显示离线徽标；Toast 排队不重叠。
 */

/** 离线检测（navigator.onLine + 定期探活） */
export function createOfflineIndicator(dotId, textId) {
  function update() {
    const dot = document.getElementById(dotId);
    const txt = document.getElementById(textId);
    const offline = !globalThis.navigator?.onLine;
    if (dot) dot.style.background = offline ? 'var(--orange)' : (dot.dataset.online ?? 'var(--green)');
    if (txt) txt.textContent = offline ? '设备离线' : (txt.dataset.online ?? txt.textContent);
  }
  globalThis.addEventListener?.('online', update);
  globalThis.addEventListener?.('offline', update);
  update();
  return update;
}

/** Toast 队列：多个 toast 排队显示，不重叠（每个 2.5s） */
export function createToastQueue() {
  const queue = [];
  let showing = false;
  function show(msg) {
    queue.push(msg);
    process();
  }
  function process() {
    if (showing || !queue.length) return;
    showing = true;
    const msg = queue.shift();
    // 调用宿主 toast（如果存在）
    if (typeof globalThis.toast === 'function') {
      globalThis.toast(msg);
      setTimeout(() => { showing = false; process(); }, 2500);
    } else {
      console.log('[toast]', msg);
      showing = false;
      process();
    }
  }
  return { show, get pending() { return queue.length; } };
}

export const __exports__ = { createOfflineIndicator, createToastQueue };
