/**
 * GearPageSlots.test.ts — 寶頁一般裝備 2x3 格位檢視模型（PROG-2-1034，GDUI-11）
 *
 * 鎖住：格位順序固定為 2x3；未解鎖為 LOCKED、已解鎖空為 EMPTY、已放入為 EQUIPPED；
 * 不改動 backpack 資料本身。
 */
import { assert, TestSuite } from './TestRunner';
import { createBackpack, EquipSlot, GeneralBackpack } from '../assets/scripts/core/systems/GeneralBackpack';
import { buildGearPageSlots, GEAR_PAGE_GRID } from '../assets/scripts/core/systems/GearPageSlots';

export function createGearPageSlotsSuite(): TestSuite {
    const suite = new TestSuite('GearPageSlots (寶頁 2x3 格位 GDUI-11)');

    suite.test('格位順序固定為 2 列 × 3 欄，對應六槽 ID', () => {
        assert.equals(2, GEAR_PAGE_GRID.length);
        const views = buildGearPageSlots(createBackpack());
        assert.equals(6, views.length);
        assert.equals('WEAPON', views[0].slot);
        assert.equals('ACCESSORY', views[2].slot);
        assert.equals('MOUNT', views[3].slot);
        assert.equals('TREASURE', views[5].slot);
        assert.equals(1, views[3].row);
        assert.equals(2, views[5].col);
    });

    suite.test('基礎欄預設解鎖為 EMPTY，進階欄為 LOCKED', () => {
        const views = buildGearPageSlots(createBackpack());
        assert.equals('EMPTY', views[0].state);
        assert.equals('EMPTY', views[2].state);
        assert.equals('LOCKED', views[3].state);
        assert.equals('LOCKED', views[5].state);
    });

    suite.test('已放入裝備的格位為 EQUIPPED 並帶上 uid', () => {
        const backpack: GeneralBackpack = {
            unlocked: ['WEAPON', 'ARMOR', 'ACCESSORY', 'MOUNT'],
            equipped: { WEAPON: 'eq-1', MOUNT: 'eq-2' } as Partial<Record<EquipSlot, string>>,
        };
        const views = buildGearPageSlots(backpack);
        assert.equals('EQUIPPED', views[0].state);
        assert.equals('eq-1', views[0].equippedUid ?? '');
        assert.equals('EQUIPPED', views[3].state);
        assert.equals('EMPTY', views[1].state);
        assert.equals('LOCKED', views[4].state);
    });

    suite.test('建立檢視模型不改動 backpack 資料', () => {
        const backpack = createBackpack();
        const before = JSON.stringify(backpack);
        buildGearPageSlots(backpack);
        assert.equals(before, JSON.stringify(backpack));
    });

    return suite;
}
