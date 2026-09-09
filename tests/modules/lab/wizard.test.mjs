import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FORMS,
  ACTIONS,
  STEPS,
  createDraft,
  nextStep,
  prevStep,
  canAdvance,
  suggestFields,
  pickFromSample,
  buildModuleDraft,
} from '../../../src/modules/lab/wizard.js';
import { getSource } from '../../../src/modules/lab/sources.js';

test('七种形态与 ADR-0002 一致，且每种都有中文名与提示', () => {
  const ids = FORMS.map((f) => f.id);
  assert.deepEqual(ids, ['stat', 'status', 'progress', 'list', 'dynlist', 'chart', 'toggle']);
  for (const f of FORMS) {
    assert.ok(f.name && f.hint, `${f.id} 缺中文名或提示`);
  }
});

test('步骤流转：五步、边界不越界、未选不可前进', () => {
  assert.equal(STEPS.length, 5);
  let s = createDraft();
  assert.equal(canAdvance(s), false, '未选形态不能前进');
  s = { ...s, form: 'stat' };
  assert.equal(canAdvance(s), true);
  s = nextStep(s);
  assert.equal(s.step, 1);
  assert.equal(canAdvance(s), false, '未选数据源不能前进');
  s = { ...s, sourceId: 'comments' };
  s = nextStep(s);
  assert.equal(canAdvance(s), false, '未选字段不能前进');
  s = { ...s, path: 'content' };
  assert.equal(canAdvance(s), true);
  s = prevStep(prevStep(prevStep(s)));
  assert.equal(s.step, 0, '回退到首步即停');
});

test('字段建议：按形态偏好排序（数值形态优先 number 字段）', () => {
  const fields = suggestFields({ form: 'stat', sourceId: 'systemStatus' });
  assert.ok(fields.length > 0);
  assert.equal(fields[0].type, 'number', '数值卡片应优先推荐数字字段');
  const comments = suggestFields({ form: 'list', sourceId: 'comments' });
  assert.equal(comments[0].type, 'text', '列表形态应优先推荐文本字段');
});

test('点选样例生成路径，且保存了用户看到的值（不暴露表达式）', () => {
  const sample = [{ content: '你好', status: 'pending', views: 3 }];
  let s = { ...createDraft(), form: 'list', sourceId: 'comments', sample, step: 2 };
  s = pickFromSample(s, 0, 'content');
  assert.equal(s.path, 'content');
  assert.equal(s.pickedValue, '你好');
  // 恶意键不应被接受
  const evil = pickFromSample({ ...s, sample: [{ __proto__: {} }] }, 0, '__proto__');
  assert.equal(evil.path, 'content', '原型链键应被拒绝，路径保持不变');
});

test('生成模块定义：结构完整、不含代码、带中文标题', () => {
  const s = {
    ...createDraft(),
    form: 'list',
    sourceId: 'comments',
    path: 'content',
    transform: 'filterStatus',
    transformParam: { value: 'pending' },
    formatter: 'text',
    action: 'approve',
  };
  const draft = buildModuleDraft(s);
  assert.equal(draft.kind, 'list');
  assert.equal(draft.render, 'preset', '零代码产物必须走预设渲染，不是自定义代码');
  assert.equal(draft.data.source, 'comments');
  assert.equal(draft.data.path, 'content');
  assert.equal(draft.action, 'approve');
  assert.ok(draft.title.includes('评论'), '标题应含数据源中文名');
  assert.ok(!JSON.stringify(draft).includes('function'), '模块定义不得包含函数/代码');
});

test('未选数据源直接生成应报错（防半成品落库）', () => {
  assert.throws(() => buildModuleDraft({ ...createDraft(), form: 'stat' }), /未选择数据源/);
});

test('动作预设：需要 id 的动作都有 method 与路径语义', () => {
  const byId = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));
  assert.equal(byId.approve.method, 'PUT');
  assert.equal(byId.delete.method, 'DELETE');
  assert.equal(byId.none.needId, false);
  for (const a of ACTIONS.filter((x) => x.id !== 'none')) {
    assert.ok(a.method, `${a.id} 缺 method`);
    assert.equal(a.needId, true);
  }
});

test('数据源与形态可组合出「待审评论」模块（ADR-0002 验收场景）', () => {
  const source = getSource('comments');
  assert.ok(source && source.admin, '评论属管理接口');
  const s = {
    ...createDraft(),
    form: 'list',
    sourceId: 'comments',
    path: 'content',
    transform: 'filterStatus',
    transformParam: { value: 'pending' },
    formatter: 'text',
    action: 'approve',
  };
  assert.equal(canAdvance({ ...s, step: 4 }), true);
  const draft = buildModuleDraft(s);
  assert.equal(draft.data.api, '/api/comments/admin?status=pending');
});
