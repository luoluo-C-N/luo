/**
 * lab · 模块管理增强（v0.26-30）
 *
 * 开关切换 / 搜索过滤 / 排序 / 复制模块
 */
import { exportModule, importModule } from './transfer.js';

/** 搜索过滤模块列表 */
export function filterModules(modules, query) {
  if (!query) return modules;
  const q = query.toLowerCase();
  return modules.filter((m) =>
    (m.name ?? '').toLowerCase().includes(q) ||
    (m.title ?? '').toLowerCase().includes(q) ||
    (m.id ?? '').toLowerCase().includes(q)
  );
}

/** 排序：置顶的在前，其余按名称 */
export function sortModules(modules, by = 'name') {
  return [...modules].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    const av = (a[by] ?? a.title ?? a.name ?? '').toString().toLowerCase();
    const bv = (b[by] ?? b.title ?? b.name ?? '').toString().toLowerCase();
    return av.localeCompare(bv);
  });
}

/** 复制模块（深拷贝 + 新 id + 未启用） */
export function duplicateModule(mod) {
  const copy = JSON.parse(JSON.stringify(mod));
  copy.id = 'mod-' + Date.now().toString(36);
  copy.name = (mod.name ?? '') + ' (副本)';
  copy.title = (mod.title ?? '') + ' (副本)';
  copy.enabled = false;
  copy.createdBy = 'duplicate';
  return copy;
}

/** 切换启用/禁用 */
export function toggleEnabled(mod) {
  return { ...mod, enabled: !mod.enabled };
}

export const __exports__ = { filterModules, sortModules, duplicateModule, toggleEnabled };
