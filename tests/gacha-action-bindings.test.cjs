const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/core/GachaActionBindings.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
// 只測這一檔：GachaScreenNodes 的固定節點名以鍵名代替（名稱本身由 GachaScreenNodes 測試把關）
const fakeRequire = (id) => {
    if (id === './GachaScreenNodes') return { GACHA_NODES: new Proxy({}, { get: (_t, key) => `node:${String(key)}` }) };
    throw new Error(`unexpected require ${id}`);
};
new Function('module', 'exports', 'require', compiled)(loaded, loaded.exports, fakeRequire);
const { GACHA_ACTION_NODES, bindGachaActions } = loaded.exports;

function fixture() {
    const counts = {}, nodes = new Map(), owner = {};
    const actions = {};
    for (const [action, name] of Object.entries(GACHA_ACTION_NODES)) {
        counts[action] = 0;
        actions[action] = () => { counts[action]++; };
        nodes.set(name, {
            handlers: [], button: false,
            off(event, callback, target) { this.handlers = this.handlers.filter(h => h.event !== event || h.owner !== target); },
            on(event, callback, target) { this.handlers.push({ event, callback, owner: target }); },
            click() { for (const h of this.handlers) if (h.event === 'click') h.callback(); },
        });
    }
    const bind = () => bindGachaActions(n => nodes.get(n), n => { n.button = true; }, actions, owner, 'click');
    return { counts, nodes, owner, bind };
}

test('every displayed action dispatch to their own operation', () => {
    const f = fixture(); f.bind();
    for (const node of f.nodes.values()) { assert.equal(node.button, true); node.click(); }
    assert.deepEqual(Object.values(f.counts), Object.keys(GACHA_ACTION_NODES).map(() => 1));
});
test('reopening binds once and preserves other presenters', () => {
    const f = fixture(); let otherCalls = 0;
    const single = f.nodes.get(GACHA_ACTION_NODES.single);
    single.on('click', () => otherCalls++, {});
    f.bind(); f.bind(); f.bind(); single.click();
    assert.equal(f.counts.single, 1); assert.equal(otherCalls, 1);
});
test('a missing node is skipped and the other actions still bind', () => {
    const f = fixture(); f.nodes.delete(GACHA_ACTION_NODES.gold);
    f.bind();
    for (const node of f.nodes.values()) node.click();
    assert.equal(f.counts.gold, 0); assert.equal(f.counts.single, 1);
});
