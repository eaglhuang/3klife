'use strict';
// 綁定表（PROG-2-1684）：selector＋text＋index 選元素寫入 data-name；表格格式錯誤要報錯
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadBindMap, applyBindMapInPage } = require('../lib/html-to-ucuf/bind-map');

function fakeNode(text) {
  return { textContent: text, attrs: {}, getAttribute(k) { return this.attrs[k] ?? null; }, setAttribute(k, v) { this.attrs[k] = v; } };
}

const nodes = { span: [fakeNode('  張飛  '), fakeNode('燕人'), fakeNode('張飛')] };
global.window = { __ucufBindMapObserver: true };
global.document = { body: {}, querySelectorAll: sel => { if (!nodes[sel]) throw new Error('bad selector'); return nodes[sel]; } };

const report = applyBindMapInPage([
  { name: 'OverviewRoleBadge', selector: 'span', text: '燕人' },
  { name: 'OverviewName', selector: 'span', text: '張飛', index: 1 },
  { name: 'Missing', selector: 'div' },
]);
assert.strictEqual(nodes.span[1].attrs['data-name'], 'OverviewRoleBadge');
assert.strictEqual(nodes.span[2].attrs['data-name'], 'OverviewName');
assert.strictEqual(nodes.span[0].attrs['data-name'], undefined); // 第一個「張飛」（前後空白不計）被 index 跳過
assert.deepStrictEqual(report.map(r => r.matched), [true, true, false]);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bindmap-'));
const good = path.join(tmp, 'good.json');
fs.writeFileSync(good, JSON.stringify({ bindings: [{ name: 'A', selector: 'span' }] }));
assert.strictEqual(loadBindMap(good).length, 1);
assert.deepStrictEqual(loadBindMap(path.join(tmp, 'none.json')), []);
const bad = path.join(tmp, 'bad.json');
fs.writeFileSync(bad, JSON.stringify({ bindings: [{ name: 'A' }] }));
assert.throws(() => loadBindMap(bad), /name and selector/);
fs.rmSync(tmp, { recursive: true, force: true });

console.log('[html-bind-map] ok');
