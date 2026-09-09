/**
 * remind 模块 —— 通知提醒中心（v0.05 骨架）
 *
 * 职责：轮询待审数 + 系统告警 → 本地通知 → 状态栏红点
 * 当前实现：骨架 + 轮询注册；后续接入 LocalNotifications 插件推送
 */
export default {
  id: 'remind',
  name: '提醒',
  icon: '🔔',
  version: '0.1.0',
  nav: 'hidden',
  order: 40,
  permissions: ['storage', 'net', 'notify'],

  async mount(ctx) {
    remindState.ctx = ctx;
    // 轮询逻辑在 boot/init.js 的 regPoll(notifCheck, 30000) 中
  },
  unmount() { remindState.ctx = null; },
};

export const remindState = { ctx: null };
