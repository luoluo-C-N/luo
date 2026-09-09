/**
 * lab · 绑定引擎（v0.04 零代码绑定 · 依据 ADR-0002）
 *
 * 与旧实现的本质区别：
 *  - 旧：用户手填 `data.counts.posts` 这类取值路径 —— 那是代码，不是无代码
 *  - 新：用户点选样例数据里的值，界面显示中文面包屑，表达式不可见
 *
 * 能力边界（刻意锁死）：只有预设下拉（格式化 / 变换），没有表达式输入框。
 */

/** 路径白名单：仅允许 字母数字 下划线 点，防止原型链与任意属性访问 */
const PATH_RE = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;
const DANGER = new Set(['__proto__', 'constructor', 'prototype']);

/** 校验字段路径是否安全 */
export function isSafePath(path) {
  if (typeof path !== 'string' || !path) return false;
  if (!PATH_RE.test(path)) return false;
  return path.split('.').every((seg) => !DANGER.has(seg));
}

/** 按路径取值（数组自动取首元素，便于列表卡片直接绑定） */
export function resolvePath(data, path) {
  if (!isSafePath(path)) throw new Error('字段路径不合法：' + path);
  let current = data;
  if (Array.isArray(current)) current = current[0];
  for (const seg of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = current[seg];
  }
  return current;
}

/** 把点路径转成中文面包屑（用数据源字段元数据） */
export function describePath(source, path) {
  if (!source || !Array.isArray(source.fields)) return path;
  const known = new Map(source.fields.map((f) => [f.key, f.name]));
  return path
    .split('.')
    .map((seg) => known.get(seg) ?? seg)
    .join(' › ');
}

/* ---------------- 格式化预设（仅下拉可选） ---------------- */

export const FORMATTERS = {
  none: { name: '不处理', apply: (v) => v },
  thousand: {
    name: '千分位',
    apply: (v) => (Number(v) || 0).toLocaleString('zh-CN'),
  },
  percent: {
    name: '百分比',
    apply: (v) => `${Math.round((Number(v) || 0) * 100) / 100}%`,
  },
  bytes: {
    name: '字节(MB)',
    apply: (v) => `${Math.round((Number(v) || 0) / 1048576)} MB`,
  },
  duration: {
    name: '时长',
    apply: (v) => {
      const s = Number(v) || 0;
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      return d > 0 ? `${d}天${h}小时` : `${h}小时${Math.floor((s % 3600) / 60)}分`;
    },
  },
  relativeTime: {
    name: '相对时间',
    apply: (v) => {
      const t = new Date(v).getTime();
      if (Number.isNaN(t)) return String(v ?? '');
      const diff = Math.floor((Date.now() - t) / 1000);
      if (diff < 60) return '刚刚';
      if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
      return `${Math.floor(diff / 86400)} 天前`;
    },
  },
  datetime: {
    name: '日期时间',
    apply: (v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return String(v ?? '');
      const p = (n) => String(n).padStart(2, '0');
      return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    },
  },
  bool: {
    name: '是/否',
    apply: (v) => (v ? '是' : '否'),
  },
  text: { name: '纯文本', apply: (v) => String(v ?? '') },
};

export function listFormatters() {
  return Object.entries(FORMATTERS).map(([id, f]) => ({ id, name: f.name }));
}

/* ---------------- 变换预设（仅下拉可选） ---------------- */

export const TRANSFORMS = {
  none: { name: '不处理', apply: (rows) => rows },
  firstN: {
    name: '取前 N 条',
    param: { key: 'n', name: '条数', type: 'number', default: 5 },
    apply: (rows, p) => rows.slice(0, Number(p?.n) || 5),
  },
  sort: {
    name: '排序',
    param: { key: 'desc', name: '降序', type: 'bool', default: true },
    apply: (rows, p) =>
      [...rows].sort((a, b) => {
        const av = a?.[p?.by] ?? a;
        const bv = b?.[p?.by] ?? b;
        const cmp = av > bv ? 1 : av < bv ? -1 : 0;
        return p?.desc === false ? cmp : -cmp;
      }),
  },
  distinct: {
    name: '去重',
    apply: (rows) => Array.from(new Set(rows)),
  },
  count: {
    name: '计数',
    apply: (rows) => (Array.isArray(rows) ? rows.length : 0),
  },
  sum: {
    name: '求和',
    apply: (rows, p) =>
      (Array.isArray(rows) ? rows : []).reduce(
        (acc, row) => acc + (Number(row?.[p?.by] ?? row) || 0),
        0
      ),
  },
  filterStatus: {
    name: '按状态筛选',
    param: { key: 'value', name: '状态值', type: 'text', default: 'pending' },
    apply: (rows, p) => rows.filter((row) => row?.status === p?.value),
  },
};

export function listTransforms() {
  return Object.entries(TRANSFORMS).map(([id, t]) => ({ id, name: t.name, param: t.param ?? null }));
}

/**
 * 执行一次绑定：数据源 → 路径 → 变换 → 格式化。
 * @param {{source:object, path:string, transform?:string, transformParam?:object, formatter?:string}} binding
 * @param {any} data 原始数据（数组或对象）
 */
export function applyBinding(binding, data) {
  const rows = Array.isArray(data) ? data : [data];
  const transform = TRANSFORMS[binding.transform ?? 'none'] ?? TRANSFORMS.none;
  const transformed = transform.apply(rows, binding.transformParam ?? {});
  const formatter = FORMATTERS[binding.formatter ?? 'none'] ?? FORMATTERS.none;

  if (!Array.isArray(transformed)) return formatter.apply(transformed);
  return transformed.map((row) =>
    formatter.apply(binding.path ? resolvePath(row, binding.path) : row)
  );
}

export const __exports__ = {
  isSafePath,
  resolvePath,
  describePath,
  applyBinding,
  listFormatters,
  listTransforms,
  FORMATTERS,
  TRANSFORMS,
};
