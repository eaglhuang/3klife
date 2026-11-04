/**
 * WarehouseSort.test.ts — 倉庫物品排序與清單文字 headless 測試（倉庫系統 §E-6，PROG-2-1721）
 *
 * Unity 對照：EditMode Test 直接驗證比較器結果，不開面板。
 */
import { assert, TestSuite } from './TestRunner';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import { gearDefinitionOf } from '../assets/scripts/core/systems/GearDefinitions';
import {
    nextWarehouseSortKey,
    sortWarehouseRecords,
    warehouseRecordLine,
} from '../assets/scripts/core/systems/WarehouseSort';
import { WarehousePanelController, WAREHOUSE_LIST_MAX_LINES } from '../assets/scripts/ui/core/WarehousePanelController';

function record(id: string, type: InventoryRecord['Item_Type'], quality: string, extra: Partial<InventoryRecord> = {}): InventoryRecord {
    return {
        Inventory_ID: id,
        Item_Type: type,
        Slot_Type: type,
        Bound_General_UID: null,
        Quantity: 1,
        Quality: quality,
        Source_Type: 'TEST',
        Display_Bucket: type,
        Is_Displayed: false,
        Attributes: {},
        ...extra,
    };
}

const SAMPLE: InventoryRecord[] = [
    record('a', 'OTHER', 'R'),
    record('b', 'TALLY', 'SSR'),
    record('c', 'SPIRIT_CARD', 'UR'),
    record('d', 'OTHER', 'SSR'),
    record('e', 'TALLY', '???'),
];

const ids = (records: readonly InventoryRecord[]) => records.map((r) => r.Inventory_ID).join('');

export function createWarehouseSortSuite(): TestSuite {
    const suite = new TestSuite('WarehouseSort (倉庫系統 §E-6 物品排序)');

    suite.test('品質排序：UR > SSR > SR > R，同品質保持原順序，不認得的排最後', () => {
        assert.equals('cbdae', ids(sortWarehouseRecords(SAMPLE, 'quality')));
    });

    suite.test('類型排序：虎符 → 英靈卡 → 裝備，同類型保持原順序', () => {
        assert.equals('becad', ids(sortWarehouseRecords(SAMPLE, 'type')));
    });

    suite.test('取得時間排序：後入庫的排前面；原陣列不被修改', () => {
        assert.equals('edcba', ids(sortWarehouseRecords(SAMPLE, 'acquired')));
        assert.equals('abcde', ids(SAMPLE));
    });

    suite.test('取得時間排序：虎符依取得季由新到舊，不看列順序；沒有取得季的列排後面（PROG-2-1735）', () => {
        const season = (n: number) => ({ Attributes: { Acquired_Season: n } });
        const rows = [
            record('g', 'OTHER', 'R'),
            record('t', 'TALLY', 'SR', season(3)),
            record('u', 'TALLY', 'SR', season(7)),
            record('v', 'TALLY', 'SR', season(3)),
            record('h', 'SPIRIT_CARD', 'UR'),
        ];
        assert.equals('uvthg', ids(sortWarehouseRecords(rows, 'acquired')));
    });

    suite.test('排序按鈕循環：品質 → 類型 → 取得時間 → 品質', () => {
        assert.equals('type', nextWarehouseSortKey('quality'));
        assert.equals('acquired', nextWarehouseSortKey('type'));
        assert.equals('quality', nextWarehouseSortKey('acquired'));
    });

    suite.test('清單一行：裝備用定義名稱，其他用類型名稱；數量與鎖定加註', () => {
        const gearName = gearDefinitionOf('GEAR_WEAPON_PLACEHOLDER')?.name ?? '';
        assert.isTrue(gearName.length > 0);
        assert.equals(`[R] ${gearName}`, warehouseRecordLine(record('g', 'OTHER', 'R', { Gear_ID: 'GEAR_WEAPON_PLACEHOLDER' })));
        assert.equals('[SSR] 虎符 ×3（已鎖定）', warehouseRecordLine(record('t', 'TALLY', 'SSR', { Quantity: 3, isLocked: true })));
    });

    suite.test('面板：依目前排序列出物品，切換排序後清單與按鈕文字跟著變', () => {
        const panel = new WarehousePanelController({
            usedSlots: () => SAMPLE.length,
            expansions: () => 0,
            expand: () => true,
            storedRecords: () => SAMPLE,
        });
        let view = panel.getFlowView();
        assert.equals('排序：品質', view.texts.btnWarehouseSortLabel);
        assert.isTrue(view.texts.warehouseList.startsWith('[UR] 英靈卡'));
        panel.cycleSort();
        view = panel.getFlowView();
        assert.equals('排序：類型', view.texts.btnWarehouseSortLabel);
        assert.isTrue(view.texts.warehouseList.startsWith('[SSR] 虎符'));
        assert.isTrue(view.enabled.btnWarehouseSort);
    });

    suite.test('面板：空倉顯示提示；超過上限的件數以「另有 N 件」帶過', () => {
        const empty = new WarehousePanelController({ usedSlots: () => 0, expansions: () => 0, expand: () => true });
        assert.equals('倉庫目前沒有物品', empty.listText());
        const many = Array.from({ length: WAREHOUSE_LIST_MAX_LINES + 3 }, (_, i) => record(`m${i}`, 'TALLY', 'R'));
        const full = new WarehousePanelController({ usedSlots: () => many.length, expansions: () => 0, expand: () => true, storedRecords: () => many });
        const lines = full.listText().split('\n');
        assert.equals(WAREHOUSE_LIST_MAX_LINES + 1, lines.length);
        assert.equals('…另有 3 件', lines[lines.length - 1]);
    });

    return suite;
}
