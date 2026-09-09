/**
 * 内核接线（v0.02）：
 * 1. 静态导入 site / lab 模块入口 —— 副作用是把过渡层全局符号挂到 globalThis，
 *    这一步先于内核，保证即使内核启动失败，已迁移功能依旧可用（故障隔离）。
 * 2. 动态启动内核：登记模块、建立 ctx、渲染导航（挂载点为空表示仍由 index.html
 *    静态结构 + 过渡层驱动，v0.03 起逐步由模块自行渲染接管）。
 * 3. 最后加载启动期初始化（src/boot/init.js 的 IIFE / 监听器 / 轮询注册）。
 */
import '../modules/site/index.js';
import '../modules/lab/index.js';

let core = null;
try {
  const { bootstrap } = await import('../core/index.js');
  const { createPreferencesDriver } = await import('../core/capabilities.js');
  const { createVault } = await import('../core/vault.js');
  const [{ default: site }, { default: lab }, { default: password }, { default: wallet }] = await Promise.all([
    import('../modules/site/manifest.js'),
    import('../modules/lab/manifest.js'),
    import('../modules/password/manifest.js'),
    import('../modules/wallet/manifest.js'),
  ]);
  // driver 由内核与 vault 共用（v0.03 安全地基：主密码派生密钥，明永不落盘）
  const driver = createPreferencesDriver();
  const vault = createVault({ driver });
  core = await bootstrap({
    modules: [site, lab, password, wallet],
    mountRoot: null,
    navRoot: null,
    defaultModule: null,
    driver,
    vault,
  });
  core.vault = vault;
} catch (error) {
  // 内核失败只降级内核能力：迁移期 UI 仍完整可用
  console.error('[core] 内核启动失败，已降级（功能不受影响）', error);
}

await import('./init.js');

export default core;
