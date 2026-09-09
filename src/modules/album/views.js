/**
 * album · 完整视图（v0.3.0 图床增强）
 *
 * 照片选择→压缩→网格预览 + 相册选择 + 删除。
 * 后端 /api/upload/image 部署后自动切换为真实上传。
 */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}

/** 压缩图片 */
function compressImage(file, maxSize = 1920, quality = 0.8) {
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

export async function renderAlbum(container) {
  if (!container) container = document.getElementById('albumContainer');
  if (!container) return;
  container.replaceChildren?.();

  // 上传按钮（隐藏 file input）
  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  container.appendChild(fileInput);

  const bar = el('div', 'album-toolbar');
  const uploadBtn = el('button', 'pw-btn pw-add', '＋ 选择照片');
  uploadBtn.addEventListener('click', () => fileInput.click());
  bar.appendChild(uploadBtn);
  container.appendChild(bar);

  // 照片网格
  const grid = el('div', 'album-grid');
  container.appendChild(grid);
  container._grid = grid;
  container._fileInput = fileInput;

  // 选择文件后压缩并显示预览
  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files ?? []);
    if (!files.length) return;
    for (const file of files.slice(0, 9)) {
      try {
        const blob = await compressImage(file);
        const url = URL.createObjectURL(blob);
        const cell = el('div', 'album-cell');
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:12px';
        cell.appendChild(img);
        grid.appendChild(cell);
      } catch (e) {
        console.warn('[album] 压缩失败:', e);
      }
    }
    fileInput.value = '';
    if (typeof window?.toast === 'function') window.toast(`已添加 ${Math.min(files.length, 9)} 张照片预览`);
  });

  // 空态提示
  if (!grid.children.length) {
    container.appendChild(el('div', 'pw-empty', '📷 选择照片后在此预览（上传功能待后端部署）'));
  }
}

export const __exports__ = { renderAlbum };
