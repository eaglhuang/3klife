/**
 * TreasureCodex.test.ts — 寶物圖鑑（BAG-08，PROG-2-1391）
 *
 * 鎖住：寶物分類才進圖鑑；曾取得（取得紀錄或目前持有）即亮；累計次數只算紀錄內；
 * 圖鑑摘要只在寶物分類頁顯示，並接上道具背包畫面。
 * Unity 對照：像成就圖鑑，從取得 Log 與背包判斷亮燈，圖鑑頁本身不存任何狀態。
 */
import { assert, TestSuite } from './TestRunner';
import { buildTreasureCodex } from '../assets/scripts/core/systems/TreasureCodex';
import { ITEM_TREASURE, ITEM_REFRESH, PlayerInventory } from '../assets/scripts/core/systems/PlayerInventory';
import type { ItemAcquisitionRecord } from '../assets/scripts/core/systems/ItemAcquisitionLog';
import { ItemBagController } from '../assets/scripts/ui/core/ItemBagController';

const LOG: ItemAcquisitionRecord[] = [
    { itemId: ITEM_TREASURE, amount: 1, source: 'DROP' },
    { itemId: ITEM_TREASURE, amount: 2, source: 'TASK' },
    { itemId: ITEM_REFRESH, amount: 5, source: 'SHOP' },
];

export function createTreasureCodexSuite(): TestSuite {
    const suite = new TestSuite('TreasureCodex (寶物圖鑑 BAG-08)');

    suite.test('只列寶物分類的道具，非寶物道具不進圖鑑', () => {
        const view = buildTreasureCodex([], {});
        assert.equals(1, view.totalCount);
        assert.equals(ITEM_TREASURE, view.entries[0].itemId);
    });

    suite.test('取得紀錄累計次數，且只算寶物', () => {
        const view = buildTreasureCodex(LOG, {});
        assert.equals(3, view.entries[0].totalAcquired);
        assert.isTrue(view.entries[0].obtained);
        assert.equals(1, view.obtainedCount);
        assert.isTrue(view.complete);
        assert.equals('寶物圖鑑 1/1', view.summaryLine);
    });

    suite.test('沒有紀錄但目前持有（舊檔）也算已取得', () => {
        const inventory: PlayerInventory = { [ITEM_TREASURE]: 1 };
        const view = buildTreasureCodex([], inventory);
        assert.isTrue(view.entries[0].obtained);
        assert.equals(0, view.entries[0].totalAcquired);
        assert.equals(1, view.entries[0].owned);
    });

    suite.test('完全沒取得過時圖鑑為未填滿', () => {
        const view = buildTreasureCodex([{ itemId: ITEM_REFRESH, amount: 1, source: 'SHOP' }], {});
        assert.isFalse(view.entries[0].obtained);
        assert.isFalse(view.complete);
        assert.equals('寶物圖鑑 0/1', view.summaryLine);
    });

    suite.test('道具背包只在寶物分類頁顯示圖鑑摘要，其他分類不顯示', () => {
        const controller = new ItemBagController({
            inventory: () => ({}),
            acquisitionLog: () => LOG,
            useItem: () => ({ ok: true, inventory: {} }),
            now: () => 0,
        });
        assert.equals('', controller.getFlowView().texts.bagMessage);
        controller.setCategory('寶物');
        assert.equals('寶物圖鑑 1/1', controller.getFlowView().texts.bagMessage);
        controller.setCategory('消耗品');
        assert.equals('', controller.getFlowView().texts.bagMessage);
    });

    return suite;
}
