# site 模块迁移拆分方案（任务卡 T-SITE-PLAN 交付物）

- **日期**：2026-09-08 · **状态**：待评审 · **执行人**：Dev-site
- **输入**：`功能设计-v1.0.md` §4.1、`架构设计-v1.0.md` §11、`src/prototype.js`（3,553 行）实勘
- **边界**：本方案只做规划。执行期**不碰 `src/core/`**（内核由另一会话建设中，风险 R4）。

---

## 0. 结论摘要

1. `prototype.js` 的 3,553 行可拆为 **6 个视图 + 3 个主题/外观 + 3 个壳层 + 3 个数据层文件**，全部 ≤300 行可达。
2. **最大障碍不是 JS，而是 `index.html` 的 154 个内联 `onclick`**——它们依赖约 40 个全局函数。方案：迁移时在 `modules/site/index.js` 末尾统一 `window.*` 重导出，HTML 零改动，最后一步再评估是否改为事件绑定。
3. **区块是交错的**：审核闭环（881–970）藏在"自编译模块系统"区块内部，登录（1424）也在其中。**迁移必须按函数搬，不能按行号切**。
4. 598–1544 约 950 行属于自编译模块平台——**本期不动**，它属于 `lab` 模块（v0.04）。本期目标：site 功能全部迁出后，`prototype.js` 只剩 lab 待迁内容。
5. 预计 7 步迁移，每步独立可验证、可回滚（每步一个 commit）。

---

## 1. 现状结构地图（实勘数据）

| 指标 | 数值 |
|---|---|
| `prototype.js` 总行数 | 3,553 |
| 顶层函数 | 279 个（顶层无同名重复；0.01 期"openEditor 定义两次"已在拆分时消解，现存 1 处） |
| `window.*` 引用 | 28 处 |
| 裸 `localStorage` | 68 处 |
| 硬编码 `localhost:8000` | 21 处 |
| `index.html` | 777 行，22 个屏幕/子页 id，**154 个内联 onclick** 引用约 40 个全局函数（`tg`×17、`closeSub`×16、`toast`×9、`segTo`×9…） |

**区块分布（区块注释标记 + 函数定位）**：

| 行区间 | 区块 | 备注 |
|---|---|---|
| 1–76 | 导航基座：`jumpTab`(11) `segTo`(18) `openSub`(47) | 全 App 依赖 |
| 76–137 | 抽屉手势（内联版） | 与 `src/drawer-gesture.js`（DI 化 ES Module）重复 |
| 137–367 | 多面板工作台 | `panels`(138) 左滑/置顶/排序 |
| 367–508 | 壁纸系统 | |
| 508–598 | 音乐段 | |
| **598–1544** | **自编译模块系统**（含 7 模板/编辑器/sandbox/host 桥） | ⚠️ **属于 lab，本期不动** |
| 881–970 | **审核闭环**（`refreshAudit`/`auditAct`…） | ⚠️ 交错：物理上位于模块系统区块内 |
| 1424–1544 | **登录/游客/退出** | ⚠️ 交错：同上 |
| 1544–1680 | 模块尺寸切换 + 重命名体系（`NAV_DEF`(1580)） | 前半 lab、后半 site |
| 1680–1751 | 卡片折叠/拖高 + 深色模式 | |
| 1751–1802 | 分享码 + FIELDS 字典 | lab 为主 |
| 1802–1909 | 毛玻璃质感调节 + TabBar 隐藏呼出 | |
| 1909–1943 | 真实数据接入（`API_BASE`(1910) 等系统状态） | |
| 1943–2400 | v2 CRUD 基座 + 文章/说说/相册 | `jfetch`/`unwrap`/`CRUD_DEFS` |
| 2400–2560 | 资料管理九类 + 访客 + 已处理审核 | |
| 2561–2745 | 编辑器增强（分类/标签/封面/MD 工具栏/草稿） | |
| 2746–2868 | 我的 + 全局搜索 | |
| 2869–2963 | 布局预设 + 模块拖拽 | lab |
| 2964–3059 | 主题/强调色/字号 + backupDb + moveCrud | |
| 3060–3553 | 状态页服务探测 + 尾部杂项 IIFE | `probeSvc`/`svcPaint`/`dragScroll` |

---

## 2. 目标文件清单（`modules/site/`）

