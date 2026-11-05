// @spec-source → 武將背包（倉庫）系統.md §鎖定保護；PROG-2-1854
import { TestSuite, assert } from './TestRunner';
import { WarehousePanelController, WAREHOUSE_SELECTED_MARK, WAREHOUSE_LIST_MAX_LINES } from '../assets/scripts/ui/core/WarehousePanelController';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

function rec(id: string, quality: string, extra: Partial<InventoryRecord> = {}): InventoryRecord {
    return {
        Inventory_ID: id, Item_Type: 'TIGER_TALLY', Slot_Type: '', Bound_General_UID: null, Quantity: 1, Quality: quality,
        Source_Type: 'GACHA', Display_Bucket: '', Is_Displayed: true, Attributes: {}, ...extra,
    } as unknown as InventoryRecord;
}

function setup(records: InventoryRecord[]) {
    let rows = records;
    const calls: string[] = [];
    const controller = new WarehousePanelController({
        usedSlots: () => rows.length,
        expansions: () => 0,
        expand: () => true,
        storedRecords: () => rows,
        setLocked: (id, locked) => {
            calls.push(`${id}:${locked}`);
            const found = rows.some((r) => r.Inventory_ID === id);
            rows = rows.map((r) => (r.Inventory_ID === id ? { ...r, isLocked: locked } : r));
            return found;
        },
    });
    return { controller, calls };
}

export function createWarehouseLockSelectSuite(): TestSuite {
    const suite = new TestSuite('WarehouseLockSelect');

    suite.test('預設選第一件並在列尾加標記；下一件／上一件頭尾循環', () => {
        const { controller } = setup([rec('a', 'SSR'), rec('b', 'SR'), rec('c', 'R')]);
        assert.isTrue(controller.listText().split('\n')[0].endsWith(WAREHOUSE_SELECTED_MARK));
        assert.equals('b', controller.moveSelection(1)?.Inventory_ID ?? '');
        assert.isTrue(controller.listText().split('\n')[1].endsWith(WAREHOUSE_SELECTED_MARK));
        assert.equals('a', controller.moveSelection(-1)?.Inventory_ID ?? '');
        assert.equals('c', controller.moveSelection(-1)?.Inventory_ID ?? '');
    });

    suite.test('鎖定選取的那一件：寫入 setLocked、提示列與按鈕文字跟著變；再按解鎖', () => {
        const { controller, calls } = setup([rec('a', 'SSR'), rec('b', 'SR')]);
        controller.moveSelection(1);
        assert.isTrue(controller.toggleLockSelected());
        assert.equals('b:true', calls.join(','));
        let view = controller.getFlowView();
        assert.isTrue(view.texts.warehouseNotice.startsWith('已鎖定 [SR]'));
        assert.equals('解鎖', view.texts.btnWarehouseLockLabel);
        assert.isTrue(view.texts.warehouseList.includes('（已鎖定）'));
        assert.isTrue(controller.toggleLockSelected());
        view = controller.getFlowView();
        assert.isTrue(view.texts.warehouseNotice.startsWith('已解鎖 [SR]'));
        assert.equals('鎖定', view.texts.btnWarehouseLockLabel);
    });

    suite.test('換排序保留選取的那一件', () => {
        const { controller } = setup([rec('a', 'SSR', { Item_Type: 'GEAR' } as unknown as Partial<InventoryRecord>), rec('b', 'SR')]);
        controller.moveSelection(1);
        const id = controller.selectedRecord()?.Inventory_ID;
        controller.cycleSort();
        assert.equals(id ?? '', controller.selectedRecord()?.Inventory_ID ?? '');
    });

    suite.test('選到第二頁時清單翻頁，前後以件數帶過', () => {
        const rows = Array.from({ length: WAREHOUSE_LIST_MAX_LINES + 3 }, (_, i) => rec(`r${i}`, 'R'));
        const { controller } = setup(rows);
        for (let i = 0; i < WAREHOUSE_LIST_MAX_LINES; i++) controller.moveSelection(1);
        const lines = controller.listText().split('\n');
        assert.equals(`…前有 ${WAREHOUSE_LIST_MAX_LINES} 件`, lines[0]);
        assert.isTrue(lines[1].endsWith(WAREHOUSE_SELECTED_MARK));
        assert.lengthEquals(4, lines);
    });

    suite.test('空倉或沒給 setLocked 時鎖定鈕停用；只有一件時上一件／下一件停用', () => {
        const empty = new WarehousePanelController({ usedSlots: () => 0, expansions: () => 0, expand: () => true });
        assert.isFalse(empty.getFlowView().enabled.btnWarehouseLock);
        assert.isFalse(empty.toggleLockSelected());
        const { controller } = setup([rec('a', 'SSR')]);
        const view = controller.getFlowView();
        assert.isTrue(view.enabled.btnWarehouseLock);
        assert.isFalse(view.enabled.btnWarehouseNext);
    });

    return suite;
}
