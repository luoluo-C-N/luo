import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createContext,
  createPreferencesDriver,
  createNet,
  createStore,
} from '../../src/core/capabilities.js';
import { makeManifest, createMemoryStorage } from './helpers/fake-dom.mjs';

test('store 命名空间隔离：两个模块同名 key 互不覆盖', async () => {
  const storage = createMemoryStorage();
  const driver = createPreferencesDriver(storage);
  const a = createStore('wallet', driver);
  const b = createStore('password', driver);

  await a.set('draft', { from: 'wallet' });
  await b.set('draft', { from: 'password' });

  assert.deepEqual(await a.get('draft'), { from: 'wallet' });
  assert.deepEqual(await b.get('draft'), { from: 'password' });

  await a.remove('draft');
  assert.equal(await a.get('draft'), null);
  assert.deepEqual(await b.get('draft'), { from: 'password' });
});

test('store key 带模块前缀落盘，模块无法越界读写', async () => {
  const storage = createMemoryStorage();
  const driver = createPreferencesDriver(storage);
  const store = createStore('site', driver);
  await store.set('token', 'abc');
  assert.equal(storage.getItem('mod:site:token'), '"abc"');
  assert.deepEqual(await store.keys(), ['token']);
});

test('脏数据不会让 store 崩溃', async () => {
  const storage = createMemoryStorage({ 'mod:site:broken': '{不是 json' });
  const driver = createPreferencesDriver(storage);
  const store = createStore('site', driver);
  assert.equal(await store.get('broken'), '{不是 json');
});

test('net 自动拼接 base，消灭硬编码 localhost', async () => {
  const calls = [];
  const net = createNet({
    getBase: () => 'http://192.168.1.9:8000',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const data = await net.request('/api/posts?page=1');
  assert.deepEqual(data, { ok: true });
  assert.equal(calls[0].url, 'http://192.168.1.9:8000/api/posts?page=1');

  net.setBase('https://cloud.example.com/');
  await net.request('/api/ping');
  assert.equal(calls[1].url, 'https://cloud.example.com/api/ping');
});

test('net：http 非 2xx 抛错，raw 模式返回 Response', async () => {
  const net = createNet({
    getBase: () => 'http://x',
    fetchImpl: async () => new Response('nope', { status: 500 }),
  });
  await assert.rejects(() => net.request('/api/a'));
  const res = await net.request('/api/a', { raw: true });
  assert.equal(res.status, 500);
});

test('net：json 简写自动设置 content-type', async () => {
  let seen;
  const net = createNet({
    getBase: () => '',
    fetchImpl: async (url, init) => {
      seen = init;
      return new Response('{}', { status: 200 });
    },
  });
  await net.request('/api/login', { method: 'POST', json: { u: 1 } });
  assert.equal(seen.body, '{"u":1}');
  assert.equal(seen.headers.get('content-type'), 'application/json');
});

test('ctx 只出现已声明的能力', () => {
  const only = createContext(makeManifest({ id: 'a', permissions: ['storage'] }));
  assert.ok(only.store);
  assert.equal('net' in only, false);
  assert.equal('notify' in only, false);
  assert.equal('vault' in only, false);

  const rich = createContext(
    makeManifest({ id: 'b', permissions: ['storage', 'net', 'notify', 'vault'], onLock() {} }),
    { vault: { fake: true } },
  );
  assert.ok(rich.store && rich.net && rich.notify && rich.vault);
});

test('未就绪的 vault 注入 null，模块可据此降级', () => {
  const ctx = createContext(makeManifest({ id: 'c', permissions: ['vault'], onLock() {} }));
  assert.equal(ctx.vault, null);
});

test('ui.esc 防 XSS', () => {
  const ctx = createContext(makeManifest({ id: 'd' }));
  assert.equal(ctx.ui.esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(ctx.ui.esc('a"b\'c&d'), 'a&quot;b&#39;c&amp;d');
});

test('无 localStorage 环境退化为内存存储而不抛错', async () => {
  const driver = createPreferencesDriver(undefined);
  await driver.set('k', 1);
  assert.equal(await driver.get('k'), '1');
});
