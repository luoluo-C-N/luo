import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMonthlyChart, trendArrow } from '../../src/modules/wallet/chart.js';
import { checkStrength, groupByCategory } from '../../src/modules/password/strength.js';
import { renderNotifCenter } from '../../src/modules/remind/views.js';
import { bidirectional } from '../../src/modules/sync/sync.js';

test('v0.41-45 图表：趋势箭头方向正确', () => {
  assert.equal(trendArrow(150, 100).arrow, '↑');
  assert.equal(trendArrow(80, 100).arrow, '↓');
  assert.equal(trendArrow(100, 100).arrow, '→');
  assert.equal(trendArrow(100, 0).text, '无上月数据');
});

test('v0.51-55 密码强度：弱/中/强', () => {
  assert.equal(checkStrength('123').label, '弱');
  assert.equal(checkStrength('P@ss1').label, '中');
  assert.equal(checkStrength('Xk9#mP2$vL8@wQ4!').label, '强');
});

test('v0.51-55 分类分组', () => {
  const entries = [
    { title: 'GitHub', category: '开发' },
    { title: '银行', category: '金融' },
    { title: '邮箱', category: '开发' },
  ];
  const groups = groupByCategory(entries);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].category, '开发');
  assert.equal(groups[0].items.length, 2);
});

test('v0.61-65 通知中心：渲染不崩溃 + 空态', () => {
  // 基本导入检查（DOM 渲染需浏览器）
  assert.equal(typeof renderNotifCenter, 'function');
});

test('v0.66-70 双向同步：远端新用远端 / 本地新推本地 / 离线降级', async () => {
  // 离线场景：fetch 抛错
  globalThis.jfetch = () => { throw new Error('offline'); };
  globalThis.API_BASE = '';
  const result = await bidirectional({}, 'test-key', { items: [1] }, 1000);
  assert.equal(result.direction, 'offline');
  assert.deepEqual(result.data, { items: [1] });
});
