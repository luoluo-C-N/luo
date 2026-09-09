import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter, sanitizeInput, debounce } from '../../src/modules/lab/perf.js';

test('rate limiter：限制内通过，超限拒绝', () => {
  const rl = createRateLimiter(3, 1000);
  assert.equal(rl.check(), true);
  assert.equal(rl.check(), true);
  assert.equal(rl.check(), true);
  assert.equal(rl.check(), false, '第 4 次应被拒绝');
  assert.equal(rl.remaining, 0);
});

test('输入清洗：移除 HTML 标签 + JS 协议 + 事件属性', () => {
  assert.equal(sanitizeInput('<script>alert(1)</script>hello'), 'alert(1)hello');
  assert.equal(sanitizeInput('<img src=x onerror=alert(1)>text'), 'text');
  assert.equal(sanitizeInput('javascript:void(0)'), 'void(0)');
  assert.equal(sanitizeInput('  正常文本  '), '正常文本');
  assert.equal(sanitizeInput(123), '');
  assert.equal(sanitizeInput('a'.repeat(600)).length, 500, '超长截断到 500');
});

test('防抖：快速调用只执行一次', async () => {
  let count = 0;
  const fn = debounce(() => count++, 50);
  fn(); fn(); fn(); fn();
  assert.equal(count, 0, '同步阶段不执行');
  await new Promise(r => setTimeout(r, 100));
  assert.equal(count, 1, '100ms 后只执行 1 次');
});
