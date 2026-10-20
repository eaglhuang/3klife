/**
 * ServerSchemaFem10 — 女性來源 source_log 的列驗證與 UI 來源字串（PROG-2-0542 / FEM-10）
 *
 * 驗證重點：
 *   1. 合法紀錄通過
 *   2. 來源、品質列舉、消耗數量、時間字串、ID 長度會被擋
 *   3. UI 來源字串與可結緣女性來源系統.md §H 一致
 */
import { assert, TestSuite } from './TestRunner';
import { FemaleSourceLogRow, validateFemaleSourceLogRow } from '../server/schema/fem10-row-validators';
import { FEMALE_SOURCE_LABEL } from '../assets/scripts/core/systems/FemaleSourcePresenter';

function record(overrides: Partial<FemaleSourceLogRow> = {}): FemaleSourceLogRow {
    return {
        source_log_id: 'SRC_0001',
        player_id: 'P001',
        general_uid: 'G301',
        source_type: 'GACHA',
        quality: 'SSR',
        acquired_at: '2026-10-20T12:00:00Z',
        cost_item: 'ITEM_GACHA_TICKET',
        cost_amount: 1,
        ...overrides,
    };
}

export function createServerSchemaFem10Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaFem10 (女性來源 source_log FEM-10)');

    suite.test('合法紀錄通過列驗證', () => {
        assert.equals(0, validateFemaleSourceLogRow(record()).length);
    });

    suite.test('來源與品質必須在規格列舉內', () => {
        assert.isTrue(validateFemaleSourceLogRow(record({ source_type: 'SHOP' })).length > 0);
        assert.isTrue(validateFemaleSourceLogRow(record({ quality: 'UR' })).length > 0);
    });

    suite.test('消耗數量必須是非負整數；時間必須可解析；ID 不可空且不超過 32 字元', () => {
        assert.isTrue(validateFemaleSourceLogRow(record({ cost_amount: -1 })).length > 0);
        assert.isTrue(validateFemaleSourceLogRow(record({ cost_amount: 1.5 })).length > 0);
        assert.isTrue(validateFemaleSourceLogRow(record({ acquired_at: '不是時間' })).length > 0);
        assert.isTrue(validateFemaleSourceLogRow(record({ source_log_id: '' })).length > 0);
        assert.isTrue(validateFemaleSourceLogRow(record({ player_id: 'P'.repeat(33) })).length > 0);
    });

    suite.test('UI 來源字串與規格 §H 一致', () => {
        assert.equals('天命召喚', FEMALE_SOURCE_LABEL.GACHA);
        assert.equals('傭兵結義', FEMALE_SOURCE_LABEL.MERCENARY);
        assert.equals('戰俘招降', FEMALE_SOURCE_LABEL.CAPTIVE);
        assert.equals('民間尋訪', FEMALE_SOURCE_LABEL.DUNGEON);
        assert.equals('血脈傳承', FEMALE_SOURCE_LABEL.OFFSPRING);
    });

    return suite;
}
