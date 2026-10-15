/**
 * 補元散道具的存檔往返（PROG-2-0444）
 *
 * 鎖住：背包是整包存的，補元散與高級補元散經 normalizeInventory 讀回後數量不變；
 * 舊存檔沒有這兩個 key 時仍照起始庫存處理，不會壞掉。
 */
import { assert, TestSuite } from './TestRunner';
import { ITEM_PREMIUM_VITALITY_PILL, ITEM_VITALITY_PILL, itemCount, normalizeInventory, STARTER_INVENTORY } from '../assets/scripts/core/systems/PlayerInventory';

export function createSaveInventorySuite(): TestSuite {
    const suite = new TestSuite('Save.inventory (補元散存檔往返 PROG-2-0444)');

    suite.test('存檔往返：補元散與高級補元散數量保留', () => {
        const saved = JSON.parse(JSON.stringify({ [ITEM_VITALITY_PILL]: 3, [ITEM_PREMIUM_VITALITY_PILL]: 1 }));
        const loaded = normalizeInventory(saved);
        assert.equals(3, itemCount(loaded, ITEM_VITALITY_PILL));
        assert.equals(1, itemCount(loaded, ITEM_PREMIUM_VITALITY_PILL));
    });

    suite.test('舊存檔沒有道具 key：讀回仍是起始庫存', () => {
        const loaded = normalizeInventory(undefined);
        assert.equals(itemCount(STARTER_INVENTORY, 'ITEM_ORACLE'), itemCount(loaded, 'ITEM_ORACLE'));
        assert.equals(0, itemCount(loaded, ITEM_VITALITY_PILL));
    });

    return suite;
}
