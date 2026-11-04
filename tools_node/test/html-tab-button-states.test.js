'use strict';
// 分頁鈕選中狀態：唯一樣式那顆是選中態；分不出來時不寫入
const assert = require('assert');
const { applyTabButtonVisualStates } = require('../lib/html-to-ucuf/tab-button-states');

const tab = (id) => ({ name: id, _contract: `tab.switch.${id}`, skinSlot: id });
const layout = { root: { children: [{ children: [tab('a'), tab('b'), tab('c')] }] } };
const dark = () => ({ kind: 'gradient-rect', gradient: { stops: [1] }, borderColor: '#444' });
const gold = () => ({ kind: 'gradient-rect', gradient: { stops: [2] }, borderColor: '#d4af37' });

const skin = { slots: { a: gold(), b: dark(), c: dark() } };
const result = applyTabButtonVisualStates(layout, skin);
assert.strictEqual(result.applied, true);
for (const id of ['a', 'b', 'c']) {
  assert.deepStrictEqual(skin.slots[id].visualStates, { normal: 'b', selected: 'a' });
}

const allSame = { slots: { a: dark(), b: dark(), c: dark() } };
assert.strictEqual(applyTabButtonVisualStates(layout, allSame).applied, false);
assert.strictEqual(allSame.slots.a.visualStates, undefined);

const buttonSkin = () => ({ kind: 'button-skin', normal: 'x', selected: 'y' });
const sprites = { slots: { a: buttonSkin(), b: buttonSkin(), c: buttonSkin() } };
assert.strictEqual(applyTabButtonVisualStates(layout, sprites).applied, false);

console.log('html-tab-button-states ok');
