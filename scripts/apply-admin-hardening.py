# -*- coding: utf-8 -*-
"""管理写接口统一升级 get_admin_user：堵住 GitHub OAuth 普通用户 token 调管理接口的洞。
这些 API 模块中 get_current_user 只出现在 import 与管理端点的 Depends 里，整文件替换安全。
auth.py 不在清单内（/me 对任意登录用户合法）。幂等：运行两次会因找不到目标而报错。"""
import io

B = r'C:/Users/洛洛/.zcode/workspace/default/Kirameku/Kirameku-backend'

# 文件 => 预期 Depends(get_current_user) 处数
targets = {
    '/app/api/albums.py': 5,
    '/app/api/categories.py': 3,
    '/app/api/posts.py': 3,
    '/app/api/projects.py': 3,
    '/app/api/comments.py': 3,
    '/app/api/bookmarks.py': 6,
    '/app/api/friend_links.py': 4,
    '/app/api/chatters.py': 7,
    '/app/api/music.py': 3,
    '/app/api/messages.py': 4,
    '/app/api/site_config.py': 5,
    '/app/api/upload.py': 1,
    '/app/api/tags.py': 3,
    '/app/api/visitors.py': 1,
}

for path, expect in targets.items():
    s = io.open(B + path, encoding='utf-8', newline='').read()
    n = s.count('Depends(get_current_user)')
    assert n == expect, f'{path}: expected {expect} got {n}'
    total = s.count('get_current_user')
    assert total == expect + 1, f'{path}: import occurrences unexpected: {total}'
    s = s.replace('get_current_user', 'get_admin_user')
    io.open(B + path, 'w', encoding='utf-8', newline='').write(s)
    print(f'OK {path} ({expect} endpoints -> admin)')

# visitors.py 追加：清空接口补鉴权
p = '/app/api/visitors.py'
s = io.open(B + p, encoding='utf-8', newline='').read()
old = 'def clear_visitors(session: Session = Depends(get_session)):'
new = 'def clear_visitors(session: Session = Depends(get_session), admin: dict = Depends(get_admin_user)):'
assert s.count(old) == 1, f'clear_visitors anchor: {s.count(old)}'
io.open(B + p, 'w', encoding='utf-8', newline='').write(s.replace(old, new))
print('OK clear_visitors -> admin')

print('ALL DONE')
