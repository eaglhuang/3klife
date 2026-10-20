/**
 * DataMounts — Root Save `Data.*` 掛載點骨架與補齊（DS-04，PROG-2-0498）
 *
 * 驗證重點：
 *   1. 掛載清單涵蓋規格 §二.2 的 25 個頂層路徑，且不重複
 *   2. 新存檔的預設骨架每個掛載點都存在，形狀與清單一致
 *   3. 補齊只補缺漏，不覆寫玩家已有資料（含 null、空陣列）
 *   4. 遷移步驟經 runSemverMigrations 可跑通，且不動 Data 以外的欄位
 *
 * Unity 對照：EditMode Test 驗證 ScriptableObject 預設值與舊資料升級，不碰磁碟。
 */
import { assert, TestSuite } from './TestRunner';
import {
    DATA_MOUNT_KEYS,
    DATA_MOUNT_MIGRATION_STEP,
    DATA_MOUNT_SPECS,
    createDefaultDataMounts,
    fillMissingDataMounts,
    listMissingDataMounts,
} from '../assets/scripts/core/storage/DataMounts';
import { runSemverMigrations } from '../assets/scripts/core/storage/SaveVersion';

export function createDataMountsSuite(): TestSuite {
    const suite = new TestSuite('DataMounts (Data 掛載點骨架 DS-04)');

    suite.test('掛載清單為規格 §二.2 的 25 個頂層路徑，且不重複', () => {
        assert.equals(25, DATA_MOUNT_KEYS.length);
        assert.equals(25, new Set(DATA_MOUNT_KEYS).size);
    });

    suite.test('清單包含規格點名的關鍵子系統（培育、結緣、教官、經濟、大廳、日誌、他國、官職）', () => {
        for (const key of ['Nurture_Sessions', 'Bonding_Sessions', 'Mentor_Pool', 'Player_Economy', 'Lobby_Hub', 'General_Journal', 'Rival_Nations', 'Officer_System']) {
            assert.isTrue(DATA_MOUNT_KEYS.includes(key), key);
        }
    });

    suite.test('預設骨架每個掛載點都存在，形狀與清單一致', () => {
        const data = createDefaultDataMounts();
        assert.equals(0, listMissingDataMounts(data).length);
        for (const spec of DATA_MOUNT_SPECS) {
            const value = data[spec.key];
            if (spec.shape === 'array') {
                assert.isTrue(Array.isArray(value), `${spec.key} 應為陣列`);
            } else {
                assert.isTrue(typeof value === 'object' && value !== null && !Array.isArray(value), `${spec.key} 應為物件`);
            }
        }
    });

    suite.test('補齊：缺的 key 被補上，已有的值一律保留（含 null 與空陣列）', () => {
        const existing = {
            Player_Economy: { Food: 1200 },
            Nurture_Sessions: [],
            Oracle_History: null,
        };
        const filled = fillMissingDataMounts(existing);
        assert.equals(1200, (filled.Player_Economy as { Food: number }).Food);
        assert.isTrue(Array.isArray(filled.Nurture_Sessions));
        assert.equals(null, filled.Oracle_History);
        assert.isTrue(filled.Lobby_Hub !== undefined);
        assert.equals(0, listMissingDataMounts(filled).length);
    });

    suite.test('補齊不修改傳入物件，且重複執行結果相同（冪等）', () => {
        const input: Record<string, unknown> = { Game_Time: { Turn_Count: 3 } };
        const once = fillMissingDataMounts(input);
        assert.equals(undefined, input.Lobby_Hub);
        const twice = fillMissingDataMounts(once);
        assert.equals(JSON.stringify(once), JSON.stringify(twice));
    });

    suite.test('遷移步驟：經 runSemverMigrations 升到 1.0.1，Data 補齊且其他欄位保留', () => {
        const legacy: Record<string, unknown> = {
            saveVersion: '1.0.0',
            Player_ID: 'USER_0945A8',
            Last_Sync_Hash: 'abc',
            Data: { Game_Time: { Turn_Count: 7 } },
            Action_Records: [],
        };
        const result = runSemverMigrations(legacy, [DATA_MOUNT_MIGRATION_STEP], '1.0.1');
        assert.equals('1.0.1', result.version);
        assert.equals(1, result.applied.length);
        assert.equals('USER_0945A8', result.data.Player_ID);
        assert.equals('abc', result.data.Last_Sync_Hash);
        const data = result.data.Data as Record<string, unknown>;
        assert.equals(7, (data.Game_Time as { Turn_Count: number }).Turn_Count);
        assert.equals(0, listMissingDataMounts(data).length);
    });

    return suite;
}
