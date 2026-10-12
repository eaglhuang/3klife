const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertSaveEqual, assertTacticSpend, runContinuityFlow } = require('../tools_node/lib/web-continuity-flow');

test('save comparison includes optional state and ignores only write timestamp', () => {
    const before = { roster: [{ id: 'a', battleRecord: { wins: 1 } }], deck: ['x'], gameTime: { year: 2 }, military: { food: 9 }, savedAt: 'before' };
    assertSaveEqual(before, { ...before, savedAt: 'after' });
    for (const key of ['roster', 'deck', 'gameTime', 'military']) {
        assert.throws(() => assertSaveEqual(before, { ...before, [key]: null }), /Save changed/);
    }
    assert.throws(() => assertSaveEqual(before, { roster: before.roster }), /Missing save field/);
});
test('summary or spending without a player effect event cannot pass tactics', () => {
    const before = { sortie: { tacticCurrent: 10 }, effects: [] };
    assert.throws(() => assertTacticSpend(before, before), /no point spending/);
    assert.throws(() => assertTacticSpend(before, { sortie: { tacticCurrent: 5 }, effects: [] }), /effect event/);
    assertTacticSpend(before, { sortie: { tacticCurrent: 5 }, effects: [{ faction: 'player' }] });
});
test('failed pointer login preserves incomplete progress and propagates failure', async () => {
    const page = { waitForFunction: async () => { throw Error('login unavailable'); } };
    await assert.rejects(runContinuityFlow(page), error => {
        assert.equal(error.flowReport.completed, false);
        assert.equal(error.flowReport.failedStep, 'pointer-login');
        assert.deepEqual(error.flowReport.steps, []);
        return /login unavailable/.test(error.message);
    });
});
