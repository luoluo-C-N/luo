/**
 * wallet 模块 —— 收支记账（v0.07 · vault 加密敏感数据）
 *
 * 记录收入/支出，金额加密存储。图表展示月度汇总。
 */
export default {
  id: 'wallet',
  name: '钱包',
  icon: '💰',
  version: '0.1.0',
  nav: 'tool',
  order: 80,
  permissions: ['storage', 'vault'],
  async mount(ctx) { walletState.ctx = ctx; },
  unmount() { walletState.ctx = null; },
};

export const walletState = { ctx: null, entries: [] };
