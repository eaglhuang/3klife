/**
 * GearEquipFlow.test.ts — 一般裝備穿戴與卸下（PROG-2-1040）
 *
 * 鎖住：穿戴寫入 equippedBy／slotId 且不改原陣列；格內舊件自動卸下；
 * 拒絕非裝備、他人已裝、不可放入、未解鎖的情況；卸下後背包視圖回到空格。
 */
import { assert, TestSuite } from './TestRunner';
import { EquipSlot } from '../assets/scripts/core/systems/GeneralBackpack';
import { deriveGeneralBackpack } from '../assets/scripts/core/systems/GeneralBackpackView';
import { equipGear, unequipGear } from '../assets/scripts/core/systems/GearEquipFlow';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

const GENERAL = 'gen-1';
const OTHER_GENERAL = 'gen-2';

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
        equippedBy: null,
        slotId: null,
        ...overrides,
    };
}

/** 測試用的「可放入」判斷：每件裝備的 id 前綴即它的槽位，例如 WEAPON-1 只能進 WEAPON。 */
const canEquipByPrefix = (record: Readonly<InventoryRecord>, slotId: EquipSlot): boolean =>
    record.Inventory_ID.startsWith(`${slotId}-`);

function reasonOf(result: ReturnType<typeof equipGear>): string {
    return result.ok ? 'OK' : result.reason;
}

export function createGearEquipFlowSuite(): TestSuite {
    const suite = new TestSuite('GearEquipFlow (一般裝備穿戴與卸下 PROG-2-1040)');

    suite.test('穿戴到空的基礎格：寫入 equippedBy 與 slotId，且不修改原陣列', () => {
        const before = [gear('WEAPON-1')];
        const result = equipGear(before, 'WEAPON-1', GENERAL, 'WEAPON', canEquipByPrefix);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(GENERAL, result.records[0].equippedBy ?? '');
        assert.equals('WEAPON', result.records[0].slotId ?? '');
        assert.isTrue(before[0].equippedBy === null);
    });

    suite.test('格內已有舊件時，舊件自動卸下回倉庫', () => {
        const before = [gear('WEAPON-1', { equippedBy: GENERAL, slotId: 'WEAPON' }), gear('WEAPON-2')];
        const result = equipGear(before, 'WEAPON-2', GENERAL, 'WEAPON', canEquipByPrefix);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        const old = result.records.find((r) => r.Inventory_ID === 'WEAPON-1');
        assert.isTrue(old?.equippedBy === null && old?.slotId === null);
        assert.equals(GENERAL, result.records.find((r) => r.Inventory_ID === 'WEAPON-2')?.equippedBy ?? '');
    });

    suite.test('非一般裝備（Item_Type 不為 OTHER）拒絕', () => {
        const tally: InventoryRecord = gear('WEAPON-1', { Item_Type: 'TALLY' });
        assert.equals('NOT_GEAR', reasonOf(equipGear([tally], 'WEAPON-1', GENERAL, 'WEAPON', canEquipByPrefix)));
    });

    suite.test('查無裝備列拒絕', () => {
        assert.equals('NOT_FOUND', reasonOf(equipGear([gear('WEAPON-1')], 'MISSING', GENERAL, 'WEAPON', canEquipByPrefix)));
    });

    suite.test('已裝在其他武將身上的裝備拒絕；同一武將重新穿戴不算他人', () => {
        const owned = [gear('WEAPON-1', { equippedBy: OTHER_GENERAL, slotId: 'WEAPON' })];
        assert.equals('OWNED_ELSEWHERE', reasonOf(equipGear(owned, 'WEAPON-1', GENERAL, 'WEAPON', canEquipByPrefix)));
        const self = [gear('WEAPON-1', { equippedBy: GENERAL, slotId: 'WEAPON' })];
        assert.equals('OK', reasonOf(equipGear(self, 'WEAPON-1', GENERAL, 'WEAPON', canEquipByPrefix)));
    });

    suite.test('呼叫端判定不可放入的格位拒絕', () => {
        assert.equals('NOT_EQUIPABLE', reasonOf(equipGear([gear('WEAPON-1')], 'WEAPON-1', GENERAL, 'ARMOR', canEquipByPrefix)));
    });

    suite.test('進階格沒有裝備即未解鎖，拒絕穿戴；已有裝備時可替換', () => {
        assert.equals('SLOT_LOCKED', reasonOf(equipGear([gear('TOME-1')], 'TOME-1', GENERAL, 'TOME', canEquipByPrefix)));
        const occupied = [gear('TOME-1', { equippedBy: GENERAL, slotId: 'TOME' }), gear('TOME-2')];
        assert.equals('OK', reasonOf(equipGear(occupied, 'TOME-2', GENERAL, 'TOME', canEquipByPrefix)));
    });

    suite.test('穿戴後背包視圖顯示該格為已裝備', () => {
        const result = equipGear([gear('WEAPON-1')], 'WEAPON-1', GENERAL, 'WEAPON', canEquipByPrefix);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        const backpack = deriveGeneralBackpack(result.records, GENERAL);
        assert.equals('WEAPON-1', backpack.equipped.WEAPON ?? '');
    });

    suite.test('卸下後兩欄清為 null，背包視圖回到空格', () => {
        const worn = [gear('WEAPON-1', { equippedBy: GENERAL, slotId: 'WEAPON' })];
        const result = unequipGear(worn, GENERAL, 'WEAPON');
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.isTrue(result.records[0].equippedBy === null && result.records[0].slotId === null);
        assert.isTrue(deriveGeneralBackpack(result.records, GENERAL).equipped.WEAPON === undefined);
    });

    suite.test('卸下空格或他人的格位回傳 NOT_FOUND', () => {
        const worn = [gear('WEAPON-1', { equippedBy: OTHER_GENERAL, slotId: 'WEAPON' })];
        const result = unequipGear(worn, GENERAL, 'WEAPON');
        assert.equals('NOT_FOUND', result.ok ? 'OK' : result.reason);
    });

    return suite;
}
