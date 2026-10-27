/**
 * SpiritSlotState.test.ts — 命槽狀態從統一物件庫推導（GDUI-05 數據來源，PROG-2-1276）headless 測試
 */
import { assert, TestSuite } from './TestRunner';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import {
    SPIRIT_SLOT_ID,
    isGeneralBattleLocked,
    spiritSlotViewOf,
} from '../assets/scripts/core/systems/SpiritSlotState';

function spiritCard(id: string, overrides: Partial<InventoryRecord> = {}): InventoryRecord {
    return {
        Inventory_ID: id,
        Item_Type: 'SPIRIT_CARD',
        Slot_Type: 'SPIRIT',
        Bound_General_UID: null,
        Quantity: 1,
        Quality: 'N',
        Source_Type: 'TEST',
        Display_Bucket: 'SPIRIT',
        Is_Displayed: true,
        Attributes: {},
        equippedBy: null,
        slotId: null,
        ...overrides,
    };
}

export function createSpiritSlotStateSuite(): TestSuite {
    const suite = new TestSuite('SpiritSlotState (命槽狀態推導 GDUI-05 PROG-2-1276)');

    suite.test('命槽沒有英靈卡時為未裝配，且不是主卡', () => {
        const view = spiritSlotViewOf([], 'G-1', false);
        assert.isFalse(view.state.occupied);
        assert.isFalse(view.state.isMain);
        assert.equals(null, view.card);
    });

    suite.test('equippedBy 與 slotId 都對上才算裝配在該武將命槽', () => {
        const card = spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID });
        const view = spiritSlotViewOf([card], 'G-1', false);
        assert.isTrue(view.state.occupied);
        assert.equals('S-1', view.card?.Inventory_ID);
    });

    suite.test('別的武將或別的槽位上的英靈卡不算', () => {
        const otherGeneral = spiritCard('S-1', { equippedBy: 'G-2', slotId: SPIRIT_SLOT_ID });
        const otherSlot = spiritCard('S-2', { equippedBy: 'G-1', slotId: 'WEAPON' });
        const view = spiritSlotViewOf([otherGeneral, otherSlot], 'G-1', false);
        assert.isFalse(view.state.occupied);
    });

    suite.test('非英靈卡列即使 equippedBy 與 slotId 相同也不算', () => {
        const gear = spiritCard('O-1', { Item_Type: 'OTHER', equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID });
        const view = spiritSlotViewOf([gear], 'G-1', false);
        assert.isFalse(view.state.occupied);
    });

    suite.test('isPrimary 為 true 才是主卡；缺欄位視為非主卡', () => {
        const primary = spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID, isPrimary: true });
        const plain = spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID });
        assert.isTrue(spiritSlotViewOf([primary], 'G-1', false).state.isMain);
        assert.isFalse(spiritSlotViewOf([plain], 'G-1', false).state.isMain);
    });

    suite.test('戰鬥鎖定由呼叫端傳入並原樣放進狀態', () => {
        assert.isTrue(spiritSlotViewOf([], 'G-1', true).state.battleLocked);
        assert.isFalse(spiritSlotViewOf([], 'G-1', false).state.battleLocked);
    });

    suite.test('同一命槽出現多張（資料異常）時取第一張，不憑空修正', () => {
        const first = spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID });
        const second = spiritCard('S-2', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID });
        assert.equals('S-1', spiritSlotViewOf([first, second], 'G-1', false).card?.Inventory_ID);
    });

    suite.test('只有戰鬥進行中且在出戰名冊上的武將才被鎖定', () => {
        assert.isTrue(isGeneralBattleLocked(true, ['G-1', 'G-2'], 'G-1'));
        assert.isFalse(isGeneralBattleLocked(true, ['G-2'], 'G-1'));
        assert.isFalse(isGeneralBattleLocked(false, ['G-1'], 'G-1'));
    });

    return suite;
}
