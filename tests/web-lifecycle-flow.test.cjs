const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateOracleState, runLifecycleFlow } = require('../tools_node/lib/web-lifecycle-flow');

const state = () => ({ scene: 'LobbyScene', labels: [
    { name: 'OracleTitle', text: '名士占卜' },
    { name: 'TokenLabel', text: '求籤令 ×3' },
    { name: 'OracleEmptyHint', text: '沒有可占卜武將' },
] });
test('records empty roster without claiming a divination', () => {
    assert.equal(validateOracleState(state()).emptyRoster, true);
    assert.equal(validateOracleState(state()).tokenLabel, '求籤令 ×3');
});
test('accepts a populated panel without requiring empty hint', () => {
    const input = state(); input.labels.pop();
    assert.equal(validateOracleState(input).emptyRoster, false);
});
test('rejects wrong scene, missing title and missing token counter', () => {
    assert.throws(() => validateOracleState({ ...state(), scene: 'BattleScene' }), /LobbyScene/);
    for (const missing of ['OracleTitle', 'TokenLabel']) {
        const input = state(); input.labels = input.labels.filter((label) => label.name !== missing);
        assert.throws(() => validateOracleState(input), /missing/);
    }
});
test('rejects malformed token counter', () => {
    const input = state(); input.labels[1].text = '求籤令 unavailable';
    assert.throws(() => validateOracleState(input), /counter missing/);
});
test('a navigation timeout propagates instead of reporting success', async () => {
    const page = { evaluate: async () => undefined, waitForFunction: async () => { throw new Error('Login timeout'); } };
    await assert.rejects(runLifecycleFlow(page, { initialSettleMs: 1 }), /Login timeout/);
});
