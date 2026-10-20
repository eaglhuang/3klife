/**
 * ServerSchemaMvp12 — MVP 最小六表的列驗證與 CRUD（PROG-2-0854 / MVP-12）
 *
 * 驗證重點：
 *   1. 各表合法列通過；非法列（列舉、範圍、缺欄位）被回報
 *   2. 記憶體表的 CRUD：新增、主鍵重複拒絕、合併更新後再驗證、刪除
 *   3. 精力不得超過上限（對齊 SQL CHECK）
 *
 * 只測純 TS 規則，不連資料庫；SQL 檔僅定義、未部署。
 */
import { assert, TestSuite } from './TestRunner';
import {
    GeneralRow,
    MercenaryRow,
    validateGachaHistoryRow,
    validateGeneralRow,
    validateMercenaryRow,
    validatePlayerResourcesRow,
} from '../server/schema/mvp12-row-validators';
import { createMemoryTable } from '../server/schema/in-memory-table';

function general(overrides: Partial<GeneralRow> = {}): GeneralRow {
    return {
        id: 'G001',
        template_id: 'Zhao_Yun_V1',
        bloodline_id: 'BL_ZhaoYun',
        vitality: 65,
        vitality_max: 100,
        role: 'Combat',
        status: 'Active',
        ...overrides,
    };
}

function mercenary(overrides: Partial<MercenaryRow> = {}): MercenaryRow {
    return { id: 'M1', player_id: 'P1', bond_status: 'Trial', days_left: 6, upkeep_status: 'Active', ...overrides };
}

export function createServerSchemaMvp12Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaMvp12 (MVP 最小六表 MVP-12)');

    suite.test('合法列通過：武將、傭兵、資源、抽卡紀錄', () => {
        assert.equals(0, validateGeneralRow(general()).length);
        assert.equals(0, validateMercenaryRow(mercenary()).length);
        assert.equals(0, validatePlayerResourcesRow({
            player_id: 'P1', food: 0, gold: 10, troop_source: 0, fame: 0, essence: 0, bond_points: 0,
        }).length);
        assert.equals(0, validateGachaHistoryRow({ player_id: 'P1', pull_seq: 1, pool: 'Bloodline_Seed', result: 'SR' }).length);
    });

    suite.test('武將：status 列舉外的值被拒；精力超過上限被拒（對齊 SQL CHECK）', () => {
        assert.isTrue(validateGeneralRow(general({ status: 'Sleeping' })).some((e) => e.startsWith('status:')));
        assert.isTrue(validateGeneralRow(general({ vitality: 120 })).some((e) => e.includes('不得超過 vitality_max')));
    });

    suite.test('傭兵：bond_status 與 upkeep_status 只允許客端定義的狀態值', () => {
        assert.isTrue(validateMercenaryRow(mercenary({ bond_status: 'Bonded2' })).some((e) => e.startsWith('bond_status')));
        assert.isTrue(validateMercenaryRow(mercenary({ upkeep_status: 'Frozen' })).length === 0);
        assert.isTrue(validateMercenaryRow(mercenary({ upkeep_status: 'Gone' })).some((e) => e.startsWith('upkeep_status')));
    });

    suite.test('資源：任一數量為負數被拒；抽卡序號必須從 1 起算', () => {
        assert.isTrue(validatePlayerResourcesRow({
            player_id: 'P1', food: -1, gold: 0, troop_source: 0, fame: 0, essence: 0, bond_points: 0,
        }).some((e) => e.startsWith('food')));
        assert.isTrue(validateGachaHistoryRow({ player_id: 'P1', pull_seq: 0, pool: 'X', result: 'R' }).some((e) => e.startsWith('pull_seq')));
    });

    suite.test('CRUD：新增後可讀回，重複主鍵被拒，合併更新後仍通過驗證，刪除後讀不到', () => {
        const table = createMemoryTable<GeneralRow>('generals', (row) => row.id, validateGeneralRow);
        table.insert(general());
        assert.equals(65, table.get('G001')?.vitality);

        let duplicateRejected = false;
        try {
            table.insert(general());
        } catch {
            duplicateRejected = true;
        }
        assert.isTrue(duplicateRejected);

        const updated = table.update('G001', { vitality: 80 });
        assert.equals(80, updated.vitality);

        let overflowRejected = false;
        try {
            table.update('G001', { vitality: 999 });
        } catch {
            overflowRejected = true;
        }
        assert.isTrue(overflowRejected);
        assert.equals(80, table.get('G001')?.vitality);

        assert.isTrue(table.delete('G001'));
        assert.equals(undefined, table.get('G001'));
    });

    suite.test('CRUD：寫入非法列丟錯，表內不留下該列', () => {
        const table = createMemoryTable<MercenaryRow>('mercenaries', (row) => row.id, validateMercenaryRow);
        let rejected = false;
        try {
            table.insert(mercenary({ days_left: -1 }));
        } catch {
            rejected = true;
        }
        assert.isTrue(rejected);
        assert.equals(0, table.list().length);
    });

    return suite;
}
