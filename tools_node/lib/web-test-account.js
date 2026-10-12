'use strict';
const { randomUUID } = require('crypto');
const path = require('path');
const projectRoot = path.resolve(__dirname, '../..');
const CLIENT_TEST_PLAYER_ID = 'PLAYER_TEST_01';

function createVerificationAccount() {
    return { playerId: `WEB_VERIFY_${randomUUID()}` };
}

/** Test fixture only: reuse the real routes and default initial credential; each run owns a distinct store. */
async function startIsolatedSyncBackend(account = createVerificationAccount()) {
    require('ts-node').register({ project: path.join(projectRoot, 'tsconfig.test.json'), transpileOnly: true });
    const { createSyncApp, createDefaultPlayerStore } = require(path.join(projectRoot, 'server/src/sync.ts'));
    const express = require(require.resolve('express', { paths: [path.join(projectRoot, 'server')] }));
    const cors = require(require.resolve('cors', { paths: [path.join(projectRoot, 'server')] }));
    const template = createDefaultPlayerStore()[CLIENT_TEST_PLAYER_ID];
    if (!template) throw Error('Default test account fixture missing');
    const store = { [account.playerId]: JSON.parse(JSON.stringify(template)) };
    const app = express();
    app.use(cors());
    app.use(createSyncApp(store, { log: () => undefined }));
    const server = await new Promise((resolve, reject) => {
        const running = app.listen(0, '127.0.0.1', () => resolve(running));
        running.once('error', reject);
    });
    return {
        account,
        url: `http://127.0.0.1:${server.address().port}`,
        routedRequests: 0,
        close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
    };
}

/** Only the verifier's fixed test identity/address changes. Credentials, hashes and payloads remain intact. */
function mapVerificationRequest(url, postData, backend) {
    const parsed = new URL(url);
    if (!['localhost', '127.0.0.1'].includes(parsed.hostname) || parsed.port !== '3000' || !/^\/sync(?:\/|$)/.test(parsed.pathname)) return null;
    const target = new URL(parsed.pathname + parsed.search, backend.url);
    if (target.searchParams.get('playerId') === CLIENT_TEST_PLAYER_ID) target.searchParams.set('playerId', backend.account.playerId);
    let data = postData;
    if (postData) {
        const body = JSON.parse(postData);
        for (const key of ['Player_ID', 'playerId']) {
            if (body[key] !== undefined) {
                if (body[key] !== CLIENT_TEST_PLAYER_ID) throw Error('Unexpected client test account');
                body[key] = backend.account.playerId;
            }
        }
        data = JSON.stringify(body);
    }
    return { url: target.href, ...(data === undefined ? {} : { postData: data }) };
}

async function installVerificationAccount(page, backend, onError) {
    await page.setRequestInterception(true);
    const handler = async request => {
        try {
            const mapped = mapVerificationRequest(request.url(), request.postData(), backend);
            if (mapped) {
                backend.routedRequests += 1;
                const headers = { ...request.headers() };
                delete headers['content-length'];
                await request.continue({ ...mapped, headers });
            } else await request.continue();
        } catch (error) {
            onError(error);
            await request.abort().catch(() => undefined);
        }
    };
    page.on('request', handler);
    return () => page.off('request', handler);
}

module.exports = { createVerificationAccount, startIsolatedSyncBackend, mapVerificationRequest, installVerificationAccount };
