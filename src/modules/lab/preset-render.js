/**
 * lab · 预设渲染引擎（v0.04 完成）
 *
 * 把零代码向导的产物（render:'preset' 的模块定义）变成可见的 DOM。
 * 与 renderTplModule（代码模式）并列为两种渲染路径。
 *
 * 数据流：fetch(api) → unwrap → applyBinding(path+transform+formatter) → 按 kind 渲染
 * 安全性：全部 createElement + textContent，不用 innerHTML 拼数据。
 */

import { applyBinding } from './binding.js';
import { startRefresh, stopRefresh, createSkeleton, createErrorRetry } from './refresh.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

/** 拉取模块数据并应用绑定，返回格式化后的值/数组 */
async function fetchBound(m) {
  const base = globalThis.API_BASE ?? '';
  const url = base + (m.data.api ?? '');
  const fetcher = globalThis.jfetch ?? globalThis.fetch;
  const raw = await fetcher(url);
  const data = globalThis.unwrap ? globalThis.unwrap(raw) : raw;
  return applyBinding(
    {
      path: m.data.path,
      transform: m.data.transform,
      transformParam: m.data.transformParam,
      formatter: m.data.formatter,
    },
    data
  );
}

/** 执行动作按钮 */
async function runAction(actionId, baseApi, row, onDone) {
  const defs = {
    approve: { method: 'PUT', suffix: '/status', body: { status: 'approved' } },
    reject: { method: 'PUT', suffix: '/status', body: { status: 'rejected' } },
    delete: { method: 'DELETE' },
    togglePin: { method: 'PUT', body: { is_pinned: !row.is_pinned } },
  };
  const def = defs[actionId];
  if (!def) return;
  const url = (globalThis.API_BASE ?? '') + baseApi + '/' + row.id + (def.suffix ?? '');
  const opts = { method: def.method, headers: { 'Content-Type': 'application/json' } };
  if (def.body) opts.body = JSON.stringify(def.body);
  const fetcher = globalThis.jfetch ?? globalThis.fetch;
  await fetcher(url, opts);
  if (onDone) onDone();
}

