/**
 * wallet · UI 渲染（v0.11）
 *
 * 渲染到 #walletContainer：月度汇总条 → 添加表单 → 条目列表 → 分类占比
 * vault 未解锁时提示去解锁。
 */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}

function getCtx() {
  const core = globalThis.__POCKET_CORE__;
  return core?.router?.contexts?.get?.('wallet') ?? null;
}

export async function renderWallet(container) {
  if (!container) container = document.getElementById('walletContainer');
  if (!container) return;
  container.replaceChildren?.();

  const ctx = getCtx();
  const vault = ctx?.vault;
  if (!vault) { container.appendChild(el('div', 'pw-locked', '内核未就绪')); return; }
  if (!await vault.isSet()) {
    container.appendChild(el('div', 'pw-locked', '请先在账号中心设置主密码'));
    return;
  }
  if (!vault.isUnlocked()) {
    container.appendChild(el('div', 'pw-locked', '🔒 请先在账号中心解锁'));
    return;
  }

  const { loadEntries, monthlySummary, categorySummary } = await import('./store.js');
  const entries = await loadEntries(ctx);
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const summary = monthlySummary(entries, ym);

  // 月度汇总
  const sumRow = el('div', 'wallet-summary');
  sumRow.appendChild(makeSummaryCell('收入', summary.income, 'var(--green)'));
  sumRow.appendChild(makeSummaryCell('支出', summary.expense, 'var(--red)'));
  sumRow.appendChild(makeSummaryCell('结余', summary.net, summary.net >= 0 ? 'var(--green)' : 'var(--red)'));
  container.appendChild(sumRow);

  // 添加表单
  const form = el('div', 'wallet-form');
  const typeSel = el('select', 'pw-input');
  typeSel.innerHTML = '<option value="expense">支出</option><option value="income">收入</option>';
  const amt = el('input', 'pw-input'); amt.type = 'number'; amt.placeholder = '金额';
  const cat = el('input', 'pw-input'); cat.placeholder = '分类（餐饮/交通…）';
  const note = el('input', 'pw-input'); note.placeholder = '备注（可空）';
  const addBtn = el('button', 'pw-btn pw-save', '＋ 记一笔');
  addBtn.addEventListener('click', async () => {
    if (!amt.value) { window?.toast?.('请输入金额'); return; }
    const { addEntry } = await import('./store.js');
    await addEntry(ctx, { type: typeSel.value, amount: amt.value, category: cat.value, note: note.value });
    amt.value = ''; cat.value = ''; note.value = '';
    window?.toast?.('已记录');
    renderWallet(container);
  });
  form.appendChild(typeSel); form.appendChild(amt); form.appendChild(cat); form.appendChild(note); form.appendChild(addBtn);
  container.appendChild(form);

  // 分类占比（支出）
  const cats = categorySummary(entries, 'expense');
  if (cats.length) {
    container.appendChild(el('div', 'wiz-label', '本月支出分类'));
    for (const c of cats) {
      const row = el('div', 'wallet-cat-row');
      row.appendChild(el('span', '', c.category));
      row.appendChild(el('span', 'wallet-cat-amt', '¥' + c.total.toFixed(2)));
      container.appendChild(row);
    }
  }

  // 最近条目
  container.appendChild(el('div', 'wiz-label', '最近记录'));
  const list = el('div', 'pw-list');
  const recent = [...entries].reverse().slice(0, 15);
  if (!recent.length) { list.appendChild(el('div', 'pw-empty', '暂无记录')); }
  for (const e of recent) {
    const row = el('div', 'wallet-entry');
    const left = el('div', 'wallet-entry-left');
    left.appendChild(el('div', 'wallet-entry-cat', (e.category || '未分类') + ' · ' + (e.date ?? '')));
    if (e.note) left.appendChild(el('div', 'wallet-entry-note', e.note));
    row.appendChild(left);
    const sign = e.type === 'income' ? '+' : '-';
    const color = e.type === 'income' ? 'var(--green)' : 'var(--red)';
    row.appendChild(el('span', 'wallet-entry-amt', sign + '¥' + e.amount.toFixed(2)));
    row.querySelector('.wallet-entry-amt').style.color = color;
    const delBtn = el('button', 'pw-action-btn pw-del', '✕');
    delBtn.addEventListener('click', async () => {
      const { deleteEntry } = await import('./store.js');
      await deleteEntry(ctx, e.id);
      renderWallet(container);
    });
    row.appendChild(delBtn);
    list.appendChild(row);
  }
  container.appendChild(list);
}

function makeSummaryCell(label, value, color) {
  const cell = el('div', 'wallet-sum-cell');
  cell.appendChild(el('div', 'wallet-sum-label', label));
  const val = el('div', 'wallet-sum-value', '¥' + Number(value).toFixed(2));
  val.style.color = color;
  cell.appendChild(val);
  return cell;
}

export const __exports__ = { renderWallet };
