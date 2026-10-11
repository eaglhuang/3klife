import { TestSuite, assert } from './TestRunner';
import { SyncManager } from '../assets/scripts/core/systems/SyncManager';
import { NetworkService } from '../assets/scripts/core/systems/NetworkService';
import { EventSystem } from '../assets/scripts/core/systems/EventSystem';
import { computeSyncTxHash } from '../assets/scripts/core/systems/SyncHash';
import { computeTxHash, createDefaultPlayerStore, createSyncApp, PlayerStore } from '../server/src/sync';
import { sys } from 'cc';

/**
 * 同步契約測試：客戶端 SyncManager ↔ 伺服器 server/src/sync.ts。
 *
 * 1. 雜湊算法：客戶端純 TS HMAC-SHA256 與伺服器 crypto-js 版本逐位元相同，且對得上 smoke fixture。
 * 2. 端到端：真實 SyncManager 透過真實 fetch 打 in-process 的 express 伺服器，
 *    覆蓋 /sync、/sync/delta、/sync/full（409 fallback）、/sync/actions 與竄改拒絕。
 *
 * Unity 對照：像 PlayMode 測試直接連本機 Dedicated Server，而不是 mock 掉 UnityWebRequest。
 */

// 其他 suite 會把 globalThis.fetch 換成 mock；在 module 載入時先記住真實 fetch
const realFetch: typeof fetch | undefined = (globalThis as any).fetch;

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
    const startedAt = Date.now();
    while (!predicate()) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error('waitFor timeout');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

