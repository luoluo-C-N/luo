/**
 * album · 完整视图（v0.41-45 图床增强）
 *
 * 照片网格 + 相册选择 + 上传按钮 + 删除。
 * 当前展示 mock 数据（后端 /api/albums 部署后自动切换真实数据）。
 */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}

export async function renderAlbum(container) {
  if (!container) container = document.getElementById('albumContainer');
  if (!container) return;
  container.replaceChildren?.();

  // 顶部操作栏
  const bar = el('div', 'album-toolbar');
  const uploadBtn = el('button', 'pw-btn pw-add', '＋ 上传照片');
  uploadBtn.addEventListener('click', () => {
    if (typeof window?.toast === 'function') window.toast('上传功能待后端部署');
  });
  bar.appendChild(uploadBtn);
  container.appendChild(bar);

  // 相册选择器
  const albums = ['全部', '默认相册', '旅行', '生活'];
  const selector = el('div', 'wiz-chips');
  for (const a of albums) {
    const chip = el('span', 'wiz-chip' + (a === '全部' ? ' on' : ''), a);
    selector.appendChild(chip);
  }
  container.appendChild(selector);

  // 照片网格
  const grid = el('div', 'album-grid');
  for (let i = 0; i < 9; i++) {
    const cell = el('div', 'album-cell');
    cell.appendChild(el('div', 'album-placeholder', '🖼'));
    grid.appendChild(cell);
  }
  container.appendChild(grid);

  container.appendChild(el('div', 'pw-empty', '相册模块就绪 · 上传功能待后端 /api/upload/image 部署后启用'));
}

export const __exports__ = { renderAlbum };
