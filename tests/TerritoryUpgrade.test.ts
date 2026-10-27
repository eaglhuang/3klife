/**
 * TerritoryUpgrade.test.ts — 太守府升級的格數表與費用規劃（PROG-2-0979）
 */
import { assert, TestSuite } from './TestRunner';
import {
    maxTaskSlotsForLevel,
    planTerritoryUpgrade,
    territoryUpgradeCost,
    TERRITORY_MAX_LEVEL,
} from '../assets/scripts/core/systems/TerritoryUpgrade';

export function createTerritoryUpgradeSuite(): TestSuite {
    const suite = new TestSuite('TerritoryUpgrade (PROG-2-0979 領地升級)');

    suite.test('格數表：Lv1–5 為 2/3/4/5/6，超出範圍夾在邊界', () => {
        assert.equals(2, maxTaskSlotsForLevel(1));
        assert.equals(3, maxTaskSlotsForLevel(2));
        assert.equals(6, maxTaskSlotsForLevel(5));
        assert.equals(2, maxTaskSlotsForLevel(0));
        assert.equals(6, maxTaskSlotsForLevel(99));
        assert.equals(5, TERRITORY_MAX_LEVEL);
    });

    suite.test('費用：升到第 n 級為金錢 1000×n²、糧草 500×n', () => {
        const cost = territoryUpgradeCost(3);
        assert.equals(9000, cost.gold);
        assert.equals(1500, cost.food);
    });

    suite.test('規劃：糧草足夠時可升一級，回傳目標等級與費用', () => {
        const plan = planTerritoryUpgrade(1, null, 10000);
        assert.isTrue(plan.ok);
        assert.equals(2, plan.targetLevel);
        assert.equals(4000, plan.cost.gold);
        assert.equals(1000, plan.cost.food);
    });

    suite.test('規劃：已滿級、已有待生效升級、糧草不足時依序拒絕', () => {
        assert.equals('max-level', planTerritoryUpgrade(5, null, 99999).reason!);
        assert.equals('upgrade-pending', planTerritoryUpgrade(2, 3, 99999).reason!);
        assert.equals('insufficient-food', planTerritoryUpgrade(1, null, 999).reason!);
    });

    return suite;
}
