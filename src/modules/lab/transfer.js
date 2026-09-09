/**
 * lab · 模块导入导出（阶段 6：分享零代码模块）
 *
 * 导出格式：JSON（含绑定定义，不含数据），可直接分享给其他用户导入。
 * 安全性：导入时校验字段白名单，拒绝未知属性。
 */

const ALLOWED_KEYS = new Set([
  'id', 'kind', 'title', 'data', 'action', 'render', 'createdBy',
  'panel', 'enabled', 'sort',
]);
const ALLOWED_DATA_KEYS = new Set([
  'source', 'api', 'admin', 'path', 'transform', 'transformParam', 'formatter',
]);

/** 导出模块定义为可分享的 JSON */
export function exportModule(mod) {
  return JSON.stringify(mod, (key, value) => {
    if (key.startsWith('_')) return undefined; // 去掉内部状态
    return value;
  }, 2);
}

/** 导入模块 JSON（白名单校验） */
export function importModule(json) {
  let raw;
  try { raw = JSON.parse(json); } catch { throw new Error('JSON 格式错误'); }
  if (typeof raw !== 'object' || raw === null) throw new Error('无效的模块定义');
  if (!raw.kind || !raw.data || !raw.data.source) throw new Error('缺少必要字段（kind/data.source）');
  if (!raw.data.api || !String(raw.data.api).startsWith('/api/')) throw new Error('API 路径必须以 /api/ 开头');

  // 白名单过滤
  const clean = {};
  for (const key of Object.keys(raw)) {
    if (ALLOWED_KEYS.has(key)) clean[key] = raw[key];
  }
  if (clean.data) {
    const cleanData = {};
    for (const key of Object.keys(clean.data)) {
      if (ALLOWED_DATA_KEYS.has(key)) cleanData[key] = clean.data[key];
    }
    clean.data = cleanData;
  }
  // 强制覆盖安全字段
  clean.render = 'preset';
  clean.createdBy = 'import';
  clean.id = 'mod-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  clean.enabled = true;
  return clean;
}

export const __exports__ = { exportModule, importModule, exportBackup, importBackup };

/** 全量数据备份导出 */
export function exportBackup(data) {
  return JSON.stringify({
    version: 1,
    timestamp: new Date().toISOString(),
    app: 'kirameku-pocket',
    data,
  }, null, 2);
}

/** 全量数据备份导入 */
export function importBackup(json) {
  const parsed = JSON.parse(json);
  if (parsed.app !== 'kirameku-pocket') throw new Error('不是本应用的备份文件');
  if (!parsed.data || typeof parsed.data !== 'object') throw new Error('备份数据为空');
  return parsed.data;
}

export const __exports_backup__ = { exportBackup, importBackup };
