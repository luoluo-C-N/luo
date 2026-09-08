// 自起 dev server 的冒烟检查包装器。
// 解决 smoke-check.mjs 依赖「假定 dev server 已在运行」的问题——
// 本地直接 `npm run smoke` 与 CI 中均可独立执行，无需人工先起服务。
// 端口默认 8790（避开 8787，防止与正在运行的 dev server 冲突）。
import {spawn} from 'node:child_process';

const port = Number(process.env.SMOKE_PORT || 8790);
const base = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, ['scripts/server.mjs'], {
  env: {...process.env, PORT: String(port)},
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverLog = '';
server.stdout.on('data', d => { serverLog += d; });
server.stderr.on('data', d => { serverLog += d; });

async function waitReady() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(base + '/');
      if (res.ok) return true;
    } catch { /* 服务未就绪，继续等待 */ }
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

let exitCode = 1;
try {
  if (!(await waitReady())) {
    console.error(`冒烟失败：dev server 未在 10 秒内就绪。服务日志：\n${serverLog}`);
    process.exit(1);
  }
  const check = spawn(process.execPath, ['scripts/smoke-check.mjs'], {
    env: {...process.env, SMOKE_URL: base},
    stdio: 'inherit'
  });
  exitCode = await new Promise(resolve => check.on('exit', code => resolve(code ?? 1)));
} finally {
  server.kill();
}

process.exit(exitCode);
