/**
 * ItemCategoryFilter.test.ts — 道具分類篩選（PROG-2-1377，ITM-02）
 *
 * 鎖住：每列帶 ItemDef 的分類；依分類篩選只留該類；null 為全部；
 * 背包畫面切換分類會回到第一頁並取消選取。
 *
 * Unity 對照：像 Inventory 的 Tab 篩選，點「材料」分頁只換一個 Predicate，資料本身不動。
 */
import { assert, TestSuite } from './TestRunner';
import { buildItemBagRows } from '../assets/scripts/core/systems/ItemBagView';
import { ITEM_DEFS, itemDefOf } from '../assets/scripts/core/systems/ItemDef';
import { ITEM_BATTLE_NOTE, ITEM_JOB_CHANGE_ORDER, ITEM_ORACLE_TOKEN, PlayerInventory } from '../assets/scripts/core/systems/PlayerInventory';
import { BAG_ROW_SLOTS, ItemBagController } from '../assets/scripts/ui/core/ItemBagController';

function controllerWith(inventory: PlayerInventory): ItemBagController {
    return new ItemBagController({
        inventory: () => inventory,
        useItem: () => ({ ok: true, inventory: {} }),
        now: () => 0,
    });
}

export function createItemCategoryFilterSuite(): TestSuite {
    const suite = new TestSuite('ItemCategoryFilter (道具分類篩選 ITM-02)');

    const sample: PlayerInventory = { [ITEM_ORACLE_TOKEN]: 2, [ITEM_BATTLE_NOTE]: 1, [ITEM_JOB_CHANGE_ORDER]: 1 };

    suite.test('每列帶上資料表的分類', () => {
        for (const row of buildItemBagRows(sample)) {
            assert.equals(itemDefOf(row.itemId)!.category, row.category);
        }
    });

    suite.test('依分類篩選只留該分類的列', () => {
        const rows = buildItemBagRows(sample, { onlyOwned: true, category: '材料' });
        assert.equals(ITEM_BATTLE_NOTE, rows.map((row) => row.itemId).join(','));
    });

    suite.test('分類為 null 或未給時列出全部分類', () => {
        assert.equals(ITEM_DEFS.length, buildItemBagRows({}, { category: null }).length);
        assert.equals(ITEM_DEFS.length, buildItemBagRows({}).length);
    });

    suite.test('篩選與持有條件可並用：只持有的特殊道具', () => {
        const rows = buildItemBagRows(sample, { onlyOwned: true, category: '特殊道具' });
        assert.equals(ITEM_JOB_CHANGE_ORDER, rows.map((row) => row.itemId).join(','));
    });

    suite.test('背包畫面切換分類：只列該分類，取消選取，回到第一頁', () => {
        const controller = controllerWith(sample);
        controller.select(0);
        controller.setCategory('消耗品');
        assert.equals('消耗品', controller.category!);
        assert.equals(ITEM_ORACLE_TOKEN, controller.rows().map((row) => row.itemId).join(','));
        assert.equals(0, controller.page);
        assert.equals('未選擇道具', controller.getFlowView().texts.bagDetailName);
    });

    suite.test('消耗品篩選後列數不超過一頁，清回 null 恢復全部', () => {
        const all: Record<string, number> = {};
        for (const def of ITEM_DEFS) all[def.id] = 1;
        const controller = controllerWith(all);
        controller.setCategory('消耗品');
        assert.isTrue(controller.allRows().length <= BAG_ROW_SLOTS);
        controller.setCategory(null);
        assert.equals(ITEM_DEFS.length, controller.allRows().length);
    });

    return suite;
}
