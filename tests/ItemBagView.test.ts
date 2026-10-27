/**
 * ItemBagView.test.ts — 道具背包檢視模型與數量不足提示（PROG-2-1035，ITM-10）
 *
 * 鎖住：列表依 ID 排序且只含有定義名稱的道具；onlyOwned 只留持有者；
 * 數量不足回傳含商城導向的提示，足夠（含相等）回傳 null。
 */
import { assert, TestSuite } from './TestRunner';
import { buildItemBagRows, itemLackPrompt, UI_ITEM_LACK_KEY } from '../assets/scripts/core/systems/ItemBagView';
import { ITEM_ORACLE_TOKEN, ITEM_TRIAL_TICKET } from '../assets/scripts/core/systems/PlayerInventory';

export function createItemBagViewSuite(): TestSuite {
    const suite = new TestSuite('ItemBagView (道具背包 ITM-10)');

    suite.test('列表依 ID 排序，數量取自背包，未持有顯示 0', () => {
        const rows = buildItemBagRows({ [ITEM_ORACLE_TOKEN]: 3 });
        const ids = rows.map((row) => row.itemId);
        const sorted = [...ids].sort();
        assert.equals(sorted.join(','), ids.join(','));
        const oracle = rows.find((row) => row.itemId === ITEM_ORACLE_TOKEN);
        assert.equals(3, oracle?.count ?? -1);
        const ticket = rows.find((row) => row.itemId === ITEM_TRIAL_TICKET);
        assert.equals(0, ticket?.count ?? -1);
    });

    suite.test('onlyOwned 只保留持有數量大於 0 的列', () => {
        const rows = buildItemBagRows({ [ITEM_ORACLE_TOKEN]: 3 }, { onlyOwned: true });
        assert.equals(1, rows.length);
        assert.equals(ITEM_ORACLE_TOKEN, rows[0].itemId);
    });

    suite.test('數量不足時回傳含商城導向的提示；相等時不提示', () => {
        const short = itemLackPrompt({ [ITEM_ORACLE_TOKEN]: 1 }, ITEM_ORACLE_TOKEN, 2);
        assert.isTrue(short !== null);
        assert.equals(UI_ITEM_LACK_KEY, short?.key ?? '');
        assert.equals('求籤令 不足，是否前往商城？', short?.text ?? '');
        assert.isTrue(itemLackPrompt({ [ITEM_ORACLE_TOKEN]: 2 }, ITEM_ORACLE_TOKEN, 2) === null);
    });

    return suite;
}
