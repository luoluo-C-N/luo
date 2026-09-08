import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('legacy localhost requests use a server address saved after app startup', async () => {
  const values = new Map();
  const requests = [];
  const context = {
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    addEventListener() {},
  };
  context.window = context;
  context.fetch = async input => {
    requests.push(input);
    return {ok: true};
  };
  vm.runInNewContext(fs.readFileSync(new URL('../src/boot.js', import.meta.url), 'utf8'), context);

  context.localStorage.setItem('pocket.server', 'http://192.168.10.83:8000');
  await context.fetch('http://localhost:8000/api/auth/login');

  assert.equal(requests[0], 'http://192.168.10.83:8000/api/auth/login');
});

test('guest mode closes the login page without requiring authentication', () => {
  const source = fs.readFileSync(new URL('../src/prototype.js', import.meta.url), 'utf8');
  const declaration = source.match(/function skipLogin\(\)\{[^}]*\}/)?.[0];
  assert.ok(declaration, 'skipLogin must be defined for the login-page button');

  const calls = [];
  const context = {
    closeSub: id => calls.push(['close', id]),
    toast: message => calls.push(['toast', message]),
  };
  vm.runInNewContext(`${declaration};skipLogin()`, context);

  assert.deepEqual(calls[0], ['close', 'pg-login']);
  assert.match(calls[1][1], /游客|登录/);
});