```
modules/site/
├─ manifest.js            模块清单（nav:'tab', order:10, permissions:['storage','net']）
├─ index.js               装配：mount/onShow/onHide/unmount + window.* 过渡层
├─ style.css              模块样式（.mod-site 前缀；由 prototype.css 拆入）
├─ data/
│  ├─ http.js             jfetch / unwrap / backBase / frontBase / imgSrc
│  │                      ← 硬编码地址的唯一收口点（21 处归零在此）
│  ├─ sources.js          数据源 Schema：先迁 CRUD_DEFS 九类 + FIELDS 字典
│  ├─ format.js           fdate / slugify / esc 等纯函数
│  └─ backup.js           backupDb（后续对接内核 F-K5 数据管家）
├─ views/
│  ├─ status.js           状态页：applySystemStatus / fetchSystemStatus / probeSvc / svcPaint
│  ├─ dashboard.js        看板：loadDash / heroPend / 快捷入口 / 趋势
│  ├─ audit.js            审核三类：refreshAudit / auditCard / auditAct / auditDel / renderDone
│  │                      含 1980 行的 renderRealAudit 猴子补丁（改为显式事件）
│  ├─ content.js          内容四段：posts / moments / albums / 九类资料 CRUD / moveCrud
│  ├─ music.js            音乐段（508–598 + v2 音乐接线）
│  ├─ editor.js           编辑器：openEditor / mdWrap / draft* / uploadCover / imgPick*
│  ├─ profile.js          我的 + 全局搜索：meCardPaint / openProfile / saveProfile / globalSearch
│  └─ auth.js             登录/游客/退出：skipLogin / doLogin / logout / oauthTry
├─ theme/
│  ├─ wallpaper.js        壁纸系统（367–508）
│  ├─ appearance.js       深色模式 / 强调色 / 字号 / 毛玻璃质感调节 / 折叠拖高
│  └─ rename.js           重命名体系：NAV_DEF / SEC_DEF
└─ shell/
   ├─ tabs.js             jumpTab / segTo / openSub / openSub 相关（全局导航基座）
   ├─ panels.js           多面板工作台（过渡保留；目标态=导航分组壳，见功能设计 F-K2）
   └─ tabbar.js           TabBar 自动隐藏/呼出
```

**行数预估**：content.js 最大（约 700 行）→ 执行时允许二次拆为 `content-posts.js` / `content-crud.js`。除它之外全部 ≤300 行。

**职责归属说明**：
- `theme/*` 按功能设计 F-K4 未来应升入内核设置中心或独立 `appearance` 模块；**本期先落 site**（内核改动需评审，避免与并发会话冲突），升迁另立任务。
- 自编译模块系统（598–1544 大部分、分享码、FIELDS、布局拖拽）**不迁入 site**，属 `lab`，另出迁移方案。

---

## 3. 源 → 目标映射表（按函数，不按行）

> ⚠️ 因为区块交错，映射以**函数名**为准；行号区间仅供检索。执行时用
> `grep -n "^function <name>" src/prototype.js` 定位真实位置。

