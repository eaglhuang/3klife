const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertSaveEqual, assertTacticSpend, assertVictorySettlement, runContinuityFlow, reopenPage } = require('../tools_node/lib/web-continuity-flow');

test('closes old runtime before replacement and observes errors before navigation', async () => {
    const calls = [], viewport = { width: 1920, height: 1080 }, url = 'http://127.0.0.1:1234/';
    const reopened = {
        setViewport: async value => { assert.deepEqual(value, viewport); calls.push('viewport'); },
        goto: async value => { assert.equal(value, url); calls.push('navigate'); },
    };
    const page = {
        viewport: () => viewport, url: () => url,
        close: async () => calls.push('close'),
        browserContext: () => ({ newPage: async () => { calls.push('open'); return reopened; } }),
    };
    assert.equal(await reopenPage(page, { onPage: async () => {
        await new Promise(resolve => setImmediate(resolve));
        calls.push('observe');
    } }), reopened);
    assert.deepEqual(calls, ['close', 'open', 'observe', 'viewport', 'navigate']);
});

test('victory gate rejects double settlement and incorrect merit or vitality', () => {
    const before = { vitality: 100, battleRecord: { wins: 2, losses: 1, draws: 0, merit: 23 } };
    const after = { vitality: 70, battleRecord: { wins: 3, losses: 1, draws: 0, merit: 33 } };
    assertVictorySettlement(before, after);
    assert.throws(() => assertVictorySettlement(before, { ...after, vitality: 69 }), /inconsistent/);
    for (const key of ['wins', 'losses', 'draws', 'merit']) {
        assert.throws(() => assertVictorySettlement(before, {
            ...after, battleRecord: { ...after.battleRecord, [key]: after.battleRecord[key] + 1 },
        }), /inconsistent/);
    }
});

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
    const page = { evaluate: async () => false, waitForFunction: async () => { throw Error('login unavailable'); } };
    await assert.rejects(runContinuityFlow(page), error => {
        assert.equal(error.flowReport.completed, false);
        assert.equal(error.flowReport.failedStep, 'pointer-login');
        assert.deepEqual(error.flowReport.steps, []);
        return /login unavailable/.test(error.message);
    });
});
