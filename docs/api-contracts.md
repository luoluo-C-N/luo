# Kirameku 管理端 API 合同（源码核验）

核验日期：2026-09-06。权威来源：`C:/Users/洛洛/.zcode/workspace/default/Kirameku/Kirameku-backend/app/{api,schemas,services}`，以及 `main.py`、`utils/auth.py`。这是静态源码审计；不代表在线服务或外部 OSS 已验收。未修改后端或现有原型。

## 适配器必须遵守

- **没有统一响应包装中间件**。内容模块直接返回数组或对象；auth/music/system/visitors 部分接口才有 `{code:0,data:...}`。`/api/visitors/count` 返回 `{code:0,count:n}`，不能因为有 code 就一律取 data。
- 写接口通常 `Authorization: Bearer <accessToken>`，JSON body。音乐上传/修改和图片上传是 FormData，不要手动设置 multipart Content-Type。
- 原生 HTTP 错误为 `{detail:string}`，422 的 detail 是验证问题数组。检查 HTTP 状态，再处理存在的非零 code；401 应清理过期会话并保留未提交草稿。
- 大部分 PUT 是部分更新（exclude_unset）。编辑表单只发送实际编辑字段；别发送输出字段、undefined 或无意的 null。
- 普通列表是数组，无 total。文章/说说/留言/访客另有 count；审核列表无 count。分页从 1 开始。满页只能表明可能还有下一页。
- 媒体返回 `/uploads/...` 时，相对于后端 origin 解析，不能相对于 App 静态服务。

## 登录与账户

| 方法/路径 | 请求 | 响应 |
|---|---|---|
| POST /api/auth/login | username,password | code,message,data:{accessToken,refreshToken:"",expires,avatar,username,nickname,roles,permissions} |
| GET /api/auth/me | Bearer | data:{avatar,username,nickname,email,description,phone,roles,permissions} |
| PUT /api/auth/me | nickname,email,bio 或 description,avatar | {code:0,message:"更新成功"} |
| GET /api/health | 无 | {status:"ok"} |

无刷新 token 实现，无服务端 logout。不要把 GitHub 评论者 OAuth 当作管理账号认证。错误登录 401“用户名或密码错误”；无效 JWT 401“无效的令牌”；me 用户不存在 404。源码 get_current_user 只验证 JWT，未校验 admin claim；music 写入、visitors 删除缺少此依赖，应作为后端发布前修复项。当前不应把该服务直接暴露公网。

## 内容 CRUD

以下除特别标注外：GET 集合返回数组，POST 集合创建返回对象，PUT /{id} 修改返回对象，DELETE /{id} 返回 `{ok:true}`。POST/PUT/DELETE 需 Bearer。字段末尾 `!` 为创建必填，其余列出默认值。更新字段可选。

| 模块 | 集合路径/管理列表 | 创建及修改字段 |
|---|---|---|
| 文章 | /api/posts | title!,slug!,description="",content="",cover="",category_id=null,tags:string[]=[],status="draft",is_pinned=false,reading_time=0,word_count=0 |
| 说说 | /api/chatters；管理 GET /api/chatters/admin | content!,images:string[]=[],mood="",status="draft" |
| 分类 | /api/categories | name!,slug!,description="",sort=0 |
| 标签 | /api/tags | name!,slug! |
| 相册 | /api/albums | title!,description="",cover="",sort=0 |
| 项目 | /api/projects | name!,slug!,description="",long_description="",cover_image="",tech_stack:string[]=[],link_github="",link_gitee="",link_live="",link_docs="",status="developing",status_label="",is_featured=false,sort=0 |
| 友链 | /api/friend-links；管理 GET /api/friend-links/admin | name!,url!,avatar="",description="",sort=0；**仅更新**另支持 is_approved:boolean |
| 收藏分类 | /api/bookmarks/categories | name!,icon="",description="",sort=0 |
| 收藏站点 | /api/bookmarks/sites | category_id!,name!,url!,icon="",description="",platforms:string[]=[],sort=0 |

### 文章的关键差异

- GET /api/posts 参数 status,category,tag,page=1,size=10（最大200）；category/tag 是 **slug**。未知 slug 当前代码不应用过滤。
- GET /api/posts/count?status=... → `{count:n}`。
- 编辑详情用 GET /api/posts/detail/{id}，返回 content。GET /api/posts/{slug} 会累加 views，不宜用于管理编辑。
- 返回 category 是名称，**不返回 category_id**；列表也不返回 content。编辑时不应默认为空分类覆盖原值；可匹配分类名称，或未改分类时省略 category_id。
- tags 发送名称数组（非 ID）。去重、去空字符串，否则关联主键可能冲突。
- 创建默认草稿，发布明确发送 published；源 schema 未枚举限制，应由 UI 约束 draft/published。
- 输出含 id,title,slug,description,cover,category,tags,status,is_pinned,views,likes,word_count,reading_time,published_at,created_at,updated_at。

### 其他列表与照片

