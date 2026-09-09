/**
 * password · 密码强度检查 + 分类分组（v0.51-55）
 */
export function checkStrength(password) {
  if (!password) return { score: 0, label: '空', color: 'var(--ink-3)' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (password.length >= 16) score++;
  if (score <= 2) return { score, label: '弱', color: 'var(--red)' };
  if (score <= 4) return { score, label: '中', color: 'var(--orange)' };
  return { score, label: '强', color: 'var(--green)' };
}

/** 按分类分组密码条目 */
export function groupByCategory(entries) {
  const map = new Map();
  for (const e of entries) {
    const cat = e.category ?? '默认';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(e);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

export const __exports__ = { checkStrength, groupByCategory };
