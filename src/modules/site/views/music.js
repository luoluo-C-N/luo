/**
 * views/music —— 音乐管理（迁移步 S5）
 * 待迁：prototype.js 508-598 音乐段 + v2 音乐接线（上传/播放/删除/排序）
 * 注意：PUT 走 FormData；上传上限 50MB；删除同步删本地音频文件
 * 验收：SITE-FR3 音乐段；上传失败明确提示不假成功
 */
export async function mount() { /* TODO(S5) */ }
export function unmount() { /* TODO(S5): 停止播放器，避免卸载后出声 */ }
