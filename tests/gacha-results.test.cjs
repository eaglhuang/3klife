const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/core/GachaFlowCoordinator.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
let devCalls = 0;
class Button { static EventType = { CLICK: 'click' }; }
new Function('require', 'module', 'exports', compiled)((name) => {
    if (name === 'cc') return { Button };
    if (name.includes('GachaDevOverlay')) return { showGachaResults: () => { devCalls++; }, showGachaHistory: () => {} };
    if (name.includes('UCUFLogger')) return { UCUFLogger: { warn() {} }, LogCategory: {} };
    return {};
}, loaded, loaded.exports);
const { GachaFlowCoordinator } = loaded.exports;

function fixture(failScreen = false) {
    const calls = [], errors = [], owned = [], nodes = new Map();
    const binder = {
        texts: {}, actives: {}, setTexts(x) { this.texts = x; }, setActives(x) { this.actives = x; },
        getNode(name) {
            if (!nodes.has(name)) nodes.set(name, {
                handler: null, getComponent() { return null; }, addComponent() { return {}; },
                off() { this.handler = null; }, on(_event, callback, owner) { this.handler = () => callback.call(owner); },
            });
            return nodes.get(name);
        },
    };
    const entry = (index) => ({ general: { name: '武將' + index }, rarityTier: index === 1 ? 'mythic' : 'rare' });
    const service = {
        async performGoldSummon(count) { calls.push(['gold', count]); return [entry(0)]; },
        async performTicketSummon(count) { calls.push(['ticket', count]); return [entry(0)]; },
        async performLocalGacha(_pool, count, cost) { calls.push(['gems', count, cost]); return Array.from({ length: count }, (_, i) => entry(i)); },
        getWalletSnapshot() { return { gold: 500, gems: 100, tickets: 1 }; },
    };
    const host = { binder, async showScreen(id) { assert.ok(owned.length); if (failScreen) throw Error('resource failed'); assert.equal(id, 'gacha-pull-result'); } };
    let back = 0;
    const coordinator = new GachaFlowCoordinator({ gachaService: service, getHost: () => host,
        getGenerals: () => [], factionFilter: 'all', onAfterPullSuccess: r => owned.push(r),
        onShowError: e => errors.push(e), onBackToGacha: () => { back++; } });
    return { coordinator, binder, calls, errors, owned, nodes, back: () => back };
}

for (const [method, currency, text] of [['runGoldSummon', 'gold', '金幣'], ['runTicketSummon', 'ticket', '召喚券'], ['runLocalGacha', 'gems', '單抽']]) {
    test(`${currency} single result is formal and retries the same currency once`, async () => {
        const f = fixture(); await f.coordinator[method](1);
        assert.match(f.binder.texts.GachaPullResult_div_42, new RegExp(text));
        assert.equal(Object.values(f.binder.actives).filter(Boolean).length, 1);
        const retry = f.nodes.get('GachaPullResult_div_413'); retry.handler(); retry.handler();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(f.calls.length, 2); assert.equal(f.calls[1][0], currency); assert.equal(f.calls[1][1], 1);
        f.nodes.get('GachaPullResult_div_412').handler(); assert.equal(f.back(), 1);
        assert.deepEqual(f.errors, []); assert.equal(devCalls, 0);
    });
}
test('ten pull keeps ten cards and selects the actual highest rarity', async () => {
    const f = fixture(); await f.coordinator.runLocalGacha(10);
    assert.equal(Object.values(f.binder.actives).filter(Boolean).length, 10);
    assert.equal(f.binder.texts.GachaPullResult_div_195, '武將1');
    f.nodes.get('GachaPullResult_div_413').handler(); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(f.calls[1], ['gems', 10, 1000]);
});
test('screen failure does not lose the completed recruitment notification', async () => {
    const f = fixture(true); await f.coordinator.runTicketSummon();
    assert.equal(f.owned.length, 1); assert.match(f.errors[0], /召喚已完成.*結果畫面載入失敗/);
});
