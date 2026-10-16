'use strict';
const fs = require('fs'), assert = require('assert');
const load = id => JSON.parse(fs.readFileSync('assets/resources/ui-spec/layouts/' + id + '.json', 'utf8'));
const layouts = ['lobby-season-hud-main', 'lobby-deck-select-main', 'lobby-lead-select-main'].map(load);
const canvas = { x: 0, y: 0, width: layouts[0].canvas.designWidth, height: layouts[0].canvas.designHeight };
function rect(node, parent) {
    const w = node.widget || {};
    const width = node.width ?? parent.width - (w.left || 0) - (w.right || 0);
    const height = node.height ?? parent.height - (w.top || 0) - (w.bottom || 0);
    return { name: node.name, x: parent.x + (w.left ?? parent.width - (w.right || 0) - width),
        y: parent.y + (w.top ?? parent.height - (w.bottom || 0) - height), width, height };
}
function inside(a, b) { return a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height; }
function separate(a, b) { return a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y; }
const cards = layouts.map(layout => rect(layout.root.children[0], canvas));
for (const card of cards) assert(inside(card, canvas), card.name + ' exceeds canvas');
for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    assert(separate(cards[i], cards[j]), cards[i].name + ' overlaps ' + cards[j].name);
}
const hudChildren = layouts[0].root.children[0].children.map(node => ({ ...rect(node, cards[0]), type: node.type }));
for (const child of hudChildren) assert(inside(child, cards[0]), child.name + ' exceeds HUD');
for (let i = 0; i < hudChildren.length; i++) for (let j = i + 1; j < hudChildren.length; j++) {
    assert(separate(hudChildren[i], hudChildren[j]), hudChildren[i].name + ' overlaps ' + hudChildren[j].name);
}
const buttons = hudChildren.filter(node => node.type === 'button');
assert.equal(buttons.length, 8);
for (const button of buttons) assert(button.width >= 44 && button.height >= 44, button.name + ' is below minimum touch area');
const spirit = buttons.find(n => n.name === 'BtnOpenSpiritCodex'), sandtable = buttons.find(n => n.name === 'BtnOpenSandtable');
assert(spirit.y >= sandtable.y + sandtable.height, 'Spirit must remain below Sandtable');
const navNode = load('lobby-main-screen.layout').root.children.find(n => n.name === 'GameplayNavigation');
const navigation = rect(navNode, canvas);
for (const card of cards) assert(separate(card, navigation), card.name + ' overlaps bottom navigation');
console.log(JSON.stringify({ pass: true, cards, buttons, navigation }, null, 2));
