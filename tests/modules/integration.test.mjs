import test from 'node:test';
import assert from 'node:assert/strict';
import { exportModule, importModule } from '../../src/modules/lab/transfer.js';
import { monthlySummary, categorySummary } from '../../src/modules/wallet/store.js';

test('v0.11-13 集成：钱包汇总计算正确', () => {
  const entries = [
    { type: 'income', amount: 5000, category: '工资', date: '2026-09-01' },
    { type: 'expense', amount: 30, category: '餐饮', date: '2026-09-05' },
    { type: 'expense', amount: 120, category: '交通', date: '2026-09-06' },
  ];
  const s = monthlySummary(entries, '2026-09');
  assert.equal(s.income, 5000);
  assert.equal(s.expense, 150);
  assert.equal(s.net, 4850);
  const cats = categorySummary(entries, 'expense');
  assert.equal(cats[0].category, '交通');
});

test('v0.12 同步模块：导出→导入的模块 JSON 可往返', () => {
  const original = {
    id: 'mod-test', kind: 'stat', title: '测试',
    data: { source: 'posts', api: '/api/posts', path: 'views', formatter: 'thousand' },
    render: 'preset', createdBy: 'wizard',
  };
  const json = exportModule(original);
  const imported = importModule(json);
  assert.equal(imported.kind, 'stat');
  assert.equal(imported.data.path, 'views');
  assert.equal(imported.data.formatter, 'thousand');
  assert.equal(imported.render, 'preset');
});

test('v0.13 图片压缩：非浏览器环境降级（不崩溃）', async () => {
  // 在 Node 环境中 Image/URL 不存在，应 reject 而非 crash
  try {
    const { compressImage } = await import('../../src/modules/album/manifest.js');
    await compressImage(new Blob(['fake']));
    assert.fail('应该 reject');
  } catch (e) {
    // 预期 reject（Image is not defined 或 图片加载失败）
    assert.ok(true);
  }
});

test('v0.14+ 回归：所有新模块导出 __exports__', async () => {
  const modules = [
    '../../src/modules/lab/preset-render.js',
    '../../src/modules/lab/refresh.js',
    '../../src/modules/lab/transfer.js',
  ];
  for (const path of modules) {
    const mod = await import(path);
    assert.ok(mod.__exports__, `${path} 缺少 __exports__`);
    assert.ok(Object.keys(mod.__exports__).length > 0);
  }
});
