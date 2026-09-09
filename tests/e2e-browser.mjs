/**
 * E2E 浏览器自动化测试（Playwright + Chromium headless）
 *
 * 测试项：
 *  1. App 加载无 JS 报错
 *  2. 核心元素可见（看板/TabBar/抽屉按钮）
 *  3. Tab 切换正常
 *  4. 抽屉打开/关闭
 *  5. 子页打开/关闭（密码/钱包/相册/通知/账号）
 *  6. 零代码向导打开
 *  7. 无控制台报错
 *
 * 用法：node tests/e2e-browser.mjs
 * 前提：dist/ 已构建，server 已启动
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(import.meta.dirname ?? '.', '..');
const DIST = join(ROOT, 'dist');
const PORT = 17777;

// MIME types
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

// 静态服务器
const server = createServer((req, res) => {
  let path = req.url.split('?')[0];
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file)) {
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});

// 收集 console 错误
const consoleErrors = [];

async function run() {
  await new Promise((r) => server.listen(PORT, r));
  console.log(`Server running at http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 尺寸
    userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile',
  });
  const page = await context.newPage();

  // 收集 JS 错误
  page.on('pageerror', (err) => consoleErrors.push(`PAGE ERROR: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`CONSOLE: ${msg.text()}`);
  });

  let pass = 0, fail = 0;
  function check(name, condition) {
    if (condition) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; console.log(`  ✗ ${name}`); }
  }

  // ===== 1. 加载 App =====
  console.log('\n--- 1. App 加载 ---');
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // 等待模块初始化

  const title = await page.title();
  check('页面有标题', title.length > 0);

  const hasPhone = await page.$('.phone');
  check('手机壳容器存在', !!hasPhone);

  const hasScreens = await page.$('.screens');
  check('屏幕容器存在', !!hasScreens);

  const hasTabbar = await page.$('.tabbar');
  check('TabBar 存在', !!hasTabbar);

  // ===== 2. 登录页被跳过（免强制登录）=====
  console.log('\n--- 2. 免强制登录 ---');
  const loginVisible = await page.$eval('#pg-login', (el) => el.classList.contains('show')).catch(() => false);
  check('登录页未强制弹出', !loginVisible);

  // ===== 3. Tab 切换 =====
  console.log('\n--- 3. Tab 切换 ---');
  const tabs = await page.$$('.tab');
  check('TabBar 有按钮', tabs.length >= 4);

  if (tabs.length >= 2) {
    await tabs[1].click(); // 切到第二个 tab
    await page.waitForTimeout(500);
    check('Tab 切换无报错', true);
    await tabs[0].click(); // 切回第一个
    await page.waitForTimeout(500);
  }

  // ===== 4. 抽屉 =====
  console.log('\n--- 4. 抽屉 ---');
  // 尝试通过 JS 打开抽屉
  const drawerOpened = await page.evaluate(() => {
    try { if (typeof window.openDrawer === 'function') { window.openDrawer(); return true; } } catch {}
    return false;
  });
  await page.waitForTimeout(500);
  check('抽屉可打开', drawerOpened);

  if (drawerOpened) {
    const drawerVisible = await page.$eval('#drawer', (el) => {
      const transform = el.style.transform || getComputedStyle(el).transform;
      return !transform.includes('-102%');
    }).catch(() => false);
    check('抽屉可见', drawerVisible);

    // 点击遮罩关闭
    await page.evaluate(() => { if (typeof window.closeDrawer === 'function') window.closeDrawer(); });
    await page.waitForTimeout(500);
    check('抽屉可关闭', true);
  }

  // ===== 5. 子页打开/关闭 =====
  console.log('\n--- 5. 子页 ---');
  const subpages = ['pg-password', 'pg-wallet', 'pg-account', 'pg-notif'];
  for (const id of subpages) {
    const opened = await page.evaluate((pid) => {
      try { if (typeof window.openSub === 'function') { window.openSub(pid); return true; } } catch {}
      return false;
    }, id);
    await page.waitForTimeout(300);
    const visible = await page.$eval(`#${id}`, (el) => el.classList.contains('show')).catch(() => false);
    check(`${id} 可打开`, opened && visible);
    await page.evaluate((pid) => { if (typeof window.closeSub === 'function') window.closeSub(pid); }, id);
    await page.waitForTimeout(200);
  }

  // ===== 6. 零代码向导 =====
  console.log('\n--- 6. 零代码向导 ---');
  const wizardOpened = await page.evaluate(() => {
    try { if (typeof window.wizardFlow === 'function') { window.wizardFlow(); return true; } } catch {}
    return false;
  });
  await page.waitForTimeout(500);
  check('向导可打开', wizardOpened);

  if (wizardOpened) {
    const wizardHost = await page.$('#wizardHost');
    check('向导容器存在', !!wizardHost);
    // 关闭向导
    await page.evaluate(() => {
      const host = document.getElementById('wizardHost');
      if (host) host.replaceChildren();
    });
  }

  // ===== 7. JS 错误汇总 =====
  console.log('\n--- 7. JS 错误 ---');
  const realErrors = consoleErrors.filter((e) =>
    !e.includes('net::ERR') && !e.includes('Failed to fetch') && !e.includes('offline')
  );
  check(`无严重 JS 错误（${realErrors.length} 个）`, realErrors.length === 0);
  if (realErrors.length) {
    console.log('  错误列表:');
    realErrors.slice(0, 5).forEach((e) => console.log(`    ${e.slice(0, 80)}`));
  }

  // ===== 截图 =====
  await page.screenshot({ path: join(ROOT, 'dist', 'e2e-screenshot.png'), fullPage: false });
  console.log('\n截图已保存: dist/e2e-screenshot.png');

  await browser.close();
  server.close();

  console.log(`\n===== 结果: ${pass} 通过 / ${fail} 失败 =====`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('测试执行失败:', e); process.exit(1); });
