/**
 * lab · 零代码创建向导（v0.04 · 依据 ADR-0002）
 *
 * 与旧流程的本质区别：
 *  - 旧：选模板 → 写代码（HTML/CSS/JS 三标签编辑器）
 *  - 新：选形态 → 选数据源 → **点样例数据里的值** → 选格式化 → 选动作 → 完成
 *
 * 用户全程看不到 `data.rows.0.title` 这类表达式，只看到中文面包屑。
 * 代码编辑器保留为逃生舱（lab/editor.js），不作为主路径。
 */

import { DATA_SOURCES, getSource } from './sources.js';
import { describePath, isSafePath, resolvePath, FORMATTERS, TRANSFORMS } from './binding.js';

/** 七种形态：与 lab 模板渲染一一对应 */
export const FORMS = [
  { id: 'stat', name: '数值卡片', icon: '📊', hint: '显示一个数字' },
  { id: 'status', name: '状态徽章', icon: '🟢', hint: '在线/离线状态' },
  { id: 'progress', name: '进度条', icon: '📊', hint: '百分比或占用' },
  { id: 'list', name: '文本列表', icon: '📝', hint: '多条内容' },
  { id: 'dynlist', name: '动态列表', icon: '🔗', hint: '可点击跳转' },
  { id: 'chart', name: '图表', icon: '📈', hint: '分布或趋势' },
  { id: 'toggle', name: '开关', icon: '🔄', hint: '切换布尔值' },
];

/** 动作预设：绑定在列表项的按钮上（架构 §9.2 动作绑定） */
export const ACTIONS = [
  { id: 'none', name: '不需要', needId: false },
  { id: 'approve', name: '✓ 通过', method: 'PUT', path: '/status', body: { status: 'approved' }, needId: true },
  { id: 'reject', name: '✕ 拒绝', method: 'PUT', path: '/status', body: { status: 'rejected' }, needId: true },
  { id: 'delete', name: '🗑 删除', method: 'DELETE', needId: true },
  { id: 'togglePin', name: '📌 置顶', method: 'PUT', body: { is_pinned: true }, needId: true },
];

export const STEPS = ['形态', '数据源', '字段', '格式化', '动作'];

/** 初始状态 */
export function createDraft() {
  return {
    step: 0,
    form: null,
    sourceId: null,
    path: null,
    formatter: 'none',
    transform: 'none',
    transformParam: null,
    action: 'none',
    sample: null,      // 样例数据（数组）
    title: '',
  };
}

/** 逐步推进；返回新状态（纯函数，便于测试） */
export function nextStep(state) {
  if (state.step >= STEPS.length - 1) return state;
  return { ...state, step: state.step + 1 };
}

export function prevStep(state) {
  if (state.step <= 0) return state;
  return { ...state, step: state.step - 1 };
}

/** 当前步骤是否可以进入下一步 */
export function canAdvance(state) {
  switch (state.step) {
    case 0: return Boolean(state.form);
    case 1: return Boolean(state.sourceId);
    case 2: return Boolean(state.path) && isSafePath(state.path);
    case 3: return true;
    case 4: return true;
    default: return false;
  }
}

/** 建议的字段：按形态偏好的类型排序，常用在前 */
export function suggestFields(state) {
  const source = getSource(state.sourceId);
  if (!source) return [];
  const form = FORMS.find((f) => f.id === state.form);
  const liked = new Set(form?.suggest ?? []);
  const scored = source.fields
    .map((f) => ({ ...f, score: (liked.has(f.type) ? 0 : 1) * 10 + source.fields.indexOf(f) }))
    .sort((a, b) => a.score - b.score);
  return scored.map(({ key, name, type }) => ({ key, name, type }));
}

/** 从样例数据里点选一个值 → 生成路径（用户不接触表达式） */
export function pickFromSample(state, rowIndex, key) {
  if (!Array.isArray(state.sample) || !state.sample[rowIndex]) return state;
  const path = String(key);
  if (!isSafePath(path)) return state;
  const value = resolvePath(state.sample[rowIndex], path);
  return { ...state, path, pickedValue: value === undefined ? '' : String(value) };
}

/** 生成模块定义（纯函数：这就是最终存下来的东西） */
export function buildModuleDraft(state) {
  const source = getSource(state.sourceId);
  if (!source) throw new Error('未选择数据源');
  if (!state.path && !['stat', 'chart'].includes(state.form)) {
    // 计数类允许不绑定字段（直接统计条数）
    if (state.transform !== 'count') throw new Error('未选择字段');
  }
  return {
    id: `mod-${Date.now().toString(36)}`,
    kind: state.form,
    title: state.title || `${source.name}${state.path ? ' · ' + describePath(source, state.path) : ''}`,
    data: {
      source: source.id,
      api: source.api,
      admin: Boolean(source.admin),
      path: state.path ?? null,
      transform: state.transform ?? 'none',
      transformParam: state.transformParam ?? null,
      formatter: state.formatter ?? 'none',
    },
    action: state.action ?? 'none',
    render: 'preset',           // 预设渲染，非自定义代码
    createdBy: 'wizard',
  };
}

