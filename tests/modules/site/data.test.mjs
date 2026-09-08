import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { jfetch, unwrap, backBase, frontBase, imgSrc } from '../../../src/modules/site/data/http.js';
import { esc, escAttr, fdate, slugify, emptyCard } from '../../../src/modules/site/data/format.js';

/* ---------- http.js ---------- */

test('jfetch：包装响应原样返回（解包交给 unwrap）', async () => {
  const server = createServer((req, res) => {
    assert.equal(req.headers['content-type'], 'application/json');
    assert.equal(req.headers.authorization, 'Bearer tok-1');
    res.end('{"code":0,"data":{"value":42}}');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let called = false;
  const { setTokenProvider } = await import('../../../src/modules/site/data/http.js');
  setTokenProvider(() => { called = true; return { Authorization: 'Bearer tok-1' }; });
  try {
    const j = await jfetch(`http://127.0.0.1:${server.address().port}/x`);
    assert.deepEqual(j, { code: 0, data: { value: 42 } });
    assert.ok(called, 'tokenProvider 应被调用');
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
});

test('jfetch：FormData 请求不带 JSON Content-Type', async () => {
  const server = createServer((req, res) => {
    assert.ok(!String(req.headers['content-type']).startsWith('application/json'));
    assert.equal(req.headers.authorization, 'Bearer tok-2');
    res.end('{}');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const { setTokenProvider } = await import('../../../src/modules/site/data/http.js');
  setTokenProvider(() => ({ Authorization: 'Bearer tok-2' }));
  try {
    await jfetch(`http://127.0.0.1:${server.address().port}/up`, { method: 'POST', body: new FormData() });
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
});

test('jfetch：401 映射为登录过期文案；403 权限类映射为管理员提示', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/a') { res.statusCode = 401; return res.end('{"detail":"expired"}'); }
    if (req.url === '/b') { res.statusCode = 403; return res.end('{"detail":"Not authenticated"}'); }
    res.statusCode = 500; res.end('{"detail":"boom"}');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    await assert.rejects(jfetch(`http://127.0.0.1:${server.address().port}/a`), /未登录或登录已过期/);
    await assert.rejects(jfetch(`http://127.0.0.1:${server.address().port}/b`), /需要管理员登录/);
    await assert.rejects(jfetch(`http://127.0.0.1:${server.address().port}/c`), /boom/);
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
});

test('unwrap：{code,data} 包装与裸形状双兼容；code!==0 抛业务错误', () => {
  assert.deepEqual(unwrap({ code: 0, data: [1, 2] }), [1, 2]);
  assert.deepEqual(unwrap([{ id: 1 }]), [{ id: 1 }]);
  assert.throws(() => unwrap({ code: 1, message: 'denied' }), /denied/);
  // 契约已知怪癖：/api/visitors/count 返回 {code:0,count:n} 无 data 字段，
  // unwrap 对其返回 undefined——这正是 api-contracts.md 要求"不能一律取 data"的原因，
  // 调用方（loadVisitors 等）不得对 count 响应使用 unwrap。断言固化此行为。
  assert.equal(unwrap({ code: 0, count: 9 }), undefined);
});

test('地址解析：pocket.server 优先，/images 走前台，其余走后端', () => {
  const origin = localStorageSnapshot();
  globalThis.localStorage = {
    getItem: k => (k === 'pocket.server' ? 'http://192.168.10.83:8000/' : null),
    setItem() {},
  };
  try {
    assert.equal(backBase(), 'http://192.168.10.83:8000');
    assert.ok(frontBase().startsWith('http://localhost:3000'));
    assert.equal(imgSrc('/images/a.webp'), 'http://localhost:3000/images/a.webp');
    assert.equal(imgSrc('/uploads/x.mp3'), 'http://192.168.10.83:8000/uploads/x.mp3');
    assert.equal(imgSrc('https://cdn.example.com/p.png'), 'https://cdn.example.com/p.png');
    assert.equal(imgSrc(''), '');
  } finally { globalThis.localStorage = origin; }
});

function localStorageSnapshot() {
  const store = new Map();
  return {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: k => store.delete(k),
  };
}

/* ---------- format.js ---------- */

test('esc：五类字符全部转义（防注入底线）', () => {
  assert.equal(esc(`<img src=x onerror="alert('1')">&`), '&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;');
  assert.equal(escAttr(esc('a<b')), esc(esc('a<b')), 'escAttr 与 esc 同实现');
});

test('fdate：有效日期格式化为 MM-DD HH:mm；无效输入经原文切片逻辑（可能为空串）', () => {
  assert.equal(fdate('2026-09-06T01:30:00'), '09-06 01:30');
  assert.equal(fdate(''), '');
  // 原文行为：非日期字符串走 String(v).slice(5,16) 而非原样返回——逐字迁移，断言固化
  assert.equal(fdate('不是日期'), '');
});

test('slugify：英文规范化；纯中文回退 item-随机（原文行为）', () => {
  assert.equal(slugify('  Hello World! '), 'hello-world');
  assert.match(slugify('分类名'), /^item-[0-9a-z]+$/);
  assert.match(slugify(''), /^item-[0-9a-z]+$/);
});

test('emptyCard：毛玻璃卡片文案结构', () => {
  assert.ok(emptyCard('暂无').includes('class="card"'));
  assert.ok(emptyCard('暂无').includes('暂无'));
});