/** 各形态渲染（接收绑定后的值/数组，返回 DOM 节点） */
const RENDERERS = {
  stat(values, m) {
    const v = Array.isArray(values) ? values[0] : values;
    const card = el('div', 'preset-stat');
    card.appendChild(el('div', 'preset-stat-label', m.title));
    card.appendChild(el('div', 'preset-stat-value', String(v ?? '—')));
    return card;
  },

  status(values, m) {
    const v = Array.isArray(values) ? values[0] : values;
    const isOn = v === true || v === 'online' || v === 'running' || v === 'ok' || Number(v) > 50;
    const card = el('div', 'preset-status');
    const dot = el('span', 'preset-dot' + (isOn ? ' on' : ''));
    card.appendChild(dot);
    card.appendChild(el('span', 'preset-status-text', String(v ?? '—')));
    return card;
  },

  progress(values, m) {
    const v = Math.max(0, Math.min(100, Number(Array.isArray(values) ? values[0] : values) || 0));
    const wrap = el('div', 'preset-progress');
    wrap.appendChild(el('div', 'preset-progress-label', m.title));
    const bar = el('div', 'preset-progress-bar');
    const fill = el('div', 'preset-progress-fill');
    fill.style.width = v + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);
    wrap.appendChild(el('div', 'preset-progress-pct', v + '%'));
    return wrap;
  },

  list(values, m) {
    const wrap = el('div', 'preset-list');
    wrap.appendChild(el('div', 'preset-list-title', m.title));
    if (!Array.isArray(values) || !values.length) {
      wrap.appendChild(el('div', 'preset-empty', '暂无数据'));
      return wrap;
    }
    for (const item of values.slice(0, 10)) {
      wrap.appendChild(el('div', 'preset-list-item', String(item ?? '')));
    }
    return wrap;
  },

  dynlist(values, m) {
    const wrap = el('div', 'preset-list');
    wrap.appendChild(el('div', 'preset-list-title', m.title));
    if (!Array.isArray(values) || !values.length) {
      wrap.appendChild(el('div', 'preset-empty', '暂无数据'));
      return wrap;
    }
    for (const item of values.slice(0, 10)) {
      const row = el('div', 'preset-list-item clickable');
      row.appendChild(el('span', '', String(item ?? '')));
      row.appendChild(el('span', 'preset-arrow', '›'));
      wrap.appendChild(row);
    }
    return wrap;
  },

  chart(values, m) {
    const wrap = el('div', 'preset-chart');
    wrap.appendChild(el('div', 'preset-list-title', m.title));
    if (!Array.isArray(values) || !values.length) {
      wrap.appendChild(el('div', 'preset-empty', '暂无数据'));
      return wrap;
    }
    const nums = values.map(Number).filter(Number.isFinite);
    const max = Math.max(...nums, 1);
    const bars = el('div', 'preset-bars');
    for (const n of nums.slice(0, 12)) {
      const barCol = el('div', 'preset-bar-col');
      const bar = el('div', 'preset-bar');
      bar.style.height = Math.max(4, Math.round((n / max) * 80)) + 'px';
      barCol.appendChild(bar);
      barCol.appendChild(el('span', 'preset-bar-val', String(n)));
      bars.appendChild(barCol);
    }
    wrap.appendChild(bars);
    return wrap;
  },

  toggle(values, m) {
    const v = Array.isArray(values) ? values[0] : values;
    const wrap = el('div', 'preset-toggle-row');
    wrap.appendChild(el('span', 'preset-toggle-label', m.title));
    const track = el('div', 'preset-toggle' + (v ? ' on' : ''));
    track.appendChild(el('div', 'preset-toggle-knob'));
    track.addEventListener('click', () => track.classList.toggle('on'));
    wrap.appendChild(track);
    return wrap;
  },
};

/** 主入口：渲染一个 preset 模块到网格容器 */
export function renderPresetModule(m, grid) {
  const card = el('div', 'preset-card preset-' + (m.kind ?? 'stat'));
  card.appendChild(el('div', 'preset-title', m.title ?? ''));

  const body = el('div', 'preset-body');
  createSkeleton(body);
  card.appendChild(body);
  grid.appendChild(card);

  stopRefresh(m.id);
  fetchBound(m)
    .then((values) => {
      startRefresh(m.id, () => renderPresetModule(m, grid), 30000);
      body.replaceChildren?.();
      const renderer = RENDERERS[m.kind] ?? RENDERERS.stat;
      body.appendChild(renderer(values, m));

      // 动作按钮（仅 list/dynlist 形态且有 action）
      if (m.action && m.action !== 'none' && ['list', 'dynlist'].includes(m.kind) && Array.isArray(values)) {
        const sourceApi = m.data.api.replace(/\?.*$/, '');
        values.slice(0, 10).forEach((item, index) => {
          const itemEl = body.querySelectorAll?.('.preset-list-item')?.[index];
          if (!itemEl) return;
          const btn = el('button', 'preset-action', actionLabel(m.action));
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            runAction(m.action, sourceApi, { id: index + 1 }, () => {
              btn.textContent = '✓';
              btn.disabled = true;
            }).catch(() => {
              btn.textContent = '✗';
            });
          });
          itemEl.appendChild(btn);
        });
      }
    })
    .catch((error) => {
      createErrorRetry(body, error.message ?? '加载失败', () => renderPresetModule(m, grid));
    });
}

function actionLabel(actionId) {
  const labels = { approve: '✓ 通过', reject: '✕ 拒绝', delete: '🗑', togglePin: '📌' };
  return labels[actionId] ?? actionId;
}

export const __exports__ = { renderPresetModule };
