/**
 * album 模块 —— 相册/图床（v0.13 骨架）
 *
 * 职责：照片列表、上传（base64 → 后端）、删除、设封面。
 * 依赖：后端 /api/albums + /api/upload/image
 */
export default {
  id: 'album',
  name: '相册',
  icon: '📷',
  version: '0.1.0',
  nav: 'hidden',
  order: 30,
  permissions: ['storage', 'net'],
  async mount(ctx) { albumState.ctx = ctx; },
  unmount() { albumState.ctx = null; },
};

export const albumState = { ctx: null, albums: [], currentAlbum: null };

/** 压缩图片（Canvas 方式，质量 0.8，最大 1920px） */
export function compressImage(file, maxSize = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')); };
    img.src = url;
  });
}

/** 文件转 base64 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('读取失败'));
    reader.readAsDataURL(file);
  });
}

export const __exports__ = { compressImage, fileToBase64 };
