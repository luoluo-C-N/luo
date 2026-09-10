/**
 * 前后端联调 E2E（真实后端 + Playwright）
 *
 * 与 e2e-browser.mjs 的区别：这个脚本连**真实后端**（隔离实例 8011），
 * 验证「前端不只是不报错，而是数据是对的」。
 *
 * 前置：
 *   1. npm run backend:start（后台启动隔离后端，生成 artifacts/test-backend/fixture.json）
 *   2. npm run build
 *
 * 用法：node tests/e2e-integration.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(import.meta.dirname ?? '.', '..');
const DIST = join(ROOT, 'dist');
const PORT = 5173; // 必须落在后端 CORS 白名单内（CORS_ORIGINS 含 http://localhost:5173）

/* ── 读 fixture（后端凭据与数据 id） ── */
const FX_PATH = join(ROOT, 'artifacts/test-backend/fixture.json');
if (!existsSync(FX_PATH)) {
  console.error('✗ 未找到 fixture.json —— 请先运行: npm run backend:start');
  process.exit(1);
}
const fx = JSON.parse(readFileSync(FX_PATH, 'utf-8'));

/* ── 静态服务器 ── */
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f)) { res.writeHead(200, { 'Content-Type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});

/* ── 登录真实后端拿 token（Node fetch 不经系统代理，直连 loopback） ── */
async function login() {
  const r = await fetch(fx.baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: fx.username, password: fx.password }),
  });
  if (!r.ok) throw new Error(`登录失败 HTTP ${r.status}`);
  const j = await r.json();
  return j.data.accessToken;
}

let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' → ' + extra : ''}`); }
}

async function run() {
  console.log(`后端: ${fx.baseUrl}`);
  const token = await login();
  console.log(`登录成功，token 长度 ${token.length}\n`);

  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-proxy-server'], // 关键：绕开系统 HTTP_PROXY，否则 loopback 会被代理拦截
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  // 注入后端地址 + 登录态（模拟用户已配置后端并登录）
  await context.addInitScript(([base, tk, user]) => {
    localStorage.setItem('pocket.server', base);
    localStorage.setItem('authToken', tk);
    localStorage.setItem('authUser', JSON.stringify(user));
  }, [fx.baseUrl, token, { nickname: '隔离测试管理员', username: fx.username }]);

  const page = await context.newPage();
  const errors = [];
  const httpErrors = [];
  page.on('response', (r) => {
    if (r.status() >= 400) httpErrors.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
  });
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  console.log('--- 1. 前端通过 jfetch 调真实后端（含鉴权）---');
  const apiProbe = await page.evaluate(async () => {
    const out = {};
    try {
      const { jfetch, backBase } = await import('/src/modules/site/data/http.js');
      const base = backBase();  // 前端真实约定：调用方自己拼 API_BASE
      const auth = await jfetch(base + '/api/auth/me');
      out.me = auth?.data?.username ?? null;
      out.roles = auth?.data?.roles ?? null;
      const posts = await jfetch(base + '/api/posts?size=5');
      const rows = Array.isArray(posts) ? posts : (posts?.data ?? []);
      out.postTitle = rows[0]?.title ?? null;
      out.postCount = rows.length;
    } catch (e) { out.error = String(e && e.message); }
    return out;
  });
  check('前端 jfetch 能取到当前用户', apiProbe.me === fx.username, String(apiProbe.error ?? apiProbe.me));
  check('用户角色为 admin', Array.isArray(apiProbe.roles) && apiProbe.roles.includes('admin'), JSON.stringify(apiProbe.roles));
  check('能拉到文章列表', apiProbe.postCount > 0, `count=${apiProbe.postCount}`);
  check('文章标题来自真实后端', apiProbe.postTitle === '真实后端联调样例', String(apiProbe.postTitle));

  console.log('\n--- 2. 待审数据可见（审核契约）---');
  const pending = await page.evaluate(async () => {
    const out = {};
    try {
      const { jfetch, backBase } = await import('/src/modules/site/data/http.js');
      const base = backBase();
      const c = await jfetch(base + '/api/comments/admin?status=pending&size=20');
      const m = await jfetch(base + '/api/messages/admin?status=pending&size=20');
      const cRows = Array.isArray(c) ? c : (c?.data ?? []);
      const mRows = Array.isArray(m) ? m : (m?.data ?? []);
      out.pendingComments = cRows.length;
      out.pendingMessages = mRows.length;
      out.hasPending = cRows.some(r => r.status === 'pending' && r.content === '待审核评论');
      out.approvedParentIncluded = cRows.some(r => r.status !== 'pending'); // 嵌套上下文语义
    } catch (e) { out.error = String(e && e.message); }
    return out;
  });
  check('待审评论可拉取', pending.pendingComments > 0, `count=${pending.pendingComments}`);
  check('待审留言可拉取', pending.pendingMessages > 0, `count=${pending.pendingMessages}`);
  check('待审评论含 fixture 的 pending 项', pending.hasPending === true, String(pending.error ?? ''));
  console.log(`    附注：响应含非 pending 父评论（嵌套上下文）= ${pending.approvedParentIncluded}，属契约语义，非缺陷`);

  console.log('\n--- 3. UI 层渲染真实数据 ---');
  const ui = await page.evaluate(async () => {
    const out = {};
    try {
      if (typeof window.loadPosts === 'function') window.loadPosts();
      await new Promise(r => setTimeout(r, 1500));
      const html = document.body.innerHTML;
      out.hasFixtureTitle = html.includes('真实后端联调样例');
      out.backendOk = window.BACKEND_OK === true;
    } catch (e) { out.error = String(e && e.message); }
    return out;
  });
  check('看板/内容 UI 渲染出 fixture 文章', ui.hasFixtureTitle, String(ui.error ?? ''));
  check('前端标记后端连通', ui.backendOk === true, `BACKEND_OK=${ui.backendOk}`);

  console.log('\n--- 4. 无 JS 报错 ---');
  const real = errors.filter((e) => !/Failed to fetch|net::ERR|ERR_CONNECTION/.test(e));
  check(`无严重 JS 错误（${real.length}）`, real.length === 0);
  real.slice(0, 4).forEach((e) => console.log('    ' + e.slice(0, 100)));
  console.log(`\n--- 5. HTTP 错误响应（≥400）---`);
  const uniq = [...new Set(httpErrors)];
  console.log(`  共 ${httpErrors.length} 次，去重 ${uniq.length} 项`);
  uniq.slice(0, 8).forEach((e) => console.log('    ' + e));

  await page.screenshot({ path: join(ROOT, 'dist', 'integration-screenshot.png') });
  console.log('\n截图: dist/integration-screenshot.png');
  await browser.close();
  server.close();

  console.log(`\n===== 联调结果: ${pass} 通过 / ${fail} 失败 =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('联调执行失败:', e.message); process.exit(1); });
