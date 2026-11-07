import { TestSuite, assert } from './TestRunner';
import { computeTxHash, createDefaultPlayerStore, createSyncApp } from '../server/src/sync';
import { findPii, findPiiInRecords } from '../server/src/sync-security';

/**
 * 同步安全規範（SYNC-09，PROG-2-1989）：非 HTTPS 被拒（dev 例外）；Action_Records payload 含 PII 整批拒絕。
 * 端到端走 in-process express，fetch 用模組載入時的真實 fetch（其他 suite 會換成 mock）。
 */
const realFetch: typeof fetch | undefined = (globalThis as any).fetch;

async function withServer(app: ReturnType<typeof createSyncApp>, run: (base: string) => Promise<void>): Promise<void> {
    const server = await new Promise<{ close(cb?: () => void): void; address(): any }>((resolve) => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener as any));
    });
    try {
        await run(`http://127.0.0.1:${server.address().port}`);
    } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
}

function post(base: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
    return realFetch!(`${base}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
}

/** 依伺服器雜湊鏈組一筆合法的 /sync 請求 */
function syncBody(store: ReturnType<typeof createDefaultPlayerStore>, payload: unknown) {
    const player = store.PLAYER_TEST_01;
    const hash = computeTxHash('TEST', payload, player.Session_Secret, player.Last_Sync_Hash);
    return {
        Player_ID: 'PLAYER_TEST_01', Session_Secret: player.Session_Secret, Previous_Hash: player.Last_Sync_Hash,
        Action_Records: [{ Seq: 1, Action: 'TEST', Payload: payload, Tx_Hash: hash, Timestamp: 0 }],
    };
}

export function createSyncSecuritySuite(): TestSuite {
    const suite = new TestSuite('SyncSecurity（SYNC-09 HTTPS 與 PII 過濾 PROG-2-1989）');

    suite.test('PII 判定：欄位名（忽略大小寫底線）、email、手機號碼；一般遊戲資料放行', () => {
        assert.equals('Payload.user.Real_Name', findPii({ user: { Real_Name: 'x' } }));
        assert.equals('Payload.note', findPii({ note: '聯絡 a@b.com' }));
        assert.equals('Payload.list.0', findPii({ list: ['0912-345-678'] }));
        assert.equals(null, findPii({ generalId: 'zhao-yun', gold: 1200, season: 3, name: '趙雲', deviceId: 'DEV_1234567890_001', at: '1700000000000x' }));
        assert.equals(2, findPiiInRecords([
            { Seq: 1, Action: 'A', Payload: { gold: 1 }, Tx_Hash: '', Timestamp: 0 },
            { Seq: 2, Action: 'B', Payload: { email: 'x' }, Tx_Hash: '', Timestamp: 0 },
        ] as never)!.seq);
    });

    suite.test('端到端：payload 含 PII 回 400，伺服器錨點不變', async () => {
        const store = createDefaultPlayerStore();
        const anchor = store.PLAYER_TEST_01.Last_Sync_Hash;
        await withServer(createSyncApp(store, { log: () => undefined }), async (base) => {
            const res = await post(base, syncBody(store, { phone: '0912345678' }));
            assert.equals(400, res.status);
            assert.equals(anchor, store.PLAYER_TEST_01.Last_Sync_Hash);
        });
    });

    suite.test('端到端：requireHttps 時 http 回 403、x-forwarded-proto https 放行；dev 預設不擋', async () => {
        await withServer(createSyncApp(createDefaultPlayerStore(), { log: () => undefined, requireHttps: true }), async (base) => {
            assert.equals(403, (await post(base, { Player_ID: 'NOBODY' })).status);
            assert.equals(404, (await post(base, { Player_ID: 'NOBODY' }, { 'x-forwarded-proto': 'https' })).status);
        });
        await withServer(createSyncApp(createDefaultPlayerStore(), { log: () => undefined }), async (base) => {
            assert.equals(404, (await post(base, { Player_ID: 'NOBODY' })).status);
        });
    });

    return suite;
}
