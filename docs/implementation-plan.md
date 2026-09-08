# 掌上小站 0.01 Implementation Plan

Goal: 交付保留原型交互且真实连接 Kirameku 的手机管理客户端。
Architecture: 静态原型拆分 UI 资源，独立 API/存储/业务控制器，Node 开发代理，Capacitor Android 容器。
Tech Stack: JavaScript ES modules, Node 24, Capacitor, Playwright, node:test.
Global constraints: 用户指定 E:/glm/appkf；原文件不覆盖；所有接口按实际契约；仅成功写入显示成功；不把演示标成线上数据。

- [x] 1. 工程和 API 层：`src/api.js` 与 API fixture 测试完成。
- [x] 2. v2 原型已从 `reference/admin-app.v2-crud.html` 拆分，含移动端样式与 API 接管。
- [x] 3. `src/editor.js` 真实草稿/发布流程与失败保留测试完成。
- [x] 4. dashboard、内容 CRUD、审核、媒体及隔离后端契约闭环完成。
- [x] 5. PWA manifest/service worker、Capacitor Android 工程、APK 构建与安装说明完成。
- [x] 6. 已完成自动化回归与构建验收；当前环境无真机/模拟器，未宣称真机验收。

验收补充：已启动 `scripts/server.mjs` 做静态运行时检查；首页、manifest 和 service worker 均返回 200。Playwright CLI 已安装但当前机器缺少浏览器二进制（提示需 `npx playwright install`），因此未伪造移动截图结果；待具备浏览器后可直接运行 `npx playwright screenshot --device='iPhone 13' http://127.0.0.1:8787/ artifacts/app-smoke.png`。
