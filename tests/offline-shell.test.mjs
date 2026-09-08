import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('the Android application shell has no blocking remote scripts or styles', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const assetUrls = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(match => match[1]);
  const remote = assetUrls.filter(url => /^https?:\/\//.test(url));
  assert.deepEqual(remote, []);
});

test('editor libraries do not block first paint', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const vendorScripts = [...html.matchAll(/<script\b([^>]*)src="\/vendor\/[^"]+"([^>]*)>/g)];
  assert.equal(vendorScripts.length > 0, true);
  for (const script of vendorScripts) assert.match(script[0], /\bdefer\b/);
});
