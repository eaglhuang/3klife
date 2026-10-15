'use strict';
const fs = require('fs');
const assert = require('assert');
const layout = JSON.parse(fs.readFileSync('assets/resources/ui-spec/layouts/lobby-season-hud-main.json', 'utf8'));
const card = layout.root.children.find(n => n.name === 'SeasonHudCard');
const rects = card.children.map(n => ({
    name: n.name, type: n.type,
    top: n.widget.top === undefined ? card.height - n.widget.bottom - n.height : n.widget.top,
    height: n.height,
}));
assert(card.widget.top + card.height <= layout.canvas.designHeight, 'Card exceeds canvas');
assert(card.widget.left + card.width <= layout.canvas.designWidth, 'Card exceeds canvas width');
for (const r of rects) {
    assert(r.top >= 0 && r.top + r.height <= card.height, `${r.name} exceeds card`);
}
for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    assert(a.top + a.height <= b.top || b.top + b.height <= a.top, `${a.name} overlaps ${b.name}`);
}
assert(rects.find(r => r.name === 'BtnOpenSpiritCodex').top > rects.find(r => r.name === 'BtnOpenSandtable').top,
    'Spirit entry must appear below Sandtable');
console.log(JSON.stringify({ ok: true, cardHeight: card.height, rects }, null, 2));
