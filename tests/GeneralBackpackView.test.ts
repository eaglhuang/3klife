/**
 * GeneralBackpackView.test.ts — 由統一物件庫推導武將一般裝備背包（PROG-2-1036）
 *
 * 鎖住：只篩該武將的一般裝備；舊檔缺欄位即未裝備；非 OTHER 列不算；
 * 同格重複時保留先出現的一件；進階欄有裝備時視為解鎖。
 */
import { assert, TestSuite } from './TestRunner';
import { deriveGeneralBackpack } from '../assets/scripts/core/systems/GeneralBackpackView';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

function gear(id: string, overrides: Partial<InventoryRecord> = {}): InventoryRecord {
    return {
        Inventory_ID: id,
        Item_Type: 'OTHER',
        Slot_Type: 'GEAR',
        Bound_General_UID: null,
        Quantity: 1,
        Quality: 'NORMAL',
        Source_Type: 'SHOP',
        Display_Bucket: 'GENERAL_BAG',
        Is_Displayed: true,
        Attributes: {},
        ...overrides,
    };
}

export function createGeneralBackpackViewSuite(): TestSuite {
    const suite = new TestSuite('GeneralBackpackView (武將裝備背包推導 PROG-2-1036)');

    suite.test('舊檔缺 equippedBy／slotId 的裝備皆為未裝備，背包為空', () => {
        const backpack = deriveGeneralBackpack([gear('eq-1')], 'G501');
        assert.equals(0, Object.keys(backpack.equipped).length);
        assert.equals(3, backpack.unlocked.length);
    });

    suite.test('只篩出指定武將的裝備，uid 取 Inventory_ID', () => {
        const records = [
            gear('eq-1', { equippedBy: 'G501', slotId: 'WEAPON' }),
            gear('eq-2', { equippedBy: 'G188', slotId: 'ARMOR' }),
        ];
        const backpack = deriveGeneralBackpack(records, 'G501');
        assert.equals('eq-1', backpack.equipped.WEAPON ?? '');
        assert.isTrue(backpack.equipped.ARMOR === undefined);
    });

    suite.test('非 OTHER 列（虎符、英靈卡）即使標了武將也不算一般裝備', () => {
        const records = [gear('tally-1', { Item_Type: 'TALLY', equippedBy: 'G501', slotId: 'WEAPON' })];
        assert.equals(0, Object.keys(deriveGeneralBackpack(records, 'G501').equipped).length);
    });

    suite.test('同格重複時保留先出現的一件；不認得的 slotId 忽略', () => {
        const records = [
            gear('eq-1', { equippedBy: 'G501', slotId: 'WEAPON' }),
            gear('eq-2', { equippedBy: 'G501', slotId: 'WEAPON' }),
            gear('eq-3', { equippedBy: 'G501', slotId: 'ARMOR' }),
            gear('eq-4', { equippedBy: 'G501', slotId: 'HEAD' }),
        ];
        const backpack = deriveGeneralBackpack(records, 'G501');
        assert.equals('eq-1', backpack.equipped.WEAPON ?? '');
        assert.equals('eq-3', backpack.equipped.ARMOR ?? '');
        assert.equals(2, Object.keys(backpack.equipped).length);
    });

    suite.test('進階欄有裝備時視為解鎖；不改動輸入列', () => {
        const records = [gear('eq-9', { equippedBy: 'G501', slotId: 'MOUNT' })];
        const before = JSON.stringify(records);
        const backpack = deriveGeneralBackpack(records, 'G501');
        assert.isTrue(backpack.unlocked.includes('MOUNT'));
        assert.equals(before, JSON.stringify(records));
    });

    return suite;
}
