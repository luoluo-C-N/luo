# 开发进度同步（给下次会话/协作者的接手文档）

> **更新**：2026-09-08 23:55 · **分支**：develop · **远端**：github.com/luoluo-C-N/luo
> **用法**：下次打开 WorkBuddy 对我说「读取 docs/DEV-STATUS.md 继续」即可无缝接续。

---

## 一、项目一句话

「掌上小站」——个人超级 App（Capacitor 8.5.1 + 原生 ES Modules，无框架无打包器）。当前包含网站管理（site）与自编译工作台（lab）两个模块；目标形态见 `docs/功能设计-v1.0.md`。

## 二、当前状态（截至本文件更新）

| 项 | 状态 |
|---|---|
| v0.07 钱包模块 | wallet/store.js 收支加密记账 + 月度汇总 + 分类汇总 + 4 项测试 |
| v0.07 钱包模块 | wallet/store.js 收支加密记账 + 月度汇总 + 分类汇总 + 4 项测试 |
| v0.06 密码模块 | password/store.js 加密 CRUD（vault AES-GCM）+ 5 项测试 |
| v0.06 密码模块 | password/store.js 加密 CRUD（vault AES-GCM）+ 5 项测试 |
| 阶段推进 | 15 阶段完成（自动刷新/骨架屏/错误重试/导入导出/remind骨架/暗色快捷/版本号/CSS审计/后端健康指示/模块计数/直达入口×3） |
| 阶段推进 | 15 阶段完成（自动刷新/骨架屏/错误重试/导入导出/remind骨架/暗色快捷/版本号/CSS审计/后端健康指示/模块计数/直达入口×3） |
| 最新提交 | 见 `git log --oneline -5`（develop 分支，全部已推送） |
| 可运行产物 | `release/kirameku-0.01-debug.apk`（debug 签名，v2 验证通过） |
| 最新提交 | 见 git log（15+ commits pushed） |
| 注册模块 | site + lab + password + wallet + sync + album（6 模块） |
| 注册模块 | site + lab + password + wallet + sync + album（6 模块） |
| v0.11-15 | 钱包UI+同步骨架+相册骨架+集成测试+暗色快捷+骨架屏+重试 |
| v0.11-15 | 钱包UI+同步骨架+相册骨架+集成测试+暗色快捷+骨架屏+重试 |
| 测试 | `npm test` 全绿（69 项，含 4 项内核接线契约）· `npm run build` 65 资产 · `npm run smoke` 5 项 |
| 后端契约 | `python tests/backend-contracts.py` 17/17（需 8011 隔离后端） |

### 已完成里程碑

- ✅ **M0 基线**：源码全量入 Git、CI 建立、流程/风险/环境文档齐、生产库已备份
- ✅ **T-SITE-PLAN 迁移**：208 个函数从 3,553 行单体迁入 `modules/site/`（24 文件，全部 ≤300 行）
- ✅ **lab 迁出**：69 个函数迁入 `modules/lab/`
- ✅ **T4.8**：`prototype.js` 已删除——状态入 `modules/{site,lab}/state.js`，启动初始化入 `src/boot/init.js`
- ✅ **5 项真机 UX 修复**：安全区适配 / 免强制登录 / 抽屉易滑出 / 抽屉实色 / 页面不被拖飞
- ✅ **v0.02 内核接线**：单入口 src/boot/kernel.js（静态导入 site/lab 暴露过渡层 → 动态启动内核登记模块建 ctx → 最后加载启动初始化）；内核失败仅降级内核能力
- ✅ **v0.03 vault 完整**：src/core/vault.js + pg-account 页面 UI（设置主密码/解锁/锁定三态切换）：src/core/vault.js（PBKDF2-SHA256 12 万次派生 + AES-GCM；仅存盐与校验密文，锁定即丢弃内存密钥；5 分钟自动锁定）；已注入内核 ctx（仅对声明 vault 权限的模块可见）
- ✅ **v0.04 零代码创建向导**：lab/wizard.js（5 步：形态→数据源→点样例选字段→格式化/变换→动作）+ lab/style.css + 二次开发页「✨ 零代码创建」入口；8 项契约测试
- ✅ **v0.04 零代码绑定（完整闭环）**：向导创建 → renderModInto 走 preset 分支 → preset-render.js 按 7 形态渲染 → 动作按钮（通过/拒绝/删除/置顶）→ 执行后标记完成
- ✅ **仓库精简**：lab/sources.js 18 个数据源注册表 + lab/binding.js（安全路径解析/中文面包屑/8 种格式化/7 种变换）+ 7 项契约测试；**待做**：点选式字段选择器 UI 与动作绑定
- ✅ **仓库精简**：移除废弃脚本、旧原型快照、Capacitor 模板测试、迁移期死代码

