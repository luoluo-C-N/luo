/**
 * lab · 数据源注册表（v0.04 零代码绑定引擎 · 依据 ADR-0002）
 *
 * 目标：把后端 18 个模块变成「下拉可选的数据源」，用户不再手填 URL 与取值路径。
 * 字段元数据用于：字段选择器渲染、样例数据预览、格式化下拉的默认值推断。
 *
 * 维护约定：后端新增模块时在此登记一项即可；字段以「常用在前」排序，
 * 不追求完整（选择器支持任意路径，元数据只影响展示友好度）。
 */

/** 字段类型：影响格式化下拉的默认值 */
export const FIELD_TYPES = {
  text: '文本',
  number: '数字',
  time: '时间',
  bool: '布尔',
  enum: '枚举',
  media: '媒体',
};

export const DATA_SOURCES = [
  {
    id: 'posts',
    name: '文章',
    api: '/api/posts',
    admin: false,
    fields: [
      { key: 'title', name: '标题', type: 'text' },
      { key: 'slug', name: '别名', type: 'text' },
      { key: 'status', name: '状态', type: 'enum' },
      { key: 'views', name: '浏览', type: 'number' },
      { key: 'is_pinned', name: '置顶', type: 'bool' },
      { key: 'created_at', name: '创建时间', type: 'time' },
    ],
  },
  {
    id: 'chatters',
    name: '说说',
    api: '/api/chatters/admin',
    admin: true,
    fields: [
      { key: 'content', name: '内容', type: 'text' },
      { key: 'created_at', name: '发布时间', type: 'time' },
    ],
  },
  {
    id: 'music',
    name: '音乐',
    api: '/api/music',
    admin: false,
    fields: [
      { key: 'title', name: '曲名', type: 'text' },
      { key: 'artist', name: '艺人', type: 'text' },
      { key: 'url', name: '音频', type: 'media' },
      { key: 'sort', name: '排序', type: 'number' },
    ],
  },
  {
    id: 'albums',
    name: '相册',
    api: '/api/albums',
    admin: false,
    fields: [
      { key: 'title', name: '相册名', type: 'text' },
      { key: 'photo_count', name: '照片数', type: 'number' },
      { key: 'cover', name: '封面', type: 'media' },
    ],
  },
  {
    id: 'comments',
    name: '评论（待审）',
    api: '/api/comments/admin?status=pending',
    admin: true,
    fields: [
      { key: 'content', name: '内容', type: 'text' },
      { key: 'author_name', name: '作者', type: 'text' },
      { key: 'status', name: '状态', type: 'enum' },
      { key: 'created_at', name: '时间', type: 'time' },
    ],
  },
  {
    id: 'messages',
    name: '留言（待审）',
    api: '/api/messages/admin?status=pending',
    admin: true,
    fields: [
      { key: 'content', name: '内容', type: 'text' },
      { key: 'nickname', name: '昵称', type: 'text' },
      { key: 'status', name: '状态', type: 'enum' },
      { key: 'created_at', name: '时间', type: 'time' },
    ],
  },
  {
    id: 'chatterComments',
    name: '说说评论（待审）',
    api: '/api/chatters/comments/admin?status=pending',
    admin: true,
    fields: [
      { key: 'content', name: '内容', type: 'text' },
      { key: 'status', name: '状态', type: 'enum' },
      { key: 'created_at', name: '时间', type: 'time' },
    ],
  },
  {
    id: 'visitors',
    name: '访客',
    api: '/api/visitors',
    admin: true,
    fields: [
      { key: 'ip', name: 'IP', type: 'text' },
      { key: 'path', name: '路径', type: 'text' },
      { key: 'city', name: '城市', type: 'text' },
      { key: 'browser', name: '浏览器', type: 'text' },
      { key: 'os', name: '系统', type: 'text' },
      { key: 'created_at', name: '访问时间', type: 'time' },
    ],
  },
  {
    id: 'bookmarks',
    name: '收藏站点',
    api: '/api/bookmarks/sites',
    admin: false,
    fields: [
      { key: 'title', name: '站名', type: 'text' },
      { key: 'url', name: '地址', type: 'text' },
      { key: 'category_id', name: '分类', type: 'number' },
    ],
  },
  {
    id: 'bookmarkCategories',
    name: '收藏分类',
    api: '/api/bookmarks/categories',
    admin: false,
    fields: [
      { key: 'name', name: '分类名', type: 'text' },
      { key: 'sort', name: '排序', type: 'number' },
    ],
  },
  {
    id: 'categories',
    name: '文章分类',
    api: '/api/categories',
    admin: false,
    fields: [
      { key: 'name', name: '分类名', type: 'text' },
      { key: 'slug', name: '别名', type: 'text' },
    ],
  },
  {
    id: 'links',
    name: '友链',
    api: '/api/links',
    admin: false,
    fields: [
      { key: 'name', name: '站名', type: 'text' },
      { key: 'url', name: '地址', type: 'text' },
      { key: 'description', name: '描述', type: 'text' },
    ],
  },
  {
    id: 'collections',
    name: '收藏夹',
    api: '/api/collections',
    admin: false,
    fields: [
      { key: 'title', name: '标题', type: 'text' },
      { key: 'url', name: '链接', type: 'text' },
      { key: 'created_at', name: '收藏时间', type: 'time' },
    ],
  },
  {
    id: 'siteConfig',
    name: '站点配置',
    api: '/api/site-config/app.cfg.v1',
    admin: false,
    fields: [
      { key: 'key', name: '键', type: 'text' },
      { key: 'value', name: '值', type: 'text' },
    ],
  },
  {
    id: 'systemStatus',
    name: '系统状态',
    api: '/api/system/status',
    admin: false,
    fields: [
      { key: 'cpu', name: 'CPU', type: 'number' },
      { key: 'memory', name: '内存', type: 'number' },
      { key: 'disk', name: '磁盘', type: 'number' },
      { key: 'uptime', name: '运行时长', type: 'number' },
    ],
  },
  {
    id: 'dashboardStats',
    name: '看板统计',
    api: '/api/dashboard/stats',
    admin: false,
    fields: [
      { key: 'posts', name: '文章数', type: 'number' },
      { key: 'comments', name: '评论数', type: 'number' },
      { key: 'messages', name: '留言数', type: 'number' },
      { key: 'views', name: '总浏览', type: 'number' },
    ],
  },
  {
    id: 'profile',
    name: '站长资料',
    api: '/api/auth/me',
    admin: true,
    fields: [
      { key: 'nickname', name: '昵称', type: 'text' },
      { key: 'email', name: '邮箱', type: 'text' },
      { key: 'avatar', name: '头像', type: 'media' },
      { key: 'bio', name: '简介', type: 'text' },
    ],
  },
  {
    id: 'photos',
    name: '照片',
    api: '/api/albums/photos',
    admin: true,
    fields: [
      { key: 'url', name: '图片', type: 'media' },
      { key: 'caption', name: '说明', type: 'text' },
      { key: 'album_id', name: '相册', type: 'number' },
    ],
  },
];

/** 按 id 取数据源定义 */
export function getSource(id) {
  return DATA_SOURCES.find((s) => s.id === id) ?? null;
}

/** 列出全部数据源（供下拉） */
export function listSources() {
  return DATA_SOURCES.map(({ id, name, admin }) => ({ id, name, admin }));
}

export const __exports__ = { DATA_SOURCES, FIELD_TYPES, getSource, listSources };
