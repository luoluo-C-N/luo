/**
 * password · UI 渲染（v0.06 视图层）
 *
 * 渲染到 #pg-password 子页（index.html）。
 * vault 未解锁时显示"锁定"提示+解锁按钮；解锁后显示列表+添加表单。
 * 安全：密码不直接显示，点击复制到剪贴板（15s 自动清除）。
 */

let copyTimer = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

/** 获取 ctx（从内核） */
function getCtx() {
  const core = globalThis.__POCKET_CORE__;
  if (!core) return null;
  const record = core.registry.all().find((r) => r.manifest.id === 'password');
  if (!record || record.status !== 'registered') return null;
  return core.router.contexts?.get?.('password') ?? null;
}

/** 渲染密码列表页 */
export async function renderPasswordList(container) {
  if (!container) container = document.getElementById('pwListContainer');
  if (!container) return;
  container.replaceChildren?.();

  const ctx = getCtx();
  if (!ctx) {
    container.appendChild(el('div', 'pw-locked', '内核未就绪'));
    return;
  }

  const vault = ctx.vault;
  if (!vault) {
    container.appendChild(el('div', 'pw-locked', '保险库不可用'));
    return;
  }

  if (!await vault.isSet()) {
    container.appendChild(el('div', 'pw-locked', '请先在账号中心设置主密码'));
    const hint = el('button', 'pw-btn', '去设置');
    hint.addEventListener('click', () => { if (typeof window?.openSub === 'function') window.openSub('pg-account'); });
    container.appendChild(hint);
    return;
  }

  if (!vault.isUnlocked()) {
    container.appendChild(el('div', 'pw-locked', '🔒 保险库已锁定'));
    const btn = el('button', 'pw-btn', '解锁');
    btn.addEventListener('click', () => { if (typeof window?.openSub === 'function') window.openSub('pg-account'); });
    container.appendChild(btn);
    return;
  }

  // 已解锁：加载条目
  const { loadEntries } = await import('./store.js');
  const { groupByCategory } = await import('./strength.js');
  let entries = [];
  try { entries = await loadEntries(ctx); } catch (e) {
    container.appendChild(el('div', 'pw-locked', '⚠️ ' + e.message));
    return;
  }

  // 搜索框
  const search = el('input', 'pw-search');
  search.placeholder = '🔍 搜索标题/用户名/网址';
  search.addEventListener('input', () => renderEntryList(container, searchEntries_local(entries, search.value), ctx));
  container.appendChild(search);

  // 添加按钮
  const addBtn = el('button', 'pw-btn pw-add', '＋ 新增密码');
  addBtn.addEventListener('click', () => showAddForm(container, ctx));
  container.appendChild(addBtn);

  // 条目列表
  renderEntryList(container, entries, ctx);
}

function searchEntries_local(entries, q) {
  if (!q) return entries;
  const lower = q.toLowerCase();
  return entries.filter((e) =>
    (e.title ?? '').toLowerCase().includes(lower) ||
    (e.username ?? '').toLowerCase().includes(lower) ||
    (e.url ?? '').toLowerCase().includes(lower)
  );
}

function renderEntryList(container, entries, ctx) {
  const old = container.querySelector?.('.pw-list');
  if (old) old.remove();
  const list = el('div', 'pw-list');

  if (!entries.length) {
    list.appendChild(el('div', 'pw-empty', '还没有存储密码，点上方「＋ 新增密码」'));
    container.appendChild(list);
    return;
  }

  // 分类分组折叠
  const { groupByCategory } = ctx ? { groupByCategory: null } : {};
  const groups = {};
  for (const entry of entries) {
    const cat = entry.category ?? '默认';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(entry);
  }
  for (const [cat, items] of Object.entries(groups)) {
    if (Object.keys(groups).length > 1) {
      const header = el('div', 'pw-cat-header', cat + ' (' + items.length + ')');
      header.addEventListener('click', () => {
        const isCollapsed = header.classList.toggle('collapsed');
        // BUG-005 修复：用 JS 直接控制后续卡片的显示/隐藏
        let next = header.nextElementSibling;
        while (next && !next.classList.contains('pw-cat-header')) {
          next.style.display = isCollapsed ? 'none' : '';
          next = next.nextElementSibling;
        }
      });
      list.appendChild(header);
    }
    for (const entry of items) {
      const card = el('div', 'pw-card');
      card.appendChild(el('div', 'pw-card-title', entry.title ?? '未命名'));
      if (entry.username) card.appendChild(el('div', 'pw-card-user', entry.username));
      if (entry.url) card.appendChild(el('div', 'pw-card-url', entry.url));

      const actions = el('div', 'pw-actions');
      const copyBtn = el('button', 'pw-action-btn', '复制密码');
      copyBtn.addEventListener('click', () => copyPassword(entry.password));
      actions.appendChild(copyBtn);

      const delBtn = el('button', 'pw-action-btn pw-del', '删除');
      delBtn.addEventListener('click', async () => {
        const { deleteEntry } = await import('./store.js');
        await deleteEntry(ctx, entry.id);
        renderPasswordList(container);
      });
      actions.appendChild(delBtn);

      card.appendChild(actions);
      list.appendChild(card);
    }
  }
  container.appendChild(list);
}

