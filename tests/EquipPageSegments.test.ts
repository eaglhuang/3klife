/**
 * EquipPageSegments.test.ts — 寶頁三段資料（TSK-07，PROG-2-1393）
 *
 * 鎖住：三段都組得出來；道具摘要取 ITEM_DEFS 順序第一件持有的非寶物道具；
 * 沒有持有時為 null；傳家寶段沿用 HeirloomCardView 的結果；一般裝備段原樣傳入。
 * Unity 對照：Presenter 的 ViewModel 組裝，三個來源各取一份，不改原始資料。
 */
import { assert, TestSuite } from './TestRunner';
import { buildEquipPageSegments, pickSummaryItemId } from '../assets/scripts/core/systems/EquipPageSegments';
import { ITEM_ORACLE_TOKEN, ITEM_TREASURE, ITEM_REFRESH, PlayerInventory } from '../assets/scripts/core/systems/PlayerInventory';
import type { GearSlotView } from '../assets/scripts/core/systems/GearPageSlots';

const GEAR: GearSlotView[] = [];

export function createEquipPageSegmentsSuite(): TestSuite {
    const suite = new TestSuite('EquipPageSegments (寶頁三段資料 TSK-07)');

    suite.test('沒有任何道具時：道具段為 null，傳家寶段為未持有', () => {
        const segments = buildEquipPageSegments(GEAR, {});
        assert.isTrue(segments.items === null);
        assert.equals('NONE', segments.heirloom.state);
    });

    suite.test('只有寶物時：道具段為 null（寶物走傳家寶段），傳家寶段為已持有', () => {
        const inventory: PlayerInventory = { [ITEM_TREASURE]: 2 };
        assert.isTrue(pickSummaryItemId(inventory) === null);
        const segments = buildEquipPageSegments(GEAR, inventory);
        assert.isTrue(segments.items === null);
        assert.equals('OWNED', segments.heirloom.state);
    });

    suite.test('道具摘要取 ITEM_DEFS 順序第一件持有的非寶物道具', () => {
        const inventory: PlayerInventory = { [ITEM_REFRESH]: 2, [ITEM_ORACLE_TOKEN]: 1 };
        assert.equals(ITEM_ORACLE_TOKEN, pickSummaryItemId(inventory) ?? '');
        const segments = buildEquipPageSegments(GEAR, inventory);
        assert.equals(ITEM_ORACLE_TOKEN, segments.items?.itemId ?? '');
        assert.equals('×1', segments.items?.countLine ?? '');
    });

    suite.test('一般裝備段原樣傳入，不複製也不改寫', () => {
        const segments = buildEquipPageSegments(GEAR, {});
        assert.isTrue(segments.gear === GEAR);
    });

    return suite;
}