/* ---------------- DOM：向导渲染（安全构造，不用 innerHTML 拼数据） ---------------- */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

/** 渲染当前步骤到容器 */
export function renderWizard(container, state, onChange) {
  if (!container) return;
  container.replaceChildren?.();

  // 关闭按钮
  const close = el('button', 'wiz-close', '✕');
  close.addEventListener('click', () => onChange({ ...state, finished: true, cancelled: true }));
  container.appendChild(close);

  // 进度条
  const progress = el('div', 'wiz-progress');
  for (let i = 0; i < STEPS.length; i++) {
    progress.appendChild(el('div', 'wiz-dot' + (i < state.step ? ' done' : i === state.step ? ' now' : '')));
  }
  container.appendChild(progress);

  // 标题 + 引导语
  const subs = { 0: '你想做一个什么样子？', 1: '数据从哪里来？', 2: '点一下你想显示的内容', 3: '怎么展示更好看？', 4: '要不要加个操作按钮？' };
  container.appendChild(el('div', 'wiz-title', STEPS[state.step]));
  container.appendChild(el('div', 'wiz-sub', subs[state.step] ?? ''));

  if (state.step === 0) renderForms(container, state, onChange);
  else if (state.step === 1) renderSources(container, state, onChange);
  else if (state.step === 2) renderFields(container, state, onChange);
  else if (state.step === 3) renderFormat(container, state, onChange);
  else renderActions(container, state, onChange);

  const bar = el('div', 'wiz-bar');
  if (state.step > 0) {
    const back = el('button', 'wiz-btn back', '←');
    back.addEventListener('click', () => onChange(prevStep(state)));
    bar.appendChild(back);
  }
  const next = el('button', 'wiz-btn next' + (state.step === STEPS.length - 1 ? ' done' : ''),
    state.step === STEPS.length - 1 ? '✓ 创建' : '下一步 →');
  next.disabled = !canAdvance(state);
  next.addEventListener('click', () => {
    if (state.step === STEPS.length - 1) onChange({ ...state, finished: true });
    else onChange(nextStep(state));
  });
  bar.appendChild(next);
  container.appendChild(bar);
}

function renderForms(container, state, onChange) {
  const grid = el('div', 'wiz-grid');
  for (const form of FORMS) {
    const card = el('div', 'wiz-card' + (state.form === form.id ? ' on' : ''));
    card.appendChild(el('div', 'wiz-icon', form.icon));
    card.appendChild(el('div', 'wiz-name', form.name));
    card.appendChild(el('div', 'wiz-hint', form.hint));
    card.addEventListener('click', () => onChange({ ...state, form: form.id }));
    grid.appendChild(card);
  }
  container.appendChild(grid);
}

function renderSources(container, state, onChange) {
  const list = el('div', 'wiz-list');
  for (const source of DATA_SOURCES) {
    const row = el('div', 'wiz-row' + (state.sourceId === source.id ? ' on' : ''));
    row.appendChild(el('div', 'wiz-name', source.name));
    row.appendChild(el('div', 'wiz-hint', source.admin ? '需登录' : ''));
    if (state.sourceId === source.id) row.appendChild(el('div', 'wiz-check', '✓'));
    row.addEventListener('click', () => {
      const next = { ...state, sourceId: source.id, path: null, sample: null };
      onChange(next);
      loadSample(next);
    });
    list.appendChild(row);
  }
  container.appendChild(list);
}

function renderFields(container, state, onChange) {
  const fields = suggestFields(state);
  if (Array.isArray(state.sample) && state.sample.length) {
    container.appendChild(el('div', 'wiz-label', '点击你想显示的值'));
    const box = el('div', 'wiz-sample-box');
    box.appendChild(el('div', 'wiz-sample-title', '样例数据（前 5 条）'));
    state.sample.slice(0, 5).forEach((row) => {
      const line = el('div', 'wiz-sample-row');
      for (const { key } of fields) {
        const value = resolvePath(row, key);
        if (value === undefined || value === null || value === '') continue;
        const chip = el('span', 'wiz-chip' + (state.path === key ? ' on' : ''), String(value).slice(0, 20));
        chip.addEventListener('click', () => onChange(pickFromSample(state, 0, key)));
        line.appendChild(chip);
      }
      box.appendChild(line);
    });
    container.appendChild(box);
  }
  if (state.path) {
    const source = getSource(state.sourceId);
    container.appendChild(el('div', 'wiz-picked', describePath(source, state.path)));
  }
  container.appendChild(el('div', 'wiz-label', '或从字段列表选择'));
  const list = el('div', 'wiz-chips');
  for (const field of fields) {
    const chip = el('span', 'wiz-chip' + (state.path === field.key ? ' on' : ''), field.name);
    chip.addEventListener('click', () => onChange({ ...state, path: field.key }));
    list.appendChild(chip);
  }
  container.appendChild(list);
}

