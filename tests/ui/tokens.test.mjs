import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/** 解析 CSS 文本中第一个 :root{...} 区块的 --var 声明（去注释，后定义覆盖先定义） */
function parseRootVars(css) {
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const m = cleaned.match(/:root\{([\s\S]*?)\}/);
  assert.ok(m, '未找到 :root 区块');
  const map = new Map();
  for (const decl of m[1].split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const key = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!key.startsWith('--')) continue;
    map.set(key, val); // 后定义覆盖先定义（与 CSS 级联一致）
  }
  return map;
}

const proto = parseRootVars(fs.readFileSync(new URL('../../src/prototype.css', import.meta.url), 'utf8'));
const tokens = parseRootVars(fs.readFileSync(new URL('../../src/ui/tokens.css', import.meta.url), 'utf8'));

test('tokens.css 覆盖 prototype.css 的全部有效令牌（无遗漏）', () => {
  const missing = [];
  for (const [key, val] of proto) {
    // 自引用（--accent:var(--accent)）在 CSS 中无效，实际值由运行时主题注入，豁免
    if (val === `var(${key})`) continue;
    if (!tokens.has(key)) missing.push(key);
  }
  assert.deepEqual(missing, [], `tokens.css 缺少: ${missing.join(', ')}`);
});

test('tokens.css 与 prototype.css 的有效值一致（后定义生效口径）', () => {
  const diff = [];
  for (const [key, val] of proto) {
    if (val === `var(${key})`) continue;
    if (tokens.has(key) && tokens.get(key) !== val) {
      diff.push(`${key}: prototype.css=${val} vs tokens.css=${tokens.get(key)}`);
    }
  }
  assert.deepEqual(diff, []);
});

test('毛玻璃配方为冻结项（功能设计 §6，改动需设计评审）', () => {
  assert.equal(tokens.get('--glass'), 'rgba(255,255,255,.10)');
  assert.equal(tokens.get('--glass-strong'), 'rgba(255,255,255,.20)');
  assert.equal(tokens.get('--glass-border'), 'rgba(255,255,255,.38)');
  assert.equal(tokens.get('--glass-blur'), 'blur(20px) saturate(180%)');
});

test('基础令牌为冻结项（令牌快照，防重构期视觉漂移 / M0-T0.4）', () => {
  assert.equal(tokens.get('--bg'), '#EAF0FA');
  assert.equal(tokens.get('--accent-rgb'), '10,132,255');
  assert.equal(tokens.get('--radius-l'), '24px');
  assert.equal(tokens.get('--radius-m'), '16px');
  assert.equal(tokens.get('--radius-s'), '10px');
  assert.equal(tokens.get('--shadow'), '0 8px 32px rgba(28,28,30,.08)');
  assert.equal(tokens.get('--ease-drawer'), 'cubic-bezier(.32,.72,0,1)');
});

test('语义五色与状态语义绑定（绿=通过 橙=待办 红=告警 蓝=主操作 紫=云端）', () => {
  assert.equal(tokens.get('--green'), '#30D158');
  assert.equal(tokens.get('--orange'), '#FF9F0A');
  assert.equal(tokens.get('--red'), '#FF453A');
  assert.equal(tokens.get('--purple'), '#BF5AF2');
  assert.equal(tokens.get('--teal'), '#64D2FF');
});
