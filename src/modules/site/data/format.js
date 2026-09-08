/**
 * site · 格式化纯函数（迁移步 S2）
 * 来源：src/prototype.js 773-774（esc/escAttr）与 1962-1967（fdate/slugify/cnt/emptyCard/lerrEl/toastErr）逐字迁移。
 * 与原文的差异（唯一）：toastErr 内的 toast 由 globalThis 动态解析——toast 定义仍在
 * prototype.js（S6 迁移），模块内不能静态引用全局自由变量。
 */

/** HTML 转义（防注入；所有用户输入渲染前必须经过） */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** 属性转义（原文即 esc 别名，保留同名出口以防遗漏调用点） */
export const escAttr = esc;

/** 日期显示：MM-DD HH:mm；无效输入原样返回 */
export function fdate(v) {
  try {
    var d = new Date(v);
    if (isNaN(d)) return String(v || '').replace('T', ' ').slice(5, 16);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  } catch (e) { return String(v || ''); }
}

/** slug 生成：小写-连字符；纯中文或空结果回退 item-<随机>（原文行为） */
export function slugify(name) {
  var x = String(name || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_\u4e00-\u9fa5]/g, '');
  if (!x || /^[\u4e00-\u9fa5]+$/.test(x)) x = 'item-' + Date.now().toString(36);
  return x;
}

/** 按 id 更新文本（元素不存在时静默——原文行为，用于角标计数） */
export function cnt(id, v) {
  var e = document.getElementById(id);
  if (e) e.textContent = v;
}

/** 空态卡（毛玻璃 card 类，文案居中） */
export function emptyCard(t) {
  return '<div class="card" style="padding:14px;font-size:12.5px;color:var(--ink-3);text-align:center">' + t + '</div>';
}

/** 列表容器渲染失败占位 */
export function lerrEl(h, e) {
  h.innerHTML = emptyCard('⚠️ ' + ((e && e.message) || '加载失败'));
}

/** 操作失败 toast（toast 仍在 prototype.js，运行时经 globalThis 解析） */
export function toastErr(e) {
  const t = globalThis.toast;
  if (typeof t === 'function') t('⚠️ ' + ((e && e.message) || '操作失败'));
}
