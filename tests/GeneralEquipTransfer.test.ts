import { assert, TestSuite } from './TestRunner';
import { createBackpack, unlockBackpackSlot } from '../assets/scripts/core/systems/GeneralBackpack';
import {
    countItemCopies,
    equipFromWarehouse,
    unequipToWarehouse,
    Warehouse,
} from '../assets/scripts/core/systems/GeneralEquipTransfer';

const NONE = new Set<string>();
const WH: Warehouse = { items: [{ uid: 'w1', kind: 'WEAPON' }, { uid: 'h1', kind: 'MOUNT' }] };

export function createGeneralEquipTransferSuite(): TestSuite {
    const suite = new TestSuite('GeneralEquipTransfer (BAG-03 倉庫↔武將裝備移動)');

    suite.test('裝備：倉庫移除、武將欄位放入，兩端一致', () => {
        const result = equipFromWarehouse(WH, createBackpack(), 'w1', 'WEAPON', NONE);
        assert.isTrue(result.ok);
        assert.equals(1, result.warehouse.items.length);
        assert.equals('w1', result.backpack.equipped.WEAPON!);
        assert.equals(1, countItemCopies('w1', result.warehouse, [result.backpack]));
    });

    suite.test('裝備：上鎖的裝備不能移動（locked）', () => {
        const result = equipFromWarehouse(WH, createBackpack(), 'w1', 'WEAPON', new Set(['w1']));
        assert.isFalse(result.ok);
        assert.equals('locked', result.reason!);
        assert.equals(2, result.warehouse.items.length);
    });

    suite.test('裝備：倉庫沒有此裝備時失敗，兩端不變', () => {
        const result = equipFromWarehouse(WH, createBackpack(), 'missing', 'WEAPON', NONE);
        assert.isFalse(result.ok);
        assert.equals('not-found', result.reason!);
        assert.equals(2, result.warehouse.items.length);
    });

    suite.test('裝備：武將欄位失敗（未解鎖、錯類型）時整體不變，倉庫保留裝備', () => {
        const locked = equipFromWarehouse(WH, createBackpack(), 'h1', 'MOUNT', NONE);
        assert.isFalse(locked.ok);
        assert.equals('slot-locked', locked.reason!);
        assert.equals(2, locked.warehouse.items.length);
        const wrong = equipFromWarehouse(WH, createBackpack(), 'w1', 'ARMOR', NONE);
        assert.equals('wrong-type', wrong.reason!);
        assert.equals(2, wrong.warehouse.items.length);
    });

    suite.test('卸下：武將欄位清空，裝備回到倉庫，兩端一致', () => {
        const equipped = equipFromWarehouse(WH, createBackpack(), 'w1', 'WEAPON', NONE);
        const unequipped = unequipToWarehouse(equipped.warehouse, equipped.backpack, 'WEAPON', 0, NONE);
        assert.isTrue(unequipped.ok);
        assert.equals(undefined, unequipped.backpack.equipped.WEAPON);
        assert.equals(1, countItemCopies('w1', unequipped.warehouse, [unequipped.backpack]));
    });

    suite.test('卸下：空欄位失敗；上鎖的裝備不能卸下', () => {
        assert.equals('empty-slot', unequipToWarehouse(WH, createBackpack(), 'WEAPON', 0, NONE).reason!);
        const equipped = equipFromWarehouse(WH, createBackpack(), 'w1', 'WEAPON', NONE);
        const blocked = unequipToWarehouse(equipped.warehouse, equipped.backpack, 'WEAPON', 0, new Set(['w1']));
        assert.equals('locked', blocked.reason!);
        assert.equals('w1', blocked.backpack.equipped.WEAPON!);
    });

    suite.test('卸下：倉庫滿倉時拒絕（full），武將欄位保留裝備', () => {
        const full: Warehouse = { items: Array.from({ length: 50 }, (_, i) => ({ uid: `x${i}`, kind: 'WEAPON' as const })) };
        const backpack = { ...createBackpack(), equipped: { WEAPON: 'w1' } };
        const result = unequipToWarehouse(full, backpack, 'WEAPON', 0, NONE);
        assert.equals('full', result.reason!);
        assert.equals('w1', result.backpack.equipped.WEAPON!);
    });

    suite.test('進階欄解鎖後可裝備秘寶類與名馬類', () => {
        const backpack = unlockBackpackSlot(createBackpack(), 'MOUNT');
        assert.isTrue(equipFromWarehouse(WH, backpack, 'h1', 'MOUNT', NONE).ok);
    });

    suite.test('移動不改輸入', () => {
        const before = JSON.stringify(WH);
        equipFromWarehouse(WH, createBackpack(), 'w1', 'WEAPON', NONE);
        assert.equals(before, JSON.stringify(WH));
    });

    return suite;
}
