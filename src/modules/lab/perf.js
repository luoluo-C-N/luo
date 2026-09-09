/**
 * lab · 性能与安全增强（v0.36-40）
 *
 * - 简易 rate limiter（防止 API 滥用）
 * - 输入清洗（XSS 防线）
 * - 防抖（搜索/滚动）
 * - 模块加载耗时追踪
 */

/** 简易 rate limiter：每 windowMs 最多 max 次 */
export function createRateLimiter(max = 30, windowMs = 60000) {
  const calls = [];
  return {
    check() {
      const now = Date.now();
      while (calls.length && calls[0] < now - windowMs) calls.shift();
      if (calls.length >= max) return false;
      calls.push(now);
      return true;
    },
    get remaining() {
      const now = Date.now();
      while (calls.length && calls[0] < now - windowMs) calls.shift();
      return max - calls.length;
    },
  };
}

/** 输入清洗：移除 HTML 标签 + 裁剪 + 限长 */
export function sanitizeInput(input, maxLen = 500) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLen);
}

/** 防抖 */
export function debounce(fn, wait = 300) {
  let timer = 0;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/** 模块加载耗时追踪 */
const perfLog = [];
export function trackModuleLoad(moduleId, startMs) {
  const duration = Date.now() - startMs;
  perfLog.push({ moduleId, duration, at: new Date().toISOString() });
  if (perfLog.length > 50) perfLog.shift();
  return duration;
}

export function getPerfLog() {
  return perfLog.slice();
}

export const __exports__ = { createRateLimiter, sanitizeInput, debounce, trackModuleLoad, getPerfLog };
