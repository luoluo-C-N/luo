/**
 * lab · 预设模块数据刷新（阶段 1-3：自动轮询 + 骨架屏 + 错误重试）
 *
 * 零代码模块创建后不是死的——按可配置间隔自动刷新数据，
 * 加载中显示骨架动画，出错显示重试按钮。
 */

const refreshTimers = new Map();

/** 清除某个模块的刷新定时器 */
export function stopRefresh(moduleId) {
  if (refreshTimers.has(moduleId)) {
    clearInterval(refreshTimers.get(moduleId));
    refreshTimers.delete(moduleId);
  }
}

/** 停止全部刷新（页面卸载时调用） */
export function stopAllRefresh() {
  for (const id of refreshTimers.keys()) stopRefresh(id);
}

/**
 * 启动自动刷新
 * @param {string} moduleId 模块 id
 * @param {Function} fetchFn 拉数据+渲染的函数
 * @param {number} [intervalMs] 刷新间隔（默认 30s，0=不自动刷新）
 */
export function startRefresh(moduleId, fetchFn, intervalMs = 30000) {
  stopRefresh(moduleId);
  if (intervalMs > 0) {
    refreshTimers.set(moduleId, setInterval(fetchFn, intervalMs));
  }
}

/** 创建骨架屏 DOM（shimmer 动画） */
export function createSkeleton(container) {
  if (!container) return;
  container.replaceChildren?.();
  for (let i = 0; i < 3; i++) {
    const line = document.createElement('div');
    line.className = 'preset-skeleton';
    line.style.width = (85 - i * 20) + '%';
    container.appendChild(line);
  }
}

/** 创建错误重试 DOM */
export function createErrorRetry(container, message, retryFn) {
  if (!container) return;
  container.replaceChildren?.();
  const err = document.createElement('div');
  err.className = 'preset-error-retry';
  const msg = document.createElement('span');
  msg.textContent = '⚠️ ' + (message ?? '加载失败');
  err.appendChild(msg);
  const btn = document.createElement('button');
  btn.className = 'preset-retry-btn';
  btn.textContent = '↻ 重试';
  btn.addEventListener('click', retryFn);
  err.appendChild(btn);
  container.appendChild(err);
}

export const __exports__ = { startRefresh, stopRefresh, stopAllRefresh, createSkeleton, createErrorRetry };
