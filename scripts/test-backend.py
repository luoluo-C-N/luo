"""Run a fresh, isolated snapshot of the real backend; never imports production .env."""
import json, os, secrets, shutil, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get('KIRAMEKU_BACKEND_SOURCE', str(Path.home() / '.zcode/workspace/default/Kirameku/Kirameku-backend')))
ARTIFACTS = ROOT / 'artifacts/test-backend'
RUNTIME = ARTIFACTS / ('run-' + str(time.time_ns()))
RUNTIME.mkdir(parents=True)
shutil.copytree(SOURCE / 'app', RUNTIME / 'app', ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
# All __file__-relative writes now resolve below the fresh runtime.
os.environ.update(DATABASE_URL='sqlite:///' + (RUNTIME / 'fixture.db').as_posix(), SECRET_KEY=secrets.token_urlsafe(48), CORS_ORIGINS='http://localhost,http://localhost:5173,http://127.0.0.1:5173')
for name in ('OSS_ACCESS_KEY_ID','OSS_ACCESS_KEY_SECRET','OSS_BUCKET_NAME','OSS_CUSTOM_DOMAIN','OSS_PREFIX','GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET'):
    os.environ[name] = 'isolated-test-disabled'
os.environ['OSS_ENDPOINT'] = 'http://127.0.0.1:9'
sys.path.insert(0, str(RUNTIME))
os.chdir(RUNTIME)
from app.main import app
from app.database import engine, init_db
from app.models import User, Post, Comment, Message, GitHubUser
from app.utils.auth import hash_password
from sqlmodel import Session
init_db()
username = os.environ.get('TEST_ADMIN_USERNAME', 'appkf_test_admin')
password = os.environ.get('TEST_ADMIN_PASSWORD') or secrets.token_urlsafe(24)
with Session(engine) as session:
    session.add(User(id=1, username=username, hashed_password=hash_password(password), is_admin=True, nickname='隔离测试管理员'))
    session.add(GitHubUser(id=1, github_id=987654321, login='appkf-fixture', bio='Isolated integration fixture'))
    session.add(Post(id=100, title='真实后端联调样例', slug='appkf-fixture', content='# 隔离联调\n验证手机管理应用。', status='published'))
    session.add(Comment(id=100, post_id=100, github_user_id=1, content='待审核评论', status='pending'))
    session.add(Comment(id=101, post_id=100, github_user_id=1, content='已通过父评论', status='approved'))
    session.add(Comment(id=102, post_id=100, parent_id=101, github_user_id=1, content='待审核嵌套评论', status='pending'))
    session.add(Message(id=100, github_user_id=1, content='待审核留言', status='pending'))
    session.add(Message(id=101, github_user_id=1, content='已通过父留言', status='approved'))
    session.add(Message(id=102, parent_id=101, github_user_id=1, content='待审核嵌套留言', status='pending'))
    session.commit()
metadata = dict(username=username, password=password, baseUrl='http://127.0.0.1:8011', deviceBaseUrl=os.environ.get('TEST_DEVICE_BASE_URL', 'http://127.0.0.1:8011'), pid=os.getpid(), runtime=str(RUNTIME), database=str(RUNTIME / 'fixture.db'), postId=100, pendingCommentId=100, pendingMessageId=100, nestedCommentId=102, nestedMessageId=102)
(ARTIFACTS / 'fixture.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
print('Isolated backend ready; credentials stored in artifacts/test-backend/fixture.json (do not publish).', flush=True)
import uvicorn
uvicorn.run(app, host=os.environ.get('TEST_BACKEND_HOST', '127.0.0.1'), port=8011, log_level='warning')