function renderFormat(container, state, onChange) {
  container.appendChild(el('div', 'wiz-label', '格式化'));
  const fRow = el('div', 'wiz-chips');
  for (const [id, f] of Object.entries(FORMATTERS)) {
    const chip = el('span', 'wiz-chip' + (state.formatter === id ? ' on' : ''), f.name);
    chip.addEventListener('click', () => onChange({ ...state, formatter: id }));
    fRow.appendChild(chip);
  }
  container.appendChild(fRow);

  container.appendChild(el('div', 'wiz-label', '数据处理'));
  const tRow = el('div', 'wiz-chips');
  for (const [id, t] of Object.entries(TRANSFORMS)) {
    const chip = el('span', 'wiz-chip' + (state.transform === id ? ' on' : ''), t.name);
    chip.addEventListener('click', () => onChange({ ...state, transform: id }));
    tRow.appendChild(chip);
  }
  container.appendChild(tRow);
}

function renderActions(container, state, onChange) {
  container.appendChild(el('div', 'wiz-label', '列表项操作按钮'));
  const row = el('div', 'wiz-chips');
  for (const action of ACTIONS) {
    const chip = el('span', 'wiz-chip' + (state.action === action.id ? ' on' : ''), action.name);
    chip.addEventListener('click', () => onChange({ ...state, action: action.id }));
    row.appendChild(chip);
  }
  container.appendChild(row);
  container.appendChild(el('div', 'wiz-label', '模块名称'));
  const name = el('input', 'wiz-input');
  name.placeholder = '给模块起个名字（可留空）';
  name.value = state.title ?? '';
  name.addEventListener('input', () => onChange({ ...state, title: name.value }));
  container.appendChild(name);
}

/* ---------------- 入口 ---------------- */

let wizardState = createDraft();
let wizardHost = null;

/** 供 index.html 按钮调用：打开零代码创建向导 */
export function wizardFlow() {
  try {
    wizardHost = document.getElementById('wizardHost') || wizardHost;
    if (!wizardHost) {
      wizardHost = el('div', 'wizard-host');
      wizardHost.id = 'wizardHost';
      (document.querySelector('.phone') || document.body)?.appendChild?.(wizardHost);
    }
    wizardState = createDraft();
    render();
    if (typeof window?.toast === 'function') window.toast('零代码创建：先选一个形态');
  } catch (error) {
    if (typeof window?.toast === 'function') window.toast('⚠️ 向导打开失败');
    console.error('[wizard]', error);
  }
}

function render() {
  if (wizardState.finished) {
    if (wizardState.cancelled) {
      // 用户主动关闭：不保存，直接退出
      wizardState = createDraft();
      if (wizardHost) { wizardHost.remove(); wizardHost = null; } // BUG-007 修复：移除容器
      if (typeof window?.toast === 'function') window.toast('已退出零代码创建');
      return;
    }
    try {
      const draft = buildModuleDraft(wizardState);
      if (typeof window?.saveModule === 'function') window.saveModule(draft);
      if (typeof window?.toast === 'function') window.toast(`已创建：${draft.title}`);
    } catch (error) {
      if (typeof window?.toast === 'function') window.toast('⚠️ ' + error.message);
    }
    wizardState = createDraft();
    if (wizardHost) { wizardHost.remove(); wizardHost = null; } // BUG-007
    return;
  }
  renderWizard(wizardHost, wizardState, (next) => { wizardState = next; render(); });
}

/** 拉取样例数据：失败也不阻塞（用户仍可从字段列表选） */
async function loadSample(state) {
  const source = getSource(state.sourceId);
  if (!source) return;
  try {
    const base = globalThis.API_BASE ?? '';
    const hasQuery = source.api.includes('?');
    const url = base + source.api + (hasQuery ? '&size=5' : '?size=5');
    const fetcher = globalThis.jfetch ?? globalThis.fetch;
    const raw = await fetcher(url);
    const rows = (globalThis.unwrap ? globalThis.unwrap(raw) : raw) ?? [];
    setSample(Array.isArray(rows) ? rows : [rows]);
  } catch (error) {
    console.warn('[wizard] 样例拉取失败（可继续）', error);
  }
}

/** 注入样例数据（由调用方拉取后调用） */
export function setSample(rows) {
  wizardState = { ...wizardState, sample: Array.isArray(rows) ? rows.slice(0, 10) : [] };
  if (wizardHost) render();
}

export const __exports__ = {
  wizardFlow,
  renderWizard,
  buildModuleDraft,
  createDraft,
  nextStep,
  prevStep,
  canAdvance,
  suggestFields,
  pickFromSample,
  setSample,
  FORMS,
  ACTIONS,
  STEPS,
};
