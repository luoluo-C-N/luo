import test from 'node:test';
import assert from 'node:assert/strict';

import { createBus } from '../../src/core/bus.js';

test('订阅与广播', () => {
  const bus = createBus();
  const got = [];
  bus.on('site:pending-changed', (payload) => got.push(payload));
  const result = bus.emit('site:pending-changed', { count: 3 });
  assert.deepEqual(got, [{ count: 3 }]);
  assert.deepEqual(result, { delivered: 1, errors: 0 });
});

test('取消订阅后不再收到（on 返回 off）', () => {
  const bus = createBus();
  let hits = 0;
  const off = bus.on('evt', () => { hits += 1; });
  bus.emit('evt');
  off();
  bus.emit('evt');
  assert.equal(hits, 1);
  assert.equal(bus.listenerCount('evt'), 0);
});

test('once 只触发一次', () => {
  const bus = createBus();
  let hits = 0;
  bus.once('evt', () => { hits += 1; });
  bus.emit('evt');
  bus.emit('evt');
  assert.equal(hits, 1);
});

test('单个监听器抛异常不影响其他监听器，也不影响 emit 调用方', () => {
  const bus = createBus();
  const got = [];
  bus.on('evt', () => { throw new Error('我炸了'); });
  bus.on('evt', (p) => got.push(p));
  bus.on('evt', () => { throw new Error('我也炸了'); });

  const result = bus.emit('evt', 'payload');
  assert.deepEqual(result, { delivered: 1, errors: 2 });
  assert.deepEqual(got, ['payload']);

  const failures = bus.drainFailures();
  assert.equal(failures.length, 2);
  assert.equal(bus.drainFailures().length, 0);
});

test('监听器在回调中取消订阅不会导致迭代异常', () => {
  const bus = createBus();
  let hits = 0;
  const off = bus.on('evt', () => {
    hits += 1;
    off();
  });
  bus.on('evt', () => { hits += 10; });
  bus.emit('evt');
  bus.emit('evt');
  assert.equal(hits, 11 + 10);
});

test('跨模块通信：A 发 B 收，双方互不 import', () => {
  const bus = createBus();
  const received = [];
  // 模拟 remind 模块监听 site 模块的事件
  bus.on('site:pending-changed', ({ count }) => received.push(`remind:${count}`));
  // 模拟 site 模块内部状态变化后广播
  bus.emit('site:pending-changed', { count: 7 });
  assert.deepEqual(received, ['remind:7']);
});

test('clear 清空订阅', () => {
  const bus = createBus();
  bus.on('a', () => {});
  bus.on('b', () => {});
  bus.clear('a');
  assert.equal(bus.listenerCount('a'), 0);
  assert.equal(bus.listenerCount('b'), 1);
  bus.clear();
  assert.equal(bus.listenerCount('b'), 0);
});
