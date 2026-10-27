/**
 * SpiritSlotFlow.test.ts — 命槽卸下與設為主卡的純邏輯（GDUI-05，PROG-2-1280）headless 測試
 */
import { assert, TestSuite } from './TestRunner';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import { setPrimarySpiritCard, unequipSpiritCard } from '../assets/scripts/core/systems/SpiritSlotFlow';
import { SPIRIT_SLOT_ID } from '../assets/scripts/core/systems/SpiritSlotState';

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

export function createSpiritSlotFlowSuite(): TestSuite {
    const suite = new TestSuite('SpiritSlotFlow (命槽卸下與設主卡 GDUI-05 PROG-2-1280)');

    suite.test('卸下命槽英靈卡：列保留，裝配與主卡欄位清空', () => {
        const records = [spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID, isPrimary: true })];
        const result = unequipSpiritCard(records, 'G-1', false);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(1, result.records.length);
        assert.equals(null, result.records[0].equippedBy);
        assert.equals(null, result.records[0].slotId);
        assert.equals(null, result.records[0].isPrimary);
    });

    suite.test('命槽沒有英靈卡時卸下回 NOT_FOUND', () => {
        const result = unequipSpiritCard([], 'G-1', false);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('NOT_FOUND', result.reason);
    });

    suite.test('戰鬥鎖定時卸下與設主卡都回 BATTLE_LOCKED，records 不變', () => {
        const records = [spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID })];
        const unequip = unequipSpiritCard(records, 'G-1', true);
        const primary = setPrimarySpiritCard(records, 'G-1', true);
        assert.isFalse(unequip.ok);
        assert.isFalse(primary.ok);
        if (!unequip.ok) assert.equals('BATTLE_LOCKED', unequip.reason);
        if (!primary.ok) assert.equals('BATTLE_LOCKED', primary.reason);
        assert.equals(SPIRIT_SLOT_ID, records[0].slotId);
    });

    suite.test('設為主卡：該卡 isPrimary 為 true', () => {
        const records = [spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID })];
        const result = setPrimarySpiritCard(records, 'G-1', false);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.isTrue(result.records[0].isPrimary === true);
    });

    suite.test('已是主卡再設一次回 ALREADY_PRIMARY', () => {
        const records = [spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID, isPrimary: true })];
        const result = setPrimarySpiritCard(records, 'G-1', false);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('ALREADY_PRIMARY', result.reason);
    });

    suite.test('設主卡不影響其他武將的英靈卡', () => {
        const records = [
            spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID }),
            spiritCard('S-2', { equippedBy: 'G-2', slotId: SPIRIT_SLOT_ID, isPrimary: true }),
        ];
        const result = setPrimarySpiritCard(records, 'G-1', false);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.isTrue(result.records[1].isPrimary === true);
    });

    return suite;
}
