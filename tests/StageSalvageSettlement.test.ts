/**
 * StageSalvageSettlement — 戰場撿拾戰後入帳（PROG-2-1571）
 * 覆蓋：補給轉糧草且受上限、材料入背包、戰敗不入帳、糧草已超上限時不倒扣。
 */
import { assert, TestSuite } from './TestRunner';
import { settleStageSalvage } from '../assets/scripts/core/systems/StageSalvageSettlement';
import { ITEM_INSTRUCTOR_EXP, ITEM_STONE, ITEM_WEAPON_MATERIAL } from '../assets/scripts/core/systems/ItemDef';

const salvage = { stone: 3, wood: 0, supply: 300, intel: 0, weaponMaterial: 10, instructorExp: 20 };

export function createStageSalvageSettlementSuite(): TestSuite {
    const suite = new TestSuite('StageSalvageSettlement (戰場撿拾戰後入帳 PROG-2-1571)');

    suite.test('勝利：補給轉糧草，材料入背包', () => {
        const r = settleStageSalvage(salvage, true, 100, 1000, {});
        assert.equals(400, r.food);
        assert.equals(300, r.foodGained);
        assert.equals(3, r.inventory[ITEM_STONE]);
        assert.equals(10, r.inventory[ITEM_WEAPON_MATERIAL]);
        assert.equals(20, r.inventory[ITEM_INSTRUCTOR_EXP]);
        assert.equals(undefined, r.inventory['ITEM_WOOD']);
    });

    suite.test('糧草受糧倉上限截斷', () => {
        const r = settleStageSalvage(salvage, true, 900, 1000, {});
        assert.equals(1000, r.food);
        assert.equals(100, r.foodGained);
    });

    suite.test('糧草已超上限時不倒扣', () => {
        assert.equals(1200, settleStageSalvage(salvage, true, 1200, 1000, {}).food);
    });

    suite.test('戰敗不入帳', () => {
        const inv = {};
        const r = settleStageSalvage(salvage, false, 100, 1000, inv);
        assert.equals(100, r.food);
        assert.equals(inv, r.inventory);
    });

    return suite;
}