| 目标文件 | 迁移的函数/对象（源行号） |
|---|---|
| `shell/tabs.js` | `jumpTab`(11) `segTo`(18) `openSub`(47) 及关闭/切换辅助 |
| `shell/panels.js` | `panels` 对象(138) `renderPanels` 面板左滑/置顶/排序全部函数（137–367） |
| `shell/tabbar.js` | TabBar 隐藏/呼出（1843–1909） |
| `theme/wallpaper.js` | 壁纸预设/上传/压缩/持久化（367–508） |
| `theme/appearance.js` | 深色模式(1730) 玻璃质感调节(1802) `setAccent`(2964) `shade` `renderAccentPicker` `renderThemePresets` `applyTheme` `setFontSize`(3014) 卡片折叠/拖高(1680) |
| `theme/rename.js` | `NAV_DEF`(1580) `SEC_DEF` 重命名管理（1579–1680 的改名部分） |
| `data/http.js` | `jfetch` `unwrap` `frontBase` `backBase` `imgSrc` `API_BASE`(1910) `applySystemStatus` `fetchSystemStatus` |
| `data/format.js` | `fdate` `slugify` `esc` `cnt` `emptyCard` `lerrEl` `toastErr` |
| `data/sources.js` | `CRUD_DEFS`(2242 附近) `FIELDS`(1787) `N`/`updCounts` |
| `views/status.js` | `probeSvc`(3060) `svcPaint`(3078) 端口/服务/流量渲染（3060–3553 状态页部分） |
| `views/dashboard.js` | `loadDash` `heroPend` `PEND` 待办/分区开关速览 |
| `views/audit.js` | `refreshAudit`(881) `auditCard`(892) `renderRealAudit`(925) `auditAct`(935) `auditDel`(2500) `renderDone`(2511) **+ 解除 1980 行猴子补丁** |
| `views/content.js` | 文章：`loadPosts` `renderPosts` `filterPosts` `togglePin` `delPost` `setPostFilter`；说说：`loadMoments` `renderMoments` `delMoment`；相册：`loadAlbums` `openAlbum` `loadAlbumPhotos` `delPhoto` `uploadPhotos` `addPhotoUrl` `setCover` `gotoAlbum`；资料：`openCrudAt` `crudSegTo` `crudAdd` `loadCrud` `delCrud` `openCrudForm` `submitCrudForm` `loadBookmarks` `openBmsForm` `loadVisitors` `delVisitor` `clearVisitors` `moveCrud` `gotoData` |
| `views/music.js` | 音乐段（508–598）+ v2 音乐接线 |
| `views/editor.js` | `openEditor`(2053) `openPostEditor` `postMetaUpd` `buildPostPayload` `sendPost` `savePostDraft` `publishPost` `draftSave/Hook/Clear` `mdWrap` `mdLine` `loadCats` `fillCatSelect` `uploadCover` `imgInsertOpen` `imgPickAlbum` `imgPickUse` `imgPickManual` `edViewMode` |
| `views/profile.js` | `meCardPaint` `pfAvatarPaint` `uploadAvatar` `openProfile` `saveProfile` `openSearch` `globalSearch` |
| `views/auth.js` | `skipLogin`(1424) `doLogin`(1425) `logout`(1533) `setAuthMode` `oauthTry` |
| `data/backup.js` | `backupDb`(3032) |
| 不迁（lab） | 598–1544 模块系统主体、分享码(1751)、布局预设/拖拽(2869)、模块尺寸切换(1544) |

---

## 4. 全局函数依赖处理（本方案的关键决策）

`index.html` 的 154 个内联 `onclick` 依赖约 40 个全局函数。两种策略：

| 策略 | 做法 | 评价 |
|---|---|---|
| **A. 过渡层重导出（采用）** | 模块迁移后，`index.js` 末尾统一 `window.jumpTab = tabs.jumpTab; …` | HTML 零改动、每步独立可回滚；全局污染暂存，由过渡层集中管理（比现在散落 28 处好） |
| B. 同步改 HTML 为事件绑定 | 每迁一个函数同时改 154 处 | 一步的爆炸半径过大，违背"每步可回滚" |

**执行细则**：
- 过渡层只导出 index.html 实际引用的函数清单（执行时以 `grep -o 'onclick="[a-zA-Z_]*'` 的最新结果为准），不是全部 279 个。
- 过渡层集中在 `index.js` 一个代码块，带注释 `// TODO(v0.03): 改为事件绑定后删除本块`。
- `tg`(×17) 等最常用函数优先保证在过渡层中。

---

## 5. 迁移顺序（7 步，每步 = 1 commit + 全套验证）

| 步 | 内容 | 为什么排这里 |
|---|---|---|
| **S1** | 建骨架：manifest/index/style + 空视图占位 + **全局过渡层** + 从 `prototype.css` 拆 `style.css`（令牌进 `src/ui/tokens.css`） | 先立容器，后续每步只搬函数 |
| **S2** | `data/` 层：http.js / format.js —— **运行时切换在此完成**（index.html 增加 module 入口、prototype.js 删除原定义、全局过渡层生效） | 纯函数多、无 DOM，风险最低。<br>**执行偏差（2026-09-08）**：sources.js（CRUD_DEFS/FIELDS）推迟至 S5——与 content 视图强耦合，单独前移只多一层过渡暴露无收益 |
| **S3** | `views/status.js`（最小独立页，验证迁移模式） | 状态页依赖少、可独立验证，是理想的"试点" |
| **S4** | `views/audit.js`（三类审核 + 解除猴子补丁） | 功能设计要求 emit `site:pending-changed`，从审核开始建立事件习惯 |
| **S5** | `views/dashboard.js` + `views/content.js` + `views/music.js`（最大体量） | 依赖 S2/S3/S4 已稳 |
| **S6** | `views/editor.js` + `views/profile.js` + `views/auth.js` | 编辑器依赖 content；auth 放后面是因为它改动会影响所有页的会话态 |
| **S7** | `theme/*` + `shell/*` 收尾；`prototype.js` 仅剩 lab 内容并加冻结头注释 | 主题/壳层最后迁，因为期间需要旧实现保持页面可跑 |

