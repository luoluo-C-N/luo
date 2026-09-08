/** data/backup —— 数据库备份入口（S7；后续对接内核 F-K5 数据管家） */
/* 逐字迁移自 src/prototype.js（步骤 S7）；行为变更需走评审。 */

export function backupDb(){
  toast('正在打包下载…');
  var a=document.createElement('a');
  a.href=backBase()+'/api/system/backup';
  a.download='kirameku-backup.db';
  document.body.appendChild(a);a.click();a.remove();
  toast('已触发下载 ✓');
}

export const __exports__ = { backupDb };
