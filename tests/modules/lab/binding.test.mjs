import test from 'node:test';
import assert from 'node:assert/strict';
import { DATA_SOURCES, getSource, listSources } from '../../../src/modules/lab/sources.js';
import {
  isSafePath,
  resolvePath,
  describePath,
  applyBinding,
  listFormatters,
  listTransforms,
} from '../../../src/modules/lab/binding.js';

test('数据源注册表：18 个模块全部可零代码接入（ADR-0002 验收项）', () => {
  assert.ok(DATA_SOURCES.length >= 18, `登记数据源应 ≥18，实际 ${DATA_SOURCES.length}`);
  const ids = DATA_SOURCES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'id 不得重复');
  for (const s of DATA_SOURCES) {
    assert.ok(s.api.startsWith('/api/'), `${s.id} 的 api 应为相对路径`);
    assert.ok(Array.isArray(s.fields) && s.fields.length > 0, `${s.id} 应有字段元数据`);
  }
  assert.deepEqual(listSources().length, DATA_SOURCES.length);
  assert.ok(getSource('comments'), '应能按 id 取到评论数据源');
  assert.equal(getSource('not-exist'), null);
});

test('路径安全：拒绝原型链与非法字符（注入防线）', () => {
  assert.equal(isSafePath('title'), true);
  assert.equal(isSafePath('author.name'), true);
  assert.equal(isSafePath('__proto__'), false);
  assert.equal(isSafePath('a.constructor'), false);
  assert.equal(isSafePath('a.prototype.b'), false);
  assert.equal(isSafePath('a-b'), false);
  assert.equal(isSafePath('a[b]'), false);
  assert.equal(isSafePath(''), false);
  assert.equal(isSafePath(null), false);
  assert.throws(() => resolvePath({ a: 1 }, '__proto__'), /不合法/);
});

test('路径取值：支持嵌套与数组首元素（卡片直接绑定列表）', () => {
  assert.equal(resolvePath({ title: 'T' }, 'title'), 'T');
  assert.equal(resolvePath({ github_user: { login: 'luo' } }, 'github_user.login'), 'luo');
  assert.equal(resolvePath([{ title: 'A' }, { title: 'B' }], 'title'), 'A');
  assert.equal(resolvePath({ a: null }, 'a.b.c'), undefined);
});

test('中文面包屑：路径对用户不可见', () => {
  const source = getSource('comments');
  assert.equal(describePath(source, 'content'), '内容');
  assert.equal(describePath(source, 'author_name'), '作者');
  assert.equal(describePath(source, 'unknown_field'), 'unknown_field');
});

test('格式化预设：数字/时长/相对时间/布尔', () => {
  const f = listFormatters().map((x) => x.id);
  assert.ok(f.includes('thousand') && f.includes('percent') && f.includes('bytes'));
  assert.equal(applyBinding({ path: 'views', formatter: 'thousand' }, [{ views: 12345 }])[0], '12,345');
  assert.equal(applyBinding({ path: 'n', formatter: 'bool' }, [{ n: 1 }])[0], '是');
  assert.equal(applyBinding({ path: 'n', formatter: 'bool' }, [{ n: 0 }])[0], '否');
  assert.equal(applyBinding({ path: 'u', formatter: 'duration' }, [{ u: 90000 }])[0], '1天1小时');
  assert.equal(applyBinding({ path: 'u', formatter: 'duration' }, [{ u: 3660 }])[0], '1小时1分');
  assert.equal(applyBinding({ path: 't', formatter: 'relativeTime' }, [{ t: Date.now() - 120000 }])[0], '2 分钟前');
});

test('变换预设：取前N/去重/计数/求和/状态筛选', () => {
  const ids = listTransforms().map((x) => x.id);
  assert.ok(ids.includes('firstN') && ids.includes('count') && ids.includes('sum'));
  const rows = [
    { status: 'pending', views: 10 },
    { status: 'approved', views: 30 },
    { status: 'pending', views: 5 },
  ];
  assert.equal(applyBinding({ transform: 'firstN', transformParam: { n: 2 }, path: 'views' }, rows).length, 2);
  assert.equal(applyBinding({ transform: 'count' }, rows), 3);
  assert.equal(applyBinding({ transform: 'sum', transformParam: { by: 'views' } }, rows), 45);
  assert.equal(applyBinding({ transform: 'filterStatus', transformParam: { value: 'pending' }, path: 'views' }, rows).length, 2);
  assert.deepEqual(applyBinding({ transform: 'distinct' }, [1, 1, 2]), [1, 2]);
});

test('端到端：零代码绑定「待审评论内容列表」', () => {
  const source = getSource('comments');
  const data = [
    { content: '第一篇', status: 'pending', created_at: '2026-09-09T08:00:00' },
    { content: '第二篇', status: 'pending', created_at: '2026-09-09T09:00:00' },
  ];
  const binding = {
    source,
    path: 'content',
    transform: 'filterStatus',
    transformParam: { value: 'pending' },
    formatter: 'text',
  };
  assert.deepEqual(applyBinding(binding, data), ['第一篇', '第二篇']);
  assert.equal(describePath(source, binding.path), '内容');
});