**每步的 DoD 附加项**：迁移清单中该步的函数，在 `prototype.js` 中应删除原定义（`grep` 确认），防止新旧两份并存。

---

## 6. 验证方式（"功能等价 + 视觉零差异"的操作定义）

每步固定执行：

1. **自动化**：`npm test`（47/47 起，随迁移递增）+ `npm run build` + `npm run smoke`
2. **视觉比对**：`npm run dev` 起服务，同一 viewport（720×1600）对每个屏（`scr-home/content/status/review/me` + 全部子页）截图，存 `artifacts/migration/step-S<n>/`，与上一步对比。**人工核对毛玻璃、深色模式、壁纸三种状态**
3. **DOM 断言**：关键锚点存在——`#h-pending`、`#n-posts`、`pg-crud`、`pg-editor` 等（补进 `tests/site-anchors.test.mjs`，一次性建立，全步复用）
4. **功能冒烟**（手工，每步 3 条以内）：
   - S3：状态页数字与 8000 实时一致；断网显示 `—`
   - S4：待审 → 通过 → 前台可见（复用 0.01 已验证闭环）；待审数变化触发事件
   - S5：文章发布 → 前台即时可见；说说删除；分类新建 409 提示
   - S6：草稿保存 → 401 场景草稿保留；搜索跳转正确
5. **契约**：触碰后端数据的步骤跑 `python tests/backend-contracts.py`（17/17）
6. **真机**：S5、S7 完成后在 vivo V2068A 装一次 debug 包（`scripts/device-qa.ps1`）

---

## 7. 风险清单（实勘确认，非猜测）

| # | 风险 | 证据 | 缓解 |
|---|---|---|---|
| 1 | 内联 onclick 断链 → 按钮全死 | index.html 154 处、约 40 个全局函数 | §4 策略 A 过渡层；S1 第一步就建好 |
| 2 | 按行号切块切错（区块交错） | 审核在 881（模块段内）、登录在 1424 | §3 按函数映射；每函数 grep 定位 |
| 3 | 新旧两份函数并存，行为分叉 | 单体迁移最常见事故 | 每步 DoD："原定义已从 prototype.js 删除" |
| 4 | 硬编码地址残留 | 实勘 21 处；S2 后 src/ 计 20（prototype.js 18 随视图迁移递减，http.js 1 处为唯一豁免默认值，core 1 处） | 逐视图迁移收口；CI 守卫已设（warn 级，迁移完成后转阻断） |
| 5 | 全局可变状态（`POSTS`/`CRUD_DATA`/`PEND`/`N`/`SVC_CTRL`）跨函数共享 | 68 处裸 localStorage、28 处 window | **迁移期保持单例不动设计**；模块化重构是 v0.03+ 的事，本任务只搬家不改行为 |
| 6 | 与 lab 迁移互相打架 | 598–1544 归属 lab | 本方案明确"不迁清单"；lab 方案另出，届时 site 已稳定 |
| 7 | 与内核会话冲突 | R4 🔴 并发写入 | 本任务文件范围仅 `modules/site/` + `docs/plans/` + `src/ui/tokens.css`（新增，不修改 core） |
| 8 | 猴子补丁丢失行为 | 1980 行包装了 `window.renderRealAudit` | S4 改为显式调用点，删除补丁，行为写进单测 |
| 9 | 视觉回退 | 626 行样式拆分 | 令牌快照测试（T0.4，CI 已有位）+ §6.2 截图比对 |
| 10 | localStorage 键名变动破坏用户数据 | 68 处裸 localStorage | **本任务不改任何键名**；键迁移属 F-K5 数据管家，另立任务 |

---

## 8. 验收标准（对照任务卡）

- [ ] `docs/plans/site-migration.md`（本文档）含：文件清单、源→目标映射、迁移顺序、验证方式、风险清单
- [ ] 映射表覆盖 prototype.js 全部 3,553 行的去向（迁 site / 留 lab / 删），无"未知归属"区块
- [ ] 单文件 ≤300 行约束在清单中可达成（content.js 预授权二次拆分）
- [ ] 硬编码地址归零路径明确（S2）
- [ ] 每步可独立回滚（一步一 commit）
- [ ] 未修改 `src/core/` 任何文件 ✅（本任务为纯规划）

---

**下一步**：本方案获确认后，从 S1 开始执行，每步完成后按 §6 出验证回执。
