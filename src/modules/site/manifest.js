/**
 * site 模块清单 —— 网站管理（存量功能迁入，见 docs/plans/site-migration.md）
 *
 * 契约：docs/架构设计-v1.0.md §5.1 ModuleManifest
 * 功能：docs/功能设计-v1.0.md §4.1
 */
export default {
  id: 'site',
  name: '网站',
  icon: '🌐',
  version: '0.2.0',
  nav: 'tab',
  order: 10,
  permissions: ['storage', 'net'],

  /**
   * S1 阶段为占位：视图自 S3 起逐个迁入（状态页 → 审核 → 内容…）。
   * 内核尚未接线时本函数不会被运行时调用；测试用空 ctx 保证可调用。
   * @param {import('../../core/capabilities.js').ModuleContext} ctx
   */
  async mount(ctx) {
    siteState.ctx = ctx;
    // TODO(S3): 挂载状态页视图；TODO(S5): 装配看板/内容/音乐（按迁移方案 S1-S7 顺序）
  },

  unmount() {
    siteState.ctx = null;
    // TODO(S3+): 各视图迁入后，在此统一清理其定时器与监听器（架构 §6.2 强制项）
  },

  onShow() { /* TODO(S4): 审核页回到前台时刷新待审数 */ },
  onHide() { /* TODO(S3): 状态页轮询暂停 */ },
};

/** 模块内单例状态（迁移期允许；模块化重构属后续任务，见方案 §7 风险 5） */
export const siteState = { ctx: null };
