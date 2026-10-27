/**
 * GearDefinitions.test.ts — 一般裝備定義表與名稱查詢（PROG-2-1039）
 *
 * 鎖住：六個槽各有一筆 provisional 占位定義；查無 id（含原型屬性名稱）回傳 undefined；
 * 物件庫列經 Gear_ID 查出名稱；寶頁格位文字使用裝備名稱。
 */
import { assert, TestSuite } from './TestRunner';
import { EQUIP_SLOTS, EquipSlot } from '../assets/scripts/core/systems/GeneralBackpack';
import { GEAR_DEFINITIONS, gearDefinitionOf } from '../assets/scripts/core/systems/GearDefinitions';
import { gearNameOfUid } from '../assets/scripts/core/systems/GeneralBackpackView';
import { buildGearPageSlots, gearSlotText } from '../assets/scripts/core/systems/GearPageSlots';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

function gear(id: string, gearId: string | null): InventoryRecord {
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
        Gear_ID: gearId,
    };
}

export function createGearDefinitionsSuite(): TestSuite {
    const suite = new TestSuite('GearDefinitions (裝備定義表與名稱查詢 PROG-2-1039)');

    suite.test('六個槽各有一筆 provisional 占位定義，稀有度為 UNSET', () => {
        assert.equals(EQUIP_SLOTS.length, GEAR_DEFINITIONS.length);
        for (const slot of EQUIP_SLOTS) {
            const def = GEAR_DEFINITIONS.find((item) => item.slot === slot);
            assert.isTrue(def !== undefined);
            assert.isTrue(def?.provisional === true);
            assert.equals('UNSET', def?.rarity ?? '');
        }
    });

    suite.test('查無 id、空值與原型屬性名稱都回傳 undefined', () => {
        assert.isTrue(gearDefinitionOf('NO_SUCH_GEAR') === undefined);
        assert.isTrue(gearDefinitionOf(null) === undefined);
        assert.isTrue(gearDefinitionOf('toString') === undefined);
    });

    suite.test('物件庫列經 Gear_ID 查出名稱；缺 Gear_ID 的列查無名稱', () => {
        const weaponId = GEAR_DEFINITIONS.find((item) => item.slot === 'WEAPON')!.id;
        const records = [gear('eq-1', weaponId), gear('eq-2', null)];
        assert.equals('武器（占位）', gearNameOfUid(records, 'eq-1') ?? '');
        assert.isTrue(gearNameOfUid(records, 'eq-2') === undefined);
        assert.isTrue(gearNameOfUid(records, 'missing') === undefined);
    });

    suite.test('寶頁格位文字使用裝備名稱，查不到名稱時仍顯示已裝備', () => {
        const weaponId = GEAR_DEFINITIONS.find((item) => item.slot === 'WEAPON')!.id;
        const records = [gear('eq-1', weaponId)];
        const backpack = { unlocked: ['WEAPON' as EquipSlot], equipped: { WEAPON: 'eq-1' } as Partial<Record<EquipSlot, string>> };
        const named = buildGearPageSlots(backpack, (uid) => gearNameOfUid(records, uid));
        assert.equals('武器：武器（占位）', gearSlotText(named[0]));
        const unnamed = buildGearPageSlots(backpack);
        assert.equals('武器：已裝備', gearSlotText(unnamed[0]));
    });

    return suite;
}
