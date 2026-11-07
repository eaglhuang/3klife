/**
 * DataMountRegistry — Data.* 掛載點與 doc_spec_0319 列舉驗證（PROG-2-1945）
 */
import { assert, TestSuite } from './TestRunner';
import { DATA_MOUNT_KEYS, ensureDataMounts, validateRootSaveData } from '../assets/scripts/core/models/DataMountRegistry';

export function createDataMountRegistrySuite(): TestSuite {
    const suite = new TestSuite('DataMountRegistry (資料結構列舉 doc_spec_0319 PROG-2-1945)');

    suite.test('25 條掛載點補齊且不動既有值', () => {
        assert.equals(25, DATA_MOUNT_KEYS.length);
        const r = ensureDataMounts({ Generals: { g1: 1 } });
        assert.equals(24, r.added.length);
        assert.equals(1, (r.data.Generals as Record<string, number>).g1);
        assert.equals(0, ensureDataMounts(r.data).added.length);
    });

    suite.test('非侵入：空資料通過；合法值通過', () => {
        assert.isTrue(validateRootSaveData({}).isValid);
        const ok = validateRootSaveData({
            Rival_Nations: { wei: { Coalition_State: 'HEGEMON' } },
            Battle_State: { Reserved_Tally_Bands: ['SR', 'UR'] },
            Officer_Promotion: { Rank_Track: 'CIVIL' },
            Sortie_Loadout: { Main_General_UID: 'a', Deputy_General_UID: 'b' },
            Action_Records: { 'seq-1': {} },
            General_Journal: { Offline_Battle_Snapshots: [{ Sync_Hash_Link: 'seq-1' }, { Sync_Hash_Link: '0123456789abcdef' }] },
        });
        assert.isTrue(ok.isValid);
    });

    suite.test('違規列出欄位路徑', () => {
        const bad = validateRootSaveData({
            Rival_Nations: [{ Coalition_State: 'ALLY' }],
            Battle_State: { Reserved_Tally_Bands: [{ id: 't1' }] },
            Officer_Promotion: { Rank_Track: 'NAVY' },
            Sortie_Loadout: { Main_General_UID: 'a', Vanguard_General_UID: 'a' },
            General_Journal: { Offline_Battle_Snapshots: [{ Sync_Hash_Link: '張遼夜襲' }] },
        });
        assert.isFalse(bad.isValid);
        assert.equals(5, bad.errors.length);
        assert.isTrue(bad.errors.some((e) => e.startsWith('Rival_Nations')));
        assert.isTrue(bad.errors.some((e) => e.includes('Vanguard_General_UID')));
    });

    return suite;
}
