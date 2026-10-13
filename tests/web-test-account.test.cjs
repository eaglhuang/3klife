const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createVerificationAccount, startIsolatedSyncBackend, mapVerificationRequest } = require('../tools_node/lib/web-test-account');

test('two executions of the same verifier get different accounts', () => {
    const a = createVerificationAccount(), b = createVerificationAccount();
    assert.notEqual(a.playerId, b.playerId);
    assert.match(a.playerId, /^WEB_VERIFY_/);
});
test('routing changes only test identity/address, preserves credentials and hashes, ignores unrelated traffic', () => {
    const backend = { account: createVerificationAccount(), url: 'http://127.0.0.1:1234' };
    const body = { Player_ID: 'PLAYER_TEST_01', Session_Secret: 'secret', Previous_Hash: 'anchor', Action_Records: [{ Tx_Hash: 'hash', Payload: { Gold: 10 } }] };
    const mapped = mapVerificationRequest('http://localhost:3000/sync', JSON.stringify(body), backend);
    assert.deepEqual(JSON.parse(mapped.postData), { ...body, Player_ID: backend.account.playerId });
    assert.equal(mapVerificationRequest('https://example.com/sync', JSON.stringify(body), backend), null);
    assert.equal(mapVerificationRequest('http://localhost:3000/health', undefined, backend), null);
    assert.equal(new URL(mapVerificationRequest('http://localhost:3000/sync/full?playerId=PLAYER_TEST_01', undefined, backend).url).searchParams.get('playerId'), backend.account.playerId);
});
test('concurrent fixture accounts accept real HMAC chains and rotate secrets independently', async () => {
    const a = await startIsolatedSyncBackend(), b = await startIsolatedSyncBackend();
    try {
        const { computeTxHash, createDefaultPlayerStore } = require(path.resolve(__dirname, '../server/src/sync.ts'));
        const initial = createDefaultPlayerStore().PLAYER_TEST_01;
        async function send(backend, secret, hash, seq) {
            const payload = { Gold: 20 }, action = 'BATTLE_WIN';
            const body = { Player_ID: 'PLAYER_TEST_01', Session_Secret: secret, Previous_Hash: hash,
                Action_Records: [{ Seq: seq, Action: action, Payload: payload, Tx_Hash: computeTxHash(action, payload, secret, hash) }] };
            const request = mapVerificationRequest('http://localhost:3000/sync', JSON.stringify(body), backend);
            const response = await fetch(request.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: request.postData });
            assert.equal(response.status, 200);
            const result = await response.json();
            assert.equal(result.Success, true);
            return result;
        }
        const [firstA, firstB] = await Promise.all([send(a, initial.Session_Secret, initial.Last_Sync_Hash, 1), send(b, initial.Session_Secret, initial.Last_Sync_Hash, 1)]);
        assert.notEqual(a.account.playerId, b.account.playerId);
        assert.notEqual(firstA.New_Session_Secret, firstB.New_Session_Secret);
        await Promise.all([send(a, firstA.New_Session_Secret, firstA.New_Hash, 2), send(b, firstB.New_Session_Secret, firstB.New_Hash, 2)]);
    } finally { await Promise.all([a.close(), b.close()]); }
});
