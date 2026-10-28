/**
 * HeirloomCardView.test.ts — 寶頁傳家寶卡與道具摘要卡的顯示資料（TSK-04，PROG-2-1389）
 *
 * 鎖住：有傳家寶時卡片為 OWNED 並顯示數量；沒有時為 NONE；
 * 道具摘要對定義表內外的道具分別回 KNOWN／UNKNOWN，未知道具不默默吞掉。
 * Unity 對照：像 Prefab 的 Binding 測試，給定資料，檢查卡片上的文字是否正確。
 */
import { assert, TestSuite } from './TestRunner';
import { buildHeirloomCardView, buildItemSummaryView } from '../assets/scripts/core/systems/HeirloomCardView';
import { ITEM_TREASURE } from '../assets/scripts/core/systems/PlayerInventory';

export function createHeirloomCardViewSuite(): TestSuite {
    const suite = new TestSuite('HeirloomCardView (寶頁傳家寶卡 TSK-04)');

    suite.test('倉庫有傳家寶：卡片為 OWNED，顯示數量', () => {
        const card = buildHeirloomCardView({ [ITEM_TREASURE]: 2 });
        assert.equals('OWNED', card.state);
        assert.equals(2, card.count);
        assert.equals('倉庫 ×2', card.countLine);
        assert.equals('傳家寶物', card.title);
    });

    suite.test('沒有傳家寶：卡片為 NONE，顯示尚未取得', () => {
        const card = buildHeirloomCardView({});
        assert.equals('NONE', card.state);
        assert.equals(0, card.count);
        assert.equals('尚未取得', card.countLine);
    });

    suite.test('道具摘要：定義表內的道具回 KNOWN，帶出名稱、分類與稀有度', () => {
        const summary = buildItemSummaryView(ITEM_TREASURE, 1);
        assert.equals('KNOWN', summary.state);
        assert.equals('傳家寶物', summary.name);
        assert.equals('寶物', summary.category);
        assert.equals('稀有度 1', summary.rarityLabel);
        assert.equals('×1', summary.countLine);
    });

    suite.test('道具摘要：定義表外的道具回 UNKNOWN，名稱退回為 ID', () => {
        const summary = buildItemSummaryView('ITEM_NOT_EXIST', 3);
        assert.equals('UNKNOWN', summary.state);
        assert.equals('ITEM_NOT_EXIST', summary.name);
        assert.equals('未知', summary.category);
    });

    return suite;
}
