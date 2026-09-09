import test from 'node:test';
import assert from 'node:assert/strict';
import { startRefresh, stopRefresh, stopAllRefresh } from '../../../src/modules/lab/refresh.js';
import { exportModule, importModule } from '../../../src/modules/lab/transfer.js';

test('刷新定时器：启动/停止/全停', () => {
  let count = 0;
  const fn = () => count++;
  startRefresh('test-mod', fn, 50);
  stopRefresh('test-mod');
  startRefresh('a', fn, 50);
  startRefresh('b', fn, 50);
  stopAllRefresh();
  // 不抛错即通过（真实定时器行为需浏览器验证）
});

test('导出模块：内部状态（_ 开头）被剥离', () => {
  const mod = {
    id: 'mod-abc', kind: 'stat', title: '测试',
    data: { source: 'posts', api: '/api/posts', path: 'views' },
    render: 'preset', createdBy: 'wizard', _last: Date.now(), _cached: 'xxx',
  };
  const json = exportModule(mod);
  const parsed = JSON.parse(json);
  assert.equal(parsed._last, undefined);
  assert.equal(parsed._cached, undefined);
  assert.equal(parsed.kind, 'stat');
});

test('导入模块：白名单过滤 + 安全字段强制覆盖', () => {
  const json = JSON.stringify({
    kind: 'stat', title: '导入测试',
    data: { source: 'posts', api: '/api/posts', path: 'views', evil: 'hack' },
    render: 'code', createdBy: 'wizard',
    __proto_payload: 'should be stripped',
    unknown_prop: true,
  });
  const mod = importModule(json);
  assert.equal(mod.render, 'preset', 'render 强制为 preset');
  assert.equal(mod.createdBy, 'import');
  assert.ok(mod.id.startsWith('mod-'));
  assert.equal(mod.enabled, true);
  assert.equal(mod.data.evil, undefined, 'data 白名单外字段被剥离');
  assert.equal(mod.unknown_prop, undefined);
  assert.equal(mod.__proto_payload, undefined);
});

test('导入拒绝：非法 JSON / 缺必要字段 / 非 /api/ 路径', () => {
  assert.throws(() => importModule('not json'), /JSON/);
  assert.throws(() => importModule('{}'), /缺少必要字段/);
  assert.throws(() => importModule(JSON.stringify({
    kind: 'stat', data: { source: 'x', api: 'http://evil.com' },
  })), /\/api\//);
});
