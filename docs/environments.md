# 掌上小站 · 环境与服务登记表

> 维护人：Tech Lead · 建立日期：2026-09-08
> **目的**：把"哪些端口能碰、哪些绝对不能碰"从口头约定变成可查表。01:19 事故的直接诱因就是这类约束只写在文档正文里。

---

## 1. 服务清单

| 端口 | 服务 | 位置 | 启动方式 | 可否破坏性操作 | 所有者 |
|---|---|---|---|---|---|
| 3000 | 前台网站 Next.js | `…\Kirameku\Kirameku` | `npm run dev` | ❌ 否 | 用户 |
| **8000** | **生产后端 FastAPI** | `…\Kirameku\Kirameku-backend` | 见 §2 | **❌ 绝对禁止** | 用户 |
| **8011** | **隔离测试后端** | 由 `scripts/test-backend.py` 从源码拷贝 | 见 §3 | ✅ **仅此端口** | QA |
| 8787 | 客户端 dev server | `npm run dev` | `node scripts/server.mjs` | ❌ 否 | 开发 |

---

## 2. 生产后端 8000（红线）

**启动**：
```bash
cd Kirameku-backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

⚠️ **三个必须记住的约束**：

1. **必须用 `.venv/Scripts/python.exe`** —— 系统 python 没有 fastapi，会静默起不来
2. **无 `--reload`** —— 改完代码必须手动重启才生效。这正是 01:19 事故的原因：以为重启了，实际旧进程还在跑，验证请求打到了旧代码
3. **重启后必须在协作区声明** —— 避免他人测试打到旧代码

**允许的操作**：健康检查 `GET /api/health`、公开只读接口、管理员登录验证。
**禁止的操作**：任何 DELETE、批量写、清空操作。

---

## 3. 隔离测试后端 8011（唯一可破坏环境）

```bash
set KIRAMEKU_BACKEND_SOURCE=C:\Users\洛洛\.zcode\workspace\default\Kirameku\Kirameku-backend
python scripts/test-backend.py          # 每次从源码全新拷贝，凭据写入 artifacts/test-backend/fixture.json
python tests/backend-contracts.py       # 期望 17/17 PASS
```

⚠️ **已知坑**：
- 启动前先 `taskkill` 掉 8011 上的旧进程，否则 **fixture 凭据会被覆盖导致登录对不上**
- 刚启动时立即登录可能因服务未 ready 失败 —— 脚本已内置 12 秒重试
- 真机测试需设 `TEST_BACKEND_HOST=0.0.0.0` 并加 `http://localhost` 到 CORS

---

## 4. 后端地址配置（客户端）

开发期：
```js
localStorage.setItem('pocket.server', 'http://<电脑局域网IP>:8000')
```

v0.02 起：**改为设置中心配置项**（功能设计 F-K4），不再手工改 localStorage。

⚠️ 真机上 `localhost` 指手机自己，不是电脑 —— 必须填电脑的局域网 IP。

---

## 5. 灾备

| 资产 | 位置 | 备份方式 | 频率 |
|---|---|---|---|
| 生产数据库 | `Kirameku-backend/kirameku.db` | 见 §6 | 每次触碰生产前 + 每日 |
| 客户端配置 | localStorage / Preferences | 数据管家导出 | 每次里程碑 |
| 代码仓库 | `E:\glm\appkf` | git + 远端 | 每次提交 + push 到远端 |

---

## 6. 生产库备份脚本

保存为 `scripts/backup-db.ps1`（待创建），或手工执行：

```powershell
$src = "C:\Users\洛洛\.zcode\workspace\default\Kirameku\Kirameku-backend\kirameku.db"
$dstDir = "E:\glm\appkf\backups"
New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $src "$dstDir\kirameku-$stamp.db"
Write-Host "已备份到 $dstDir\kirameku-$stamp.db"
```

⚠️ `backups/` 需加入 `.gitignore`（含生产数据，不应入库）。

---

## 7. 硬约束速查

```
✅ 可以：8011 上任意增删改查、删除、清空
✅ 可以：8000 上登录、健康检查、公开只读
❌ 禁止：8000 上任何 DELETE / 批量写 / 清空
❌ 禁止：用 production 数据验证破坏性接口
❌ 禁止：在未备份前触碰生产库
```