/** 复制到剪贴板，15s 后清屏（架构 §12.1） */
async function copyPassword(pw) {
  try {
    await globalThis.navigator?.clipboard?.writeText(pw);
    if (typeof window?.toast === 'function') window.toast('已复制（15s 后剪贴板将清空）');
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      globalThis.navigator?.clipboard?.writeText('');
    }, 15000);
  } catch {
    if (typeof window?.toast === 'function') window.toast('复制失败');
  }
}

/** 显示新增表单（含密码生成器 + 强度条） */
function showAddForm(container, ctx) {
  const old = container.querySelector?.('.pw-form');
  if (old) { old.remove(); return; }

  const form = el('div', 'pw-form');
  const fields = [
    { key: 'title', placeholder: '标题 *', type: 'text' },
    { key: 'username', placeholder: '用户名', type: 'text' },
    { key: 'url', placeholder: '网址', type: 'url' },
    { key: 'notes', placeholder: '备注', type: 'text' },
  ];
  const inputs = {};
  for (const f of fields) {
    const input = el('input', 'pw-input');
    input.type = f.type;
    input.placeholder = f.placeholder;
    inputs[f.key] = input;
    form.appendChild(input);
  }

  // 密码输入 + 生成器按钮
  const pwRow = el('div', 'pw-pw-row');
  const pwInput = el('input', 'pw-input');
  pwInput.type = 'password';
  pwInput.placeholder = '密码 *（或点生成）';
  inputs.password = pwInput;
  pwRow.appendChild(pwInput);
  const genBtn = el('button', 'pw-gen-btn', '🎲');
  genBtn.title = '生成强密码';
  genBtn.addEventListener('click', async () => {
    const { generatePassword } = await import('./generator.js');
    pwInput.value = generatePassword(16);
    pwInput.type = 'text';
    updateStrength(pwInput.value);
  });
  pwRow.appendChild(genBtn);
  form.appendChild(pwRow);

  // 强度条
  const strengthBar = el('div', 'pw-strength');
  const strengthFill = el('div', 'pw-strength-fill');
  const strengthText = el('span', 'pw-strength-text', '');
  strengthBar.appendChild(strengthFill);
  strengthBar.appendChild(strengthText);
  form.appendChild(strengthBar);

  pwInput.addEventListener('input', () => updateStrength(pwInput.value));

  function updateStrength(pw) {
    import('./strength.js').then(({ checkStrength }) => {
      const s = checkStrength(pw);
      strengthFill.style.width = Math.min(100, (s.score / 7) * 100) + '%';
      strengthFill.style.background = s.color;
      strengthText.textContent = pw ? s.label : '';
      strengthText.style.color = s.color;
    });
  }

  // 分类
  const catInput = el('input', 'pw-input');
  catInput.placeholder = '分类（如：开发/金融/默认）';
  inputs.category = catInput;
  form.appendChild(catInput);

  const save = el('button', 'pw-btn pw-save', '🔒 加密保存');
  save.addEventListener('click', async () => {
    if (!inputs.title.value || !pwInput.value) {
      if (typeof window?.toast === 'function') window.toast('标题和密码为必填');
      return;
    }
    const { addEntry } = await import('./store.js');
    const { sanitizeInput } = await import('../lab/perf.js');
    await addEntry(ctx, {
      title: sanitizeInput(inputs.title.value, 100),
      username: inputs.username.value,
      password: pwInput.value,
      url: inputs.url.value,
      notes: sanitizeInput(inputs.notes.value, 300),
      category: sanitizeInput(inputs.category.value, 50) || '默认',
    });
    if (typeof window?.toast === 'function') window.toast('已加密保存');
    renderPasswordList(container);
  });
  form.appendChild(save);
  container.appendChild(form);
}

export const __exports__ = { renderPasswordList };
