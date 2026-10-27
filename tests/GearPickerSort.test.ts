/**
 * GearPickerSort.test.ts — 選裝備清單依品質排序（武將背包系統 E-6，PROG-2-1357）
 */
import { assert, TestSuite } from './TestRunner';
import { buildGearPickerRows, gearQualityOf } from '../assets/scripts/core/systems/GearPickerView';
import { GEAR_DEFINITIONS } from '../assets/scripts/core/systems/GearDefinitions';

const WEAPON_ID = GEAR_DEFINITIONS.find((def) => def.slot === 'WEAPON')!.id;
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

function gear(id: string, quality: string): InventoryRecord {
    return {
        Inventory_ID: id, Item_Type: 'OTHER', Slot_Type: 'GEAR', Bound_General_UID: null, Quantity: 1, Quality: quality,
        Source_Type: 'TEST', Display_Bucket: 'GEAR', Is_Displayed: true, Attributes: {}, Gear_ID: WEAPON_ID,
    };
}

export function createGearPickerSortSuite(): TestSuite {
    const suite = new TestSuite('GearPickerSort (選裝備依品質排序 PROG-2-1357)');

    suite.test('品質由高到低，不認得的排最後，同品質依 id', () => {
        const rows = buildGearPickerRows([gear('A', 'N'), gear('B', '??'), gear('C', 'SR'), gear('D', 'ssr'), gear('E', 'R'), gear('F', 'SR')], 'g1', 'WEAPON');
        assert.equals('D,C,F,E,A,B', rows.map((r) => r.gearUid).join(','));
        assert.equals('SSR,SR,SR,R,N,', rows.map((r) => r.quality).join(','));
    });

    suite.test('品質正規化：去空白轉大寫，不認得回空字串', () => {
        assert.equals('SR', gearQualityOf(' sr '));
        assert.equals('', gearQualityOf('UR'));
        assert.equals('', gearQualityOf(undefined));
    });

    return suite;
}
