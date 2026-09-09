import test from 'node:test';
import assert from 'node:assert/strict';
import { filterModules, sortModules, duplicateModule, toggleEnabled } from '../../src/modules/lab/manager-utils.js';
import { exportBackup, importBackup } from '../../src/modules/lab/transfer.js';
import { generatePassword } from '../../src/modules/password/generator.js';

test('模块搜索过滤：按名称/标题/id 模糊匹配', () => {
  const mods = [
    { id: 'm1', name: '待审评论', title: '评论列表' },
    { id: 'm2', name: 'CPU 监控', title: '系统状态' },
    { id: 'm3', name: '访客统计', title: '流量分析' },
  ];
  assert.equal(filterModules(mods, '评论').length, 1);
  assert.equal(filterModules(mods, 'cpu').length, 1);
  assert.equal(filterModules(mods, 'm3').length, 1);
  assert.equal(filterModules(mods, '').length, 3);
});

test('模块排序：置顶在前，其余按名称', () => {
  const mods = [
    { name: 'C 模块' }, { name: 'A 模块', is_pinned: true }, { name: 'B 模块' },
  ];
  const sorted = sortModules(mods);
  assert.equal(sorted[0].name, 'A 模块');
  assert.equal(sorted[1].name, 'B 模块');
  assert.equal(sorted[2].name, 'C 模块');
});

test('复制模块：新 id + 名称加副本 + 默认未启用', () => {
  const mod = { id: 'mod-1', name: '测试', title: '测试标题', enabled: true, kind: 'stat' };
  const copy = duplicateModule(mod);
  assert.notEqual(copy.id, mod.id);
  assert.ok(copy.id.startsWith('mod-'));
  assert.ok(copy.name.includes('副本'));
  assert.equal(copy.enabled, false);
  assert.equal(copy.kind, 'stat', 'kind 应保留');
});

test('启用切换：取反', () => {
  const mod = { id: 'm1', enabled: true };
  assert.equal(toggleEnabled(mod).enabled, false);
  assert.equal(toggleEnabled(toggleEnabled(mod)).enabled, true);
});

test('备份导出导入：数据完整还原', () => {
  const data = {
    password: [{ id: 'pw-1', title: 'Test', password: 'secret' }],
    wallet: [{ id: 'wx-1', type: 'expense', amount: 50 }],
    modules: [{ id: 'mod-1', kind: 'stat' }],
  };
  const json = exportBackup(data);
  const restored = importBackup(json);
  assert.deepEqual(restored.password, data.password);
  assert.deepEqual(restored.wallet, data.wallet);
  assert.deepEqual(restored.modules, data.modules);
});

test('备份导入：拒绝非本应用文件', () => {
  assert.throws(() => importBackup(JSON.stringify({ app: 'other-app', data: {} })), /不是本应用/);
  assert.throws(() => importBackup('{}'), /备份数据为空|不是本应用/);
});

test('密码生成器：批量唯一性', () => {
  const seen = new Set();
  for (let i = 0; i < 50; i++) seen.add(generatePassword());
  assert.ok(seen.size >= 48, `50 次生成应有 ≥48 个唯一值，实际 ${seen.size}`);
});