### 架构速览

```
index.html（外壳）
  ├─ boot.js                fetch 重定向（同步加载）
  ├─ modules/site/index.js  ES module，暴露 190+ 符号到 globalThis（过渡层）
  ├─ modules/lab/index.js   ES module，暴露 67 符号
  └─ boot/init.js           启动期初始化（IIFE/监听器/轮询，最后加载）

modules/site/   10 视图 + 5 壳层 + 3 主题 + data(3) + state + manifest
modules/lab/    自编译工作台（templates/manager/editor/panels/share + state）
src/core/       内核（另一会话建设，尚未接线到 index.html 启动链）
src/ui/tokens.css  设计令牌单一事实源（有快照测试保护）
```

**过渡层机制**（重要）：视图函数以裸标识符互调（globalThis 属性解析），`exposeGlobals` 在模块装载时建立。v0.03+ 改事件绑定后退场。

## 三、待办（按优先级）

1. **🔴 真机全功能复核**（用户）：装最新 APK 点全流程——看板数字/文章发布→前台可见/审核/音乐/自定义模块/深色模式/壁纸/抽屉手势/安全区
2. **v0.02 收尾**：内核 `src/core/`（已有 bus/capabilities/errors/registry/router，另一会话建）接入 index.html 启动链，site/lab 的 mount 真正挂进内核，故障隔离测试通过
3. **v0.03（剩余）**：vault 设置 UI（设置主密码/解锁/自动锁定开关）+ 收紧 cleartext 配置（准入条件见架构 §8.3）
4. **v0.04**：lab 零代码绑定引擎——点选式字段选择器（ADR-0002），验收：零代码建「待审评论」模块 ≤60s
5. **v0.05/v0.06**：album 图床 → password/wallet 敏感模块
6. 密码管理 UI 已就绪（pg-password 列表+添加+复制+删除）；钱包 UI 建设中（存储层已就绪）
7. 小尾巴：`core/capabilities.js` 里 1 处硬编码地址（内核会话范围）；`掌上小站-v0.01-debug.apk` 旧产物可删

## 四、关键决策（详见 docs/ADR/）

| ADR | 决策 |
|---|---|
| 0001 | 内核化模块架构；prototype.js 冻结（现已删除） |
| 0002 | 绑定用点选式字段选择器，不提供表达式编辑器；代码模式保留为逃生舱 |

## 五、红线（违反即返工）

1. 不改 `src/core/`（除非任务是内核任务且已获准）
2. 不碰生产后端 8000 的写接口；破坏性验证只打 8011（见 docs/environments.md）
3. 毛玻璃令牌（src/ui/tokens.css）改动需设计评审（有快照测试）
4. 完成 = DoD 全勾（docs/PROCESS.md §3）
5. **迁移/脚本工具必须先写目标文件再删源 + 全文件语法门禁**（S4 损坏事故教训）

## 六、已知坑（省你时间）

- `git rm` 多路径在本机会把整个工作区被跟踪文件删光 → 用 `rm` + `git add -A` 替代；出事就 `git reset --hard HEAD`（内容都在远端）
- PowerShell 工具拉不起 node/apksigner；`cmd //c` 只开不跑 → 构建 APK 用 Bash：导出 JAVA_HOME/ANDROID_HOME/GRADLE_USER_HOME 后 `"$JAVA_HOME/bin/java" -classpath gradle/wrapper/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain --no-daemon assembleDebug`
- `android/local.properties` 的 sdk.dir 必须用正斜杠（`\t` 会被解析成制表符）
- `聊天室.md`/`项目速览.md` 已移出版本控制（本地保留），历史过程档案
- R15：本机 git 偶发 refs/remotes 写入失败 → `git ls-remote origin` 核对远端真值

## 七、文档地图

| 要看什么 | 去哪 |
|---|---|
| 上手/派工 | `docs/00-开发启动指引.md` |
| 架构 | `docs/架构设计-v1.0.md` |
| 功能与验收 | `docs/功能设计-v1.0.md` |
| 后端接口 | `docs/api-contracts.md` |
| 流程/门禁 | `docs/PROCESS.md` |
| 风险 | `docs/RISK-REGISTER.md` |
| 环境红线 | `docs/environments.md` |
| 迁移记录 | `docs/plans/site-migration.md` |
