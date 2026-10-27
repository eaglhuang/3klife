/**
 * GameSessionGearEquip.test.ts — GameSession 穿戴與卸下一般裝備（PROG-2-1040 接線）
 *
 * 鎖住：穿戴的可否判斷來自一般裝備定義表；成功才寫回物件庫列並反映到寶頁背包；
 * 失敗時物件庫不變；卸下後格位回到空。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { GEAR_DEFINITIONS } from '../assets/scripts/core/systems/GearDefinitions';
import { deriveGeneralBackpack } from '../assets/scripts/core/systems/GeneralBackpackView';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const GENERAL = 'G1';

function placeholderIdOf(slot: string): string {
    return GEAR_DEFINITIONS.find((def) => def.slot === slot)!.id;
}

function gear(id: string, gearId: string | null): InventoryRecord {
    return {
        Inventory_ID: id, Item_Type: 'OTHER', Slot_Type: 'GEAR', Bound_General_UID: null, Quantity: 1, Quality: 'R',
        Source_Type: 'TEST', Display_Bucket: 'GEAR', Is_Displayed: true, Attributes: {}, Gear_ID: gearId,
    } as InventoryRecord;
}

function sessionWith(records: InventoryRecord[]): GameSession {
    const session = new GameSession(4);
    session.setRosterStore(new InMemoryRosterStore([{ id: GENERAL, name: GENERAL, faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 120 } as unknown as GeneralConfig]));
    (session as unknown as { _inventoryRecords: InventoryRecord[] })._inventoryRecords = records;
    return session;
}

export function createGameSessionGearEquipSuite(): TestSuite {
    const suite = new TestSuite('GameSessionGearEquip (GameSession 穿戴與卸下 PROG-2-1040)');

    suite.test('穿戴符合定義槽位的裝備：寫回物件庫列，寶頁背包顯示已裝備', () => {
        const session = sessionWith([gear('W1', placeholderIdOf('WEAPON'))]);
        const result = session.equipGear('W1', GENERAL, 'WEAPON');
        assert.isTrue(result.ok);
        assert.equals(GENERAL, session.inventoryRecords[0].equippedBy ?? '');
        assert.equals('WEAPON', session.inventoryRecords[0].slotId ?? '');
        assert.equals('W1', deriveGeneralBackpack(session.inventoryRecords, GENERAL).equipped.WEAPON ?? '');
    });

    suite.test('槽位與定義不符時拒絕，物件庫不變', () => {
        const session = sessionWith([gear('W1', placeholderIdOf('WEAPON'))]);
        const result = session.equipGear('W1', GENERAL, 'ARMOR');
        assert.equals('NOT_EQUIPABLE', result.ok ? 'OK' : result.reason);
        assert.isTrue(session.inventoryRecords[0].equippedBy === undefined || session.inventoryRecords[0].equippedBy === null);
    });

    suite.test('沒有定義的 Gear_ID 無法穿戴', () => {
        const session = sessionWith([gear('X1', 'NO_SUCH_GEAR')]);
        const result = session.equipGear('X1', GENERAL, 'WEAPON');
        assert.equals('NOT_EQUIPABLE', result.ok ? 'OK' : result.reason);
    });

    suite.test('卸下後格位回到空，裝備回到倉庫', () => {
        const session = sessionWith([gear('W1', placeholderIdOf('WEAPON'))]);
        session.equipGear('W1', GENERAL, 'WEAPON');
        const result = session.unequipGear(GENERAL, 'WEAPON');
        assert.isTrue(result.ok);
        assert.isTrue(deriveGeneralBackpack(session.inventoryRecords, GENERAL).equipped.WEAPON === undefined);
    });

    return suite;
}
