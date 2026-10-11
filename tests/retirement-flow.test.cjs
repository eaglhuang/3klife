const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.TS_NODE_PROJECT = require('node:path').resolve(__dirname, '../tsconfig.test.json');
require('ts-node/register/transpile-only');
const { RetirementFlowController } = require('../assets/scripts/ui/core/RetirementFlowController');
const general = (id, extra = {}) => ({ id, name: id, age: 65, ...extra });

test('only living retirement-age owned generals are candidates', () => {
    const roster = [general('eligible'), general('young', { age: 64 }),
        general('dead', { status: 'DEAD' }), general('mentor', { isMentorCard: true })];
    const flow = new RetirementFlowController({ roster: () => roster, retireGeneral: async () => {} });
    assert.equal(flow.candidates().map(g => g.id).join(','), 'eligible');
});
test('first press confirms; second delegates once and reflects retirement', async () => {
    const roster = [general('one')];
    let calls = 0;
    const flow = new RetirementFlowController({ roster: () => roster, retireGeneral: async id => {
        assert.equal(id, 'one'); calls++; roster[0].isMentorCard = true;
    } });
    assert.equal(await flow.retire(), 'confirmation-required');
    assert.equal(calls, 0);
    assert.match(flow.notice, /不能再出戰或結緣/);
    assert.equal(await flow.retire(), 'retired');
    assert.equal(calls, 1);
    assert.equal(await flow.retire(), 'unavailable');
    assert.equal(calls, 1);
});
test('selection change and cancellation require fresh confirmation', async () => {
    let calls = 0;
    const flow = new RetirementFlowController({ roster: () => [general('one'), general('two')], retireGeneral: async () => { calls++; } });
    await flow.retire(); flow.selectNext();
    assert.equal(flow.selected.id, 'two');
    assert.equal(await flow.retire(), 'confirmation-required');
    flow.cancel();
    assert.equal(await flow.retire(), 'confirmation-required');
    assert.equal(calls, 0);
});
test('candidate disappearing never retires the replacement without confirmation', async () => {
    const roster = [general('one'), general('two')];
    let calls = 0;
    const flow = new RetirementFlowController({ roster: () => roster, retireGeneral: async () => { calls++; } });
    await flow.retire(); roster[0].status = 'dead';
    assert.equal(await flow.retire(), 'confirmation-required');
    assert.equal(flow.selected.id, 'two');
    assert.equal(calls, 0);
});
test('pending retirement blocks repeated submission and selection changes', async () => {
    let finish;
    let calls = 0;
    const flow = new RetirementFlowController({ roster: () => [general('one'), general('two')], retireGeneral: () => {
        calls++; return new Promise(resolve => { finish = resolve; });
    } });
    await flow.retire(); const pending = flow.retire();
    assert.equal(flow.busy, true);
    assert.equal(await flow.retire(), 'busy');
    flow.selectNext(); assert.equal(flow.selected.id, 'one');
    finish(); assert.equal(await pending, 'retired');
    assert.equal(calls, 1);
});
test('failure remains retryable and never reports success', async () => {
    const flow = new RetirementFlowController({ roster: () => [general('one')], retireGeneral: async () => { throw Error('save failed'); } });
    await flow.retire(); assert.equal(await flow.retire(), 'failed');
    assert.equal(flow.notice, 'save failed');
    assert.equal(flow.busy, false);
    assert.equal(await flow.retire(), 'confirmation-required');
});
