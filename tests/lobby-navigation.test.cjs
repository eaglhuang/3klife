const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const json = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const required = ['btnGenerals', 'btnBattle', 'btnShop', 'btnGacha', 'btnSupportCard', 'btnFloodBattle'];
const screen = json('assets/resources/ui-spec/screens/lobby-main-screen.json');
const layout = json(`assets/resources/ui-spec/layouts/${screen.layout}.json`);
const skin = json(`assets/resources/ui-spec/skins/${screen.skin}.json`);
const i18n = json('assets/resources/i18n/zh-TW.json');
const nodes = [];
function walk(node) { nodes.push(node); (node.children || []).forEach(walk); }
walk(layout.root);
test('the screen actually loaded by runtime contains each required button exactly once', () => {
    for (const id of required) {
        const found = nodes.filter((node) => node.id === id);
        assert.equal(found.length, 1, id);
        assert.equal(found[0].type, 'button', id);
        assert.ok(skin.slots[found[0].skinSlot], id);
        const label = found[0].children.find((node) => node.type === 'label');
        assert.ok(label && i18n[label.textKey], `Localized caption for ${id}`);
        assert.ok(skin.slots[label.styleSlot], `Label style for ${id}`);
    }
});
test('navigation is edge anchored and uses responsive widths and touch sized heights', () => {
    const nav = nodes.find((node) => node.name === 'GameplayNavigation');
    assert.equal(nav.layout.type, 'horizontal');
    assert.equal(typeof nav.widget.bottom, 'number');
    assert.equal(typeof nav.widget.left, 'number');
    assert.equal(typeof nav.widget.right, 'number');
    for (const button of nav.children) {
        assert.match(button.width, /^\d+%$/);
        assert.ok(button.height >= 44);
    }
});
test('runtime and corresponding layout package keep identical navigation', () => {
    const counterpart = json('assets/resources/ui-spec/layouts/lobby-main-screen.layout.json');
    assert.deepEqual(counterpart.root.children.find((node) => node.name === 'GameplayNavigation'),
        layout.root.children.find((node) => node.name === 'GameplayNavigation'));
});