export function createSyncContractSuite() {
    const suite = new TestSuite('Sync Contract (Client ↔ Server)');

    let server: { close(cb?: () => void): void } | null = null;
    let store: PlayerStore = createDefaultPlayerStore();
    let sync: SyncManager;
    let net: NetworkService;

    const player = () => store.PLAYER_TEST_01;
    const pending = () => (sync as any).actionRecords as Array<{ Payload: any }>;
    const setOnline = (online: boolean) => { (net as any)._isOnline = online; };

    suite.test('雜湊契約：客戶端 HMAC-SHA256 對得上伺服器 smoke fixture', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fixture = require('../server/smoke-fixtures/sync-request.valid.json');
        let previous = fixture.Previous_Hash as string;
        for (const record of fixture.Action_Records) {
            const hash = computeSyncTxHash(record.Action, record.Payload, fixture.Session_Secret, previous);
            assert.equals(record.Tx_Hash, hash, `Seq #${record.Seq} 雜湊應與伺服器 fixture 相同`);
            previous = hash;
        }
    });

    suite.test('雜湊契約：客戶端與伺服器實作逐筆相同（含中文、emoji、長金鑰）', () => {
        const cases: Array<[string, unknown, string, string]> = [
            ['BATTLE_WIN', { Gold: 120 }, 'MOCK_SECRET_KEY', 'INIT_HASH'],
            ['GENERAL_RECRUIT', { name: '關羽', note: '義薄雲天😀' }, 's'.repeat(80), 'a'.repeat(64)],
            ['EMPTY', {}, '', ''],
            ['NO_PAYLOAD', undefined, 'k', 'p'],
            ['LIST', [1, 'two', { three: 3 }], '金鑰', '錨點'],
        ];
        for (const [action, payload, secret, previous] of cases) {
            const client = computeSyncTxHash(action, payload, secret, previous);
            assert.equals(computeTxHash(action, payload, secret, previous), client, `${action} 雜湊應一致`);
            assert.isTrue(/^[0-9a-f]{64}$/.test(client), `${action} 應為 64 字元 hex`);
        }
    });

    suite.test('端到端：啟動 in-process 同步伺服器', async () => {
        assert.isDefined(realFetch, 'Node 需內建 fetch（Node 18+）');
        store = createDefaultPlayerStore();
        const app = createSyncApp(store, { log: () => undefined });
        const port = await new Promise<number>((resolve) => {
            const listener = app.listen(0, '127.0.0.1', () => resolve((listener.address() as any).port));
            server = listener;
        });

        (globalThis as any).fetch = realFetch;
        (sys as any).getNetworkType = () => sys.NetworkType.LAN;
        sys.localStorage.clear();

        const ev = new EventSystem();
        net = new NetworkService();
        sync = new SyncManager();
        net.setup(ev);
        sync.setServerUrl(`http://127.0.0.1:${port}`);
        sync.setup(ev, net);
        await sync.whenHydrated();
        assert.isTrue(net.isOnline, '應處於連線狀態');
    });

    suite.test('/sync：連續行動通過雜湊驗證、金鑰輪換後仍可續傳', async () => {
        (globalThis as any).fetch = realFetch;
        assert.isTrue(sync.pushAction('BATTLE_WIN', { Gold: 120 }), '第 1 筆應寫入');
        assert.isTrue(sync.pushAction('SHOP_BUY', { Cost: 40 }), '第 2 筆（同步途中寫入）應寫入');
        await waitFor(() => pending().length === 0);

        assert.equals(1080, player().Assets.Gold, '伺服器應重演兩筆行動');
        assert.equals(player().Last_Sync_Hash, sync.getAnchorHash(), '客戶端錨點應與伺服器一致');
        assert.notEquals('MOCK_SECRET_KEY', player().Session_Secret, '伺服器應輪換金鑰');
        assert.equals(player().Session_Secret, (sync as any).sessionSecret, '客戶端應採用新金鑰');

        assert.isTrue(sync.pushAction('BATTLE_WIN', { Gold: 5 }));
        await waitFor(() => pending().length === 0);
        assert.equals(1085, player().Assets.Gold, '輪換金鑰後的下一次同步也應通過');
    });

    suite.test('/sync/full + /sync/delta：存檔快照與行動紀錄一起同步', async () => {
        (globalThis as any).fetch = realFetch;
        const base = { year: 1, generals: [{ id: 'G001', age: 16 }] };
        await sync.syncFull(base);
        assert.equals(JSON.stringify(base), JSON.stringify(player().Save_Snapshot), 'full sync 應覆蓋伺服器快照');
        assert.equals(player().Last_Sync_Hash, sync.getAnchorHash());

        setOnline(false);
        sync.pushAction('BATTLE_WIN', { Gold: 15 });
        setOnline(true);

        const current = { year: 2, generals: [{ id: 'G001', age: 17 }, { id: 'G002', age: 0 }] };
        await sync.syncDelta(base, current);
        assert.equals(JSON.stringify(current), JSON.stringify(player().Save_Snapshot), 'delta patch 應套用到伺服器快照');
        assert.equals(1100, player().Assets.Gold, 'delta 夾帶的行動紀錄應被重演');
        assert.lengthEquals(0, pending(), '已送出的行動紀錄應清空');
        assert.equals(player().Last_Sync_Hash, sync.getAnchorHash());
    });

    suite.test('/sync/delta 錨點不符回 409 時自動改走 /sync/full', async () => {
        (globalThis as any).fetch = realFetch;
        player().Last_Sync_Hash = 'ANCHOR_FROM_OTHER_DEVICE';
        const current = { year: 3, generals: [] as unknown[] };
        await sync.syncDelta({ year: 2 }, current);
        assert.equals(JSON.stringify(current), JSON.stringify(player().Save_Snapshot), 'fallback full sync 應覆蓋快照');
        assert.equals(player().Last_Sync_Hash, sync.getAnchorHash(), 'fallback 後錨點應重新對齊');
    });

    suite.test('/sync/actions：gzip 壓縮批次上傳通過驗證', async () => {
        (globalThis as any).fetch = realFetch;
        setOnline(false);
        sync.pushAction('BATTLE_WIN', { Gold: 7 });
        sync.pushAction('BATTLE_WIN', { Gold: 3 });
        setOnline(true);

        await sync.flushCompressedActions();
        assert.lengthEquals(0, pending(), '批次上傳後佇列應清空');
        assert.equals(1110, player().Assets.Gold, '伺服器應重演批次行動');
        assert.equals(player().Last_Sync_Hash, sync.getAnchorHash());
    });

    suite.test('竄改過的行動紀錄會被伺服器拒絕，客戶端保留佇列', async () => {
        (globalThis as any).fetch = realFetch;
        const anchorBefore = sync.getAnchorHash();
        setOnline(false);
        sync.pushAction('BATTLE_WIN', { Gold: 1 });
        pending()[0].Payload.Gold = 99999; // 改 payload 但不重算雜湊
        setOnline(true);

        await (sync as any).syncNow();
        assert.equals(1110, player().Assets.Gold, '竄改紀錄不應被重演');
        assert.lengthEquals(1, pending(), '被拒絕的紀錄應留在佇列');
        assert.equals(anchorBefore, sync.getAnchorHash(), '錨點不應前進');
        assert.equals(anchorBefore, player().Last_Sync_Hash, '伺服器錨點不應前進');
    });

    suite.test('端到端：關閉同步伺服器', async () => {
        (sync as any).actionRecords = [];
        await sync.flushLocalState();
        await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
        server = null;
    });

    return suite;
}
