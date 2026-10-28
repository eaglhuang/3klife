/**
 * ItemDef.test.ts — 道具資料表（PROG-2-1375，ITM-01）
 */
import * as Inventory from '../assets/scripts/core/systems/PlayerInventory';
import { assert, TestSuite } from './TestRunner';
import { ITEM_CATEGORIES, ITEM_DEFS, itemDefOf } from '../assets/scripts/core/systems/ItemDef';

/** 安胎藥已用標記：不是背包道具，不需要定義 */
const NOT_BAG_ITEMS = new Set([Inventory.ITEM_FERTILITY_ARMED]);

export function createItemDefSuite(): TestSuite {
    const suite = new TestSuite('ItemDef (PROG-2-1375 道具資料表)');

    suite.test('每個背包道具 ID 常數都有資料表定義', () => {
        const ids = new Set(ITEM_DEFS.map((def) => def.id));
        const constants = Object.entries(Inventory)
            .filter(([key, value]) => key.startsWith('ITEM_') && typeof value === 'string')
            .map(([, value]) => value as string)
            .filter((id) => !NOT_BAG_ITEMS.has(id));
        assert.isTrue(constants.length > 0);
        for (const id of constants) assert.isTrue(ids.has(id), `缺少定義：${id}`);
    });

    suite.test('道具 ID 不重複', () => {
        const ids = ITEM_DEFS.map((def) => def.id);
        assert.equals(ids.length, new Set(ids).size);
    });

    suite.test('每筆分類都在五大分類內，稀有度為正整數（暫定 1）', () => {
        for (const def of ITEM_DEFS) {
            assert.isTrue(ITEM_CATEGORIES.includes(def.category), `分類不在五大分類：${def.id}`);
            assert.isTrue(Number.isInteger(def.rarity) && def.rarity >= 1, `稀有度不合法：${def.id}`);
        }
    });

    suite.test('ITEM_DISPLAY_NAMES 由資料表推導：名稱與顯示順序不變', () => {
        const keys = Object.keys(Inventory.ITEM_DISPLAY_NAMES);
        assert.equals(ITEM_DEFS.length, keys.length);
        assert.equals(
            '求籤令,轉職令,試用券,竹簡,戰法筆記,補元散,高級補元散,歸宗令,傳道令,祈風令,祈雨符,刷新券,安胎藥,入學令,虎符精華,延壽丹,加速卡,傳家寶物',
            keys.map((key) => Inventory.ITEM_DISPLAY_NAMES[key]).join(','),
        );
    });

    suite.test('依 ID 查定義：已知回傳定義，未知回傳 null', () => {
        assert.equals('消耗品', itemDefOf(Inventory.ITEM_VITALITY_PILL)!.category);
        assert.equals('材料', itemDefOf(Inventory.ITEM_BATTLE_NOTE)!.category);
        assert.isTrue(itemDefOf('ITEM_NOT_EXISTS') === null);
    });

    return suite;
}
