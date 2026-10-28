/**
 * ServerSchemaSync06 — /sync/delta 的 JSON Pointer 路徑白名單（SYNC-06 / PROG-2-1396）
 *
 * 驗證重點：
 *   1. 白名單與客戶端 PlayerSaveSnapshot 的頂層欄位完全相同（契約測試，欄位增減會在這裡失敗）
 *   2. 白名單內的路徑（含巢狀與 ~1 跳脫）通過
 *   3. 白名單外、空路徑、非 JSON Pointer、非 RFC 6902 op、原型污染段一律拒絕
 *   4. 端到端：竄改路徑的 /sync/delta 回 400，存檔快照不被改寫
 */
import { assert, TestSuite } from './TestRunner';
import { SYNC_PATCH_ROOT_KEYS, validateSyncPatchPaths } from '../server/schema/sync06-patch-whitelist';
import { createDefaultPlayerStore, createSyncApp, PlayerStore } from '../server/src/sync';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

// 其他 suite 會把 globalThis.fetch 換成 mock；在 module 載入時先記住真實 fetch
const realFetch: typeof fetch | undefined = (globalThis as any).fetch;

/** 從客戶端存檔定義取出 PlayerSaveSnapshot 的頂層欄位名稱。 */
function clientSnapshotKeys(): string[] {
    const source = fs.readFileSync(path.resolve(__dirname, '../assets/scripts/core/services/PlayerSaveService.ts'), 'utf8') as string;
    const start = source.indexOf('export interface PlayerSaveSnapshot {');
    const end = source.indexOf('\n}', start);
    const body = source.slice(start, end).split('\n');
    return body
        .map((line) => /^    ([A-Za-z_][A-Za-z0-9_]*)\??:/.exec(line))
        .filter((match): match is RegExpExecArray => match !== null)
        .map((match) => match[1]);
}

export function createServerSchemaSync06Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaSync06 (/sync/delta 路徑白名單 SYNC-06)');

    suite.test('白名單與客戶端 PlayerSaveSnapshot 頂層欄位完全相同', () => {
        const client = clientSnapshotKeys().sort();
        const whitelist = [...SYNC_PATCH_ROOT_KEYS].sort();
        assert.equals(client.length, whitelist.length, '欄位數量不同：請同步 sync06-patch-whitelist.ts');
        assert.equals(client.join(','), whitelist.join(','), '欄位內容不同：請同步 sync06-patch-whitelist.ts');
    });

    suite.test('白名單內的路徑（含巢狀與 ~1 跳脫）通過', () => {
        const ok = validateSyncPatchPaths([
            { op: 'replace', path: '/discoveryLevel', value: 3 },
            { op: 'replace', path: '/roster/0/str', value: 95 },
            { op: 'add', path: '/deck/-', value: 'TACTIC_A' },
            { op: 'remove', path: '/hallAssignments/task~1a' },
        ]);
        assert.isTrue(ok === null);
    });

    suite.test('白名單外的頂層欄位與空路徑被拒絕', () => {
        assert.isTrue(validateSyncPatchPaths([{ op: 'replace', path: '/secretKey', value: 1 }]) !== null);
        assert.isTrue(validateSyncPatchPaths([{ op: 'replace', path: '', value: {} }]) !== null);
        assert.isTrue(validateSyncPatchPaths([{ op: 'replace', path: 'discoveryLevel', value: 1 }]) !== null);
    });

    suite.test('非 RFC 6902 的 op 與非物件 patch 被拒絕', () => {
        assert.isTrue(validateSyncPatchPaths([{ op: 'move', path: '/deck/0', from: '/deck/1' }]) !== null);
        assert.isTrue(validateSyncPatchPaths([null]) !== null);
        assert.isTrue(validateSyncPatchPaths([{ op: 'replace' }]) !== null);
    });

    suite.test('原型污染段在任何位置都被拒絕', () => {
        assert.isTrue(validateSyncPatchPaths([{ op: 'replace', path: '/roster/0/__proto__/polluted', value: 1 }]) !== null);
        assert.isTrue(validateSyncPatchPaths([{ op: 'replace', path: '/constructor/prototype/x', value: 1 }]) !== null);
    });

    suite.test('端到端：竄改路徑的 /sync/delta 回 400，存檔快照不被改寫', async () => {
        assert.isDefined(realFetch, 'Node 需內建 fetch（Node 18+）');
        const store: PlayerStore = createDefaultPlayerStore();
        const player = store.PLAYER_TEST_01;
        const before = JSON.stringify(player.Save_Snapshot);
        const app = createSyncApp(store, { log: () => undefined });
        const server = await new Promise<{ close(cb?: () => void): void; address(): unknown }>((resolve) => {
            const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
        });
        const port = (server.address() as { port: number }).port;
        try {
            const response = await realFetch!(`http://127.0.0.1:${port}/sync/delta`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: 'PLAYER_TEST_01',
                    sessionToken: player.Session_Secret,
                    baseHash: player.Last_Sync_Hash,
                    actionRecords: [],
                    patches: [{ op: 'replace', path: '/secretKey', value: 'hacked' }],
                }),
            });
            assert.equals(400, response.status);
            assert.equals(before, JSON.stringify(player.Save_Snapshot), '被拒絕的 patch 不應改寫存檔');
        } finally {
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });

    return suite;
}
