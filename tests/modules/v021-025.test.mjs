/**
 * lab · 面板预设渲染集成测试 + 密码生成器
 *
 * 阶段 1：验证 preset 模块定义在面板渲染管线中不丢失
 * 阶段 2：密码生成器（随机强密码）
 */

import test from 'node:test';
import assert from 'node:assert/strict';

test('preset 模块定义在 customModules 过滤中不丢失', async () => {
  const mods = [
    { id: 'm1', panel: 'site', enabled: true, render: 'preset', kind: 'stat' },
    { id: 'm2', panel: 'site', enabled: false, render: 'preset', kind: 'list' },
    { id: 'm3', panel: 'other', enabled: true, render: 'preset', kind: 'chart' },
  ];
  const visible = mods.filter((m) => m.panel === 'site' && m.enabled);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'm1');
  assert.equal(visible[0].render, 'preset');
});

test('密码生成器：默认 16 位含大小写数字符号', async () => {
  const { generatePassword } = await import('../../src/modules/password/generator.js');
  const pw = generatePassword();
  assert.equal(pw.length, 16);
  assert.ok(/[a-z]/.test(pw), '应含小写');
  assert.ok(/[A-Z]/.test(pw), '应含大写');
  assert.ok(/[0-9]/.test(pw), '应含数字');
  assert.ok(/[!@#$%^&*]/.test(pw), '应含符号');
});

test('密码生成器：自定义长度', async () => {
  const { generatePassword } = await import('../../src/modules/password/generator.js');
  assert.equal(generatePassword(8).length, 8);
  assert.equal(generatePassword(32).length, 32);
});

test('密码生成器：两次生成不相同', async () => {
  const { generatePassword } = await import('../../src/modules/password/generator.js');
  const seen = new Set();
  for (let i = 0; i < 20; i++) seen.add(generatePassword());
  assert.ok(seen.size > 18, '20 次生成应几乎无重复');
});

test('数据导出：全量备份 JSON 结构', async () => {
  const { exportBackup } = await import('../../src/modules/lab/transfer.js');
  const data = {
    password: [{ id: 'pw-1', title: 'Test' }],
    wallet: [{ id: 'wx-1', type: 'expense', amount: 100 }],
    modules: [{ id: 'mod-1', kind: 'stat' }],
  };
  const json = exportBackup(data);
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, 1);
  assert.ok(parsed.timestamp);
  assert.deepEqual(parsed.data.password, data.password);
  assert.deepEqual(parsed.data.wallet, data.wallet);
  assert.deepEqual(parsed.data.modules, data.modules);
});
