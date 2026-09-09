/**
 * password 模块 —— 密码管理器（v0.06 · 首个 vault 敏感模块）
 *
 * 安全模型：
 *  - 数据用 ctx.vault 加密后才落盘（AES-GCM，主密码派生密钥）
 *  - vault 未解锁时列表不可见（只显示条数）
 *  - 复制到剪贴板后 15s 自动清除（架构 §12.1）
 */
export default {
  id: 'password',
  name: '密码',
  icon: '🔐',
  version: '0.1.0',
  nav: 'tool',
  order: 70,
  permissions: ['storage', 'vault'],
  async mount(ctx) { pwState.ctx = ctx; },
  unmount() { pwState.ctx = null; },
};

export const pwState = { ctx: null, entries: [] };
