/**
 * wallet · 图表渲染（v0.41-45）
 * 月度支出柱状图 + 分类饼图数据 + 趋势箭头
 */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}

/** 月度支出柱状图（最近 6 个月） */
export function renderMonthlyChart(container, monthlyData) {
  if (!container) return;
  container.replaceChildren?.();
  container.appendChild(el('div', 'wiz-label', '最近 6 个月支出'));
  const bars = el('div', 'wallet-chart');
  const max = Math.max(...monthlyData.map((d) => d.expense), 1);
  for (const d of monthlyData) {
    const col = el('div', 'wallet-chart-col');
    const bar = el('div', 'wallet-chart-bar');
    bar.style.height = Math.max(4, Math.round((d.expense / max) * 80)) + 'px';
    col.appendChild(bar);
    col.appendChild(el('span', 'wallet-chart-label', d.month.slice(5)));
    col.appendChild(el('span', 'wallet-chart-val', '¥' + d.expense.toFixed(0)));
    bars.appendChild(col);
  }
  container.appendChild(bars);
}

/** 趋势箭头（对比上月） */
export function trendArrow(current, previous) {
  if (!previous) return { arrow: '', text: '无上月数据', color: 'var(--ink-3)' };
  const diff = current - previous;
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : 0;
  if (diff > 0) return { arrow: '↑', text: `+${pct}%`, color: 'var(--red)' };
  if (diff < 0) return { arrow: '↓', text: `${pct}%`, color: 'var(--green)' };
  return { arrow: '→', text: '持平', color: 'var(--ink-3)' };
}

export const __exports__ = { renderMonthlyChart, trendArrow };