- 说说公开列表仅 published；管理列表无 status 时含所有；page=1,size=20，最大200。GET /api/chatters/count?status=... 默认 published。输出含 id,content,images,mood,likes,comments_count,status,created_at,updated_at。
- 友链公开列表仅 approved，管理列表包括待审；输出含 is_approved。
- 收藏 GET /api/bookmarks 返回分类数组，每项附 sites；GET /api/bookmarks/sites?category_id=N 过滤。
- GET /api/albums/{id}/photos 返回照片数组。POST /api/albums/photos body `{album_id!,url!,caption:"",orientation:"landscape",sort:0}`。DELETE /api/albums/photos/{photo_id}。**无照片 PUT**。输出再含 id,created_at。相册含 photo_count。
- 分类和标签输出含 post_count；分类、相册、收藏分类等含 created_at/updated_at。
- 多数不存在 ID 为 404“文章/说说/分类/标签/项目/友链/相册/照片/站点不存在”。slug 唯一性冲突尚未统一转业务错误，可能500，UI 不应承诺409。

## 审核

| 列表 GET | 更新 PUT | 删除 DELETE |
|---|---|---|
| /api/comments/admin | /api/comments/{id}/status | /api/comments/{id} |
| /api/messages/admin | /api/messages/{id}/status | /api/messages/{id} |
| /api/chatters/comments/admin | /api/chatters/comments/{id}/status | /api/chatters/comments/{id} |

均需 Bearer；列表参数 status（pending/approved/rejected 或省略）,page=1,size=20，最大100。返回原始数组；PUT JSON `{status:"approved"}` 或 rejected，返回更新对象；DELETE `{ok:true}`。

评论字段 id,post_id（说说为 chatter_id）,parent_id,content,likes,status,created_at,github_user:{id,login,avatar,bio}|null,replies，管理列表额外 ip。留言还含 github_user_id。

**已发现后端审核盲点**：文章和说说管理列表只分页筛选顶层，嵌套 replies 包括所有状态；筛选 pending 会漏掉 approved 父节点下的 pending 回复。留言管理列表也只顶层，且 replies 永远仅 approved，待审回复无法通过此接口完整发现。前端应显示能获取到的回复，完整审核需要后端补齐查询。

公开 POST 评论/说说评论/留言需要 GitHub 用户会话；管理员 JWT 不等同。不存在记录404；状态 schema 当前仅 str，无枚举校验。不要为测试创建真实公开留言，可在隔离库验证。

## 系统与统计

- GET /api/system/status → `{code:0,data:{cpu,memory,disk,diskTotalGb,memTotalGb,uptimeDays,bootTime,updatedAt}}`。前三者百分比；采集间隔约0.15秒，建议客户端15秒轮询；无 auth。
- GET /api/dashboard/stats → **原始对象** `{counts:{posts,drafts,categories,tags,comments,messages,visitors},post_trend:[{date,count}],visitor_trend:[{date,count}],category_distribution:[{name,value}],browser_distribution:[{name,value}]}`。无 auth。趋势当前实现从30天前起共30项，未包括今天。

## 音乐与图片

- GET /api/music → `{code:0,data:[{id,title,artist,url,duration,sort,source,createdAt}]}`，sort倒序再创建倒序。
- POST /api/music/upload FormData file!,title="",artist="",duration=0。支持 mp3/flac/m4a/wav/ogg/aac，最多50MiB；返回 `{code:0,data:{id,title,artist,url,duration}}`。title/artist截断200字，duration非负。
- PUT /api/music/{id} **FormData** title?,artist?,sort? → `{code:0,data:{id,title,sort}}`。
- DELETE /api/music/{id} → `{code:0}`，会删除本地音频文件。不存在404，格式/大小400。音乐这些写接口当前无 auth 依赖。
- POST /api/upload/image Bearer + FormData file! → **原始** `{url,orientation}`。content_type支持jpeg/png/webp/gif/svg+xml，最多10MiB；超限/类型400。上传依赖 OSS 配置和网络，**没有本地回退**；不要将前端 data URL 当作成功上传。支持手填图片 URL 的替代路径。

## 访客与站点配置

- GET /api/visitors?page=1&size=20（最大100）→ `{code:0,data:[...]}`；字段 id,ip,path,city,region,country,district,org,org_cn,asn,is_mobile,is_proxy,is_hosting,browser,os,device_type,created_at。
- GET /api/visitors/count → `{code:0,count:n}`。DELETE /api/visitors/{id} 与 DELETE /api/visitors → `{code:0,message:"ok"}`。后者清空全部，无恢复；单条不存在也返回成功。当前无 auth 依赖。
- GET /api/site-config 返回解析过JSON的 key→value 字典。管理 GET /api/site-config/list Bearer → 原始行数组 `{id,key,value,description,updated_at}`，value为原始字符串。
- POST /api/site-config Bearer JSON `{key!,value:"",description:""}` → `{id,key,value,description}`；重复 key400。
- PUT /api/site-config/{key} Bearer JSON `{value!:string,description:""}`，不存在则创建；description为空不会清除原描述。
- PUT /api/site-config Bearer JSON字典是批量更新，对每个值 json.dumps 后保存，返回解析字典。避免把已经序列化的复杂JSON再重复序列化。
- DELETE /api/site-config/{key} Bearer → `{ok:true}`；不存在404。

## 0.01建议

前端适配混合包装、文章真实草稿/发布、所有已存在管理 CRUD、三类审核及回复显示、可配置后端地址、上传错误真实呈现、连接故障重试与本地草稿。管理列表权限缺口和待审回复盲点必须明确列为后端修复，不能用前端登录遮罩声称服务端已保护。
