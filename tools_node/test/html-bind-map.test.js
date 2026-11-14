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

// looseText：外層 div 依全文比對，裡面的裸文字包成 span 後命名；重跑不重包
const bioText = { nodeType: 3, textContent: '張飛，字翼德' };
const header = Object.assign(fakeNode('人物小傳'), { nodeType: 1 });
const bioDiv = Object.assign(fakeNode('人物小傳張飛，字翼德'), { childNodes: [header, bioText] });
bioDiv.insertBefore = function (n, ref) { this.childNodes.splice(this.childNodes.indexOf(ref), 0, n); };
nodes.div = [bioDiv];
global.document.createElement = () => {
  const el = Object.assign(fakeNode(''), { nodeType: 1, childNodes: [] });
  el.appendChild = function (n) { bioDiv.childNodes.splice(bioDiv.childNodes.indexOf(n), 1); this.childNodes.push(n); };
  return el;
};
const bioEntry = [{ name: 'OverviewBio', selector: 'div', text: '人物小傳張飛，字翼德', looseText: true }];
assert.deepStrictEqual(applyBindMapInPage(bioEntry).map(r => r.matched), [true]);
applyBindMapInPage(bioEntry);
assert.strictEqual(bioDiv.childNodes.length, 2);
assert.strictEqual(bioDiv.childNodes[1].attrs['data-name'], 'OverviewBio');
assert.strictEqual(bioDiv.childNodes[1].childNodes[0], bioText);
assert.strictEqual(bioDiv.attrs['data-name'], undefined);
// 原稿已把同名標在外框上：名字移給文字後外框移除同名，避免兩節點撞樣式槽
bioDiv.attrs['data-name'] = 'OverviewBio';
bioDiv.removeAttribute = function (k) { delete this.attrs[k]; };
applyBindMapInPage(bioEntry);
assert.strictEqual(bioDiv.attrs['data-name'], undefined);
assert.strictEqual(bioDiv.childNodes[1].attrs['data-name'], 'OverviewBio');
delete nodes.div;

// whenText：畫面沒有該文字就不套用也不回報未命中，切頁重用的元素要清掉舊名
const reused = Object.assign(fakeNode('甲'), { removeAttribute(k) { delete this.attrs[k]; } });
nodes.p = [reused];
nodes['[data-name="Gated"]'] = [reused];
const gated = [{ name: 'Gated', selector: 'p', whenText: '屬性頁' }];
global.document.body.innerText = '屬性頁 內容';
assert.deepStrictEqual(applyBindMapInPage(gated).map(r => r.matched), [true]);
assert.strictEqual(reused.attrs['data-name'], 'Gated');
global.document.body.innerText = '總覽頁';
assert.deepStrictEqual(applyBindMapInPage(gated), []);
assert.strictEqual(reused.attrs['data-name'], undefined);
delete nodes.p;

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
