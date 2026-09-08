/**
 * lab 模块清单 —— 自编译工作台（原 prototype.js 模块平台迁入）
 *
 * 契约：docs/架构设计-v1.0.md §5.1 · 功能：docs/功能设计-v1.0.md §4.3
 * 演进：v0.04 在此之上实现零代码绑定引擎（点选式字段选择器，见 ADR-0002）
 */
export default {
  id: 'lab',
  name: '实验室',
  icon: '🧪',
  version: '0.1.0',
  nav: 'tool',
  order: 60,
  permissions: ['storage', 'net'],
  async mount(ctx) {
    labState.ctx = ctx;
    // TODO(v0.04): 零代码绑定向导接入内核能力
  },
  unmount() { labState.ctx = null; },
};

export const labState = { ctx: null };
