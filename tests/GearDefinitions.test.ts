/**
 * GearDefinitions.test.ts — 一般裝備定義表與名稱查詢（PROG-2-1039）；暫定品項（11/06 裁決 #7，PROG-2-1950）
 *
 * 鎖住：六個槽各有一筆 provisional 占位定義；暫定品項 16～24 件、欄位齊全、數值落在品質範圍、將階門檻 0～5；查無 id（含原型屬性名稱）回傳 undefined；
 * 物件庫列經 Gear_ID 查出名稱；寶頁格位文字使用裝備名稱。
 */
import { assert, TestSuite } from './TestRunner';
import { EQUIP_SLOTS, EquipSlot } from '../assets/scripts/core/systems/GeneralBackpack';
import { GEAR_DEFINITIONS, gearDefinitionOf, meetsGearRankRequirement } from '../assets/scripts/core/systems/GearDefinitions';
import { EQUIP_BONUS_RANGE } from '../assets/scripts/core/systems/EquipmentBonus';
import { GENERAL_RANK_MAX } from '../assets/scripts/core/systems/GeneralRankProgress';
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

    suite.test('六個槽各有一筆 provisional 占位定義，稀有度為 UNSET、無加成、將階 0', () => {
        const placeholders = GEAR_DEFINITIONS.filter((item) => item.rarity === 'UNSET');
        assert.equals(EQUIP_SLOTS.length, placeholders.length);
        for (const slot of EQUIP_SLOTS) {
            const def = GEAR_DEFINITIONS.find((item) => item.slot === slot);
            assert.isTrue(def !== undefined);
            assert.equals(`GEAR_${slot}_PLACEHOLDER`, def?.id ?? '');
            assert.isTrue(def?.provisional === true);
            assert.equals('UNSET', def?.rarity ?? '');
            assert.equals(0, Object.keys(def?.stats ?? {}).length);
            assert.equals(0, def?.requiredRank ?? -1);
        }
    });

    suite.test('暫定品項 16～24 件，id 不重複，六槽都有', () => {
        const items = GEAR_DEFINITIONS.filter((item) => item.rarity !== 'UNSET');
        assert.isTrue(items.length >= 16 && items.length <= 24);
        assert.equals(GEAR_DEFINITIONS.length, new Set(GEAR_DEFINITIONS.map((item) => item.id)).size);
        for (const slot of EQUIP_SLOTS) assert.isTrue(items.some((item) => item.slot === slot));
        for (const item of items) {
            assert.isTrue(item.name.length > 0 && !item.name.includes('占位'));
            assert.equals(`UI_GEAR_NAME_${item.id.slice('GEAR_'.length)}`, item.nameKey);
        }
    });

    suite.test('暫定品項的每項加成都落在品質範圍內，將階門檻為 0～5 整數', () => {
        for (const item of GEAR_DEFINITIONS.filter((def) => def.rarity !== 'UNSET')) {
            const range = EQUIP_BONUS_RANGE[item.rarity as keyof typeof EQUIP_BONUS_RANGE];
            const values = Object.values(item.stats) as number[];
            assert.isTrue(values.length > 0);
            for (const value of values) assert.isTrue(value >= range.min && value <= range.max);
            assert.isTrue(Number.isInteger(item.requiredRank) && item.requiredRank >= 0 && item.requiredRank <= GENERAL_RANK_MAX);
        }
    });

    suite.test('品質越高將階門檻不低於低品質；N 品皆為將階 0、SSR 皆需將階 4 以上', () => {
        const order = ['N', 'R', 'SR', 'SSR'];
        const items = GEAR_DEFINITIONS.filter((def) => def.rarity !== 'UNSET');
        for (const slot of EQUIP_SLOTS) {
            const ranks = order.map((tier) => items.filter((item) => item.slot === slot && item.rarity === tier).map((item) => item.requiredRank));
            for (let i = 1; i < ranks.length; i++) {
                if (ranks[i].length && ranks[i - 1].length) assert.isTrue(Math.min(...ranks[i]) >= Math.max(...ranks[i - 1]));
            }
        }
        for (const item of items) {
            if (item.rarity === 'N') assert.equals(0, item.requiredRank);
            if (item.rarity === 'SSR') assert.isTrue(item.requiredRank >= 4);
        }
    });

    suite.test('將階門檻判斷：未達不可穿、達到可穿、越界或缺值夾回 0～5', () => {
        const redHare = gearDefinitionOf('GEAR_MOUNT_RED_HARE')!;
        assert.equals('赤兔馬', redHare.name);
        assert.isFalse(meetsGearRankRequirement(redHare, 4));
        assert.isTrue(meetsGearRankRequirement(redHare, 5));
        assert.isTrue(meetsGearRankRequirement(redHare, 99));
        assert.isFalse(meetsGearRankRequirement(redHare, undefined));
        const saber = gearDefinitionOf('GEAR_WEAPON_RING_POMMEL_SABER')!;
        assert.isTrue(meetsGearRankRequirement(saber, undefined));
        assert.isTrue(meetsGearRankRequirement(saber, -3));
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
