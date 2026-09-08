/** shell/tabbar —— 底部导航自动隐藏/呼出（S7） */
/* 逐字迁移自 src/prototype.js（步骤 S7）；行为变更需走评审。 */

export function tabbarEach(fn){document.querySelectorAll('.tabbar').forEach(fn);}

export function tabbarHide(){tabbarEach(function(t){t.classList.add('hidden');});}

export function tabbarShow(){tabbarEach(function(t){t.classList.remove('hidden');});}

export const __exports__ = { tabbarEach, tabbarHide, tabbarShow };
