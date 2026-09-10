"""Exercise only the explicitly identified isolated backend on loopback port 8011."""
import io, json, os, time, urllib.request, urllib.error, uuid, wave
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
fixture = json.loads((ROOT / 'artifacts/test-backend/fixture.json').read_text(encoding='utf-8'))
assert Path(fixture['database']).resolve().is_relative_to((ROOT / 'artifacts/test-backend').resolve())
BASE = fixture['baseUrl']
assert BASE == 'http://127.0.0.1:8011'
results = []
# 本地回环地址必须绕过代理：环境若设了 HTTP_PROXY，请求 127.0.0.1 会被代理
# 拦截并返回 502/WinError 10061（表现为 "Fixture login failed"，实为环境问题非代码缺陷）
_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))

def request(method, path, data=None, token=None, content_type='application/json'):
    headers = {'Content-Type': content_type}
    if token: headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(data).encode() if data is not None and content_type == 'application/json' else data
    try:
        with _OPENER.open(urllib.request.Request(BASE + path, data=body, headers=headers, method=method), timeout=20) as r:
            raw = r.read()
            return r.status, json.loads(raw) if r.headers.get('Content-Type','').startswith('application/json') else raw
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
def check(name, condition):
    results.append({'name':name, 'passed':bool(condition)})
    print(('PASS ' if condition else 'FAIL ') + name)
credentials = {'username': os.environ.get('TEST_ADMIN_USERNAME', fixture['username']), 'password': os.environ.get('TEST_ADMIN_PASSWORD', fixture['password'])}
status, login = 0, None
for _ in range(12):
    status, login = request('POST', '/api/auth/login', credentials)
    if status == 200:
        break
    time.sleep(1)
assert status == 200, 'Fixture login failed'
token = login['data']['accessToken']
check('login and admin identity', request('GET','/api/auth/me',token=token)[1]['data']['roles'] == ['admin'])
check('invalid password rejected', request('POST','/api/auth/login',{'username':fixture['username'],'password':'intentionally-wrong'})[0] == 401)
check('anonymous moderation rejected', request('GET','/api/comments/admin')[0] in (401,403))
slug = 'contract-' + uuid.uuid4().hex
status, post = request('POST','/api/posts',{'title':'联调草稿','slug':slug,'content':'draft content','status':'draft'}, token)
check('create draft', status == 200 and post.get('status') == 'draft')
post_id = post['id']
status, edited = request('PUT',f'/api/posts/{post_id}',{'title':'已编辑草稿','content':'edited content'},token)
check('edit draft persists',status == 200 and request('GET',f'/api/posts/detail/{post_id}',token=token)[1].get('content') == 'edited content')
status, published = request('PUT',f'/api/posts/{post_id}',{'status':'published'},token)
check('publish article',status == 200 and published.get('status') == 'published')
check('published article listed', any(p['id']==post_id for p in request('GET','/api/posts?status=published&size=200',token=token)[1]))
check('delete article',request('DELETE',f'/api/posts/{post_id}',token=token)[0] == 200 and request('GET',f'/api/posts/detail/{post_id}',token=token)[0] == 404)
def flatten(rows):
    for row in rows:
        yield row
        yield from flatten(row.get('replies',[]))
for kind in ('comments','messages'):
    status, rows = request('GET',f'/api/{kind}/admin',token=token)
    check(kind+' pending nested reply visible',status == 200 and 102 in [r['id'] for r in flatten(rows)])
    status, changed = request('PUT',f'/api/{kind}/100/status',{'status':'approved'},token)
    check(kind+' approve persists',status == 200 and changed.get('status') == 'approved')
    request('PUT',f'/api/{kind}/100/status',{'status':'pending'},token)
# Genuine tiny PCM WAV in an isolated source-relative upload directory.
audio = io.BytesIO()
with wave.open(audio,'wb') as wav:
    wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(8000); wav.writeframes(b'\0\0'*800)
boundary = 'appkf' + uuid.uuid4().hex
body = (f'--{boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nFixture audio\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="fixture.wav"\r\nContent-Type: audio/wav\r\n\r\n').encode()+audio.getvalue()+f'\r\n--{boundary}--\r\n'.encode()
status, music = request('POST','/api/music/upload',body,token,'multipart/form-data; boundary='+boundary)
check('music upload',status == 200)
if status == 200:
    music_id=music['data']['id']; music_url=music['data']['url']
    check('music serves uploaded bytes',request('GET',music_url)[1] == audio.getvalue())
    status, updated=request('PUT',f'/api/music/{music_id}',b'title=Edited&sort=3',token,'application/x-www-form-urlencoded')
    check('music edit',status == 200 and updated['data']['title']=='Edited')
    check('music deletion removes bytes',request('DELETE',f'/api/music/{music_id}',token=token)[0]==200 and request('GET',music_url)[0]==404)
check('anonymous music mutation rejected',request('PUT','/api/music/999999',b'title=Denied',content_type='application/x-www-form-urlencoded')[0] in (401,403))
report={'timestamp':time.strftime('%Y-%m-%d %H:%M:%S'),'runtime':fixture['runtime'],'results':results}
(ROOT/'artifacts/test-backend/contracts.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
