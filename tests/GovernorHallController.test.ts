/**
 * GovernorHallController.test.ts — 太守府畫面的 FlowView（PROG-2-0977）
 */
import { assert, TestSuite } from './TestRunner';
import { GovernorHallController } from '../assets/scripts/ui/core/GovernorHallController';
import { planTerritoryUpgrade } from '../assets/scripts/core/systems/TerritoryUpgrade';
import type { GovernorSnapshot } from '../assets/scripts/core/systems/GovernorHallView';

function snapshot(overrides: Partial<GovernorSnapshot> = {}): GovernorSnapshot {
    return {
        population: 1200,
        morale: 65,
        gold: { base: 100, populationBonus: 20, policyModifier: -5 },
        food: { base: 80, populationBonus: 10, policyModifier: 0 },
        cityTroops: { current: 7000, cap: 8000, recruitPerTurn: 300 },
        ...overrides,
    };
}

export function createGovernorHallControllerSuite(): TestSuite {
    const suite = new TestSuite('GovernorHallController (PROG-2-0977 太守府畫面)');

    suite.test('FlowView 的文字與數值來自快照（人口、民心、產出總計、兵源）', () => {
        const flow = new GovernorHallController({ snapshot: () => snapshot() }).getFlowView();
        assert.equals('人口 1200', flow.texts.govPopulation);
        assert.equals('民心 65', flow.texts.govMorale);
        assert.equals('總計 115', flow.texts.govGoldTotal);
        assert.equals('總計 90', flow.texts.govFoodTotal);
        assert.equals('目前兵源 7000 / 8000', flow.texts.govTroopStock);
        assert.equals('距離回滿 4 回合', flow.texts.govTroopRecover);
    });

    suite.test('四條流向各有文字與 active 標記，節點 id 與 key 對應', () => {
        const flow = new GovernorHallController({ snapshot: () => snapshot() }).getFlowView();
        assert.equals('金錢　115', flow.texts.govFlowGold);
        assert.equals('糧草　90', flow.texts.govFlowFood);
        assert.equals('城市兵源上限　8000', flow.texts.govFlowCityTroopCap);
        assert.equals('補兵速度　300', flow.texts.govFlowRecruitRegen);
        for (const id of ['govFlowGold', 'govFlowFood', 'govFlowCityTroopCap', 'govFlowRecruitRegen']) {
            assert.isTrue(flow.actives[id]);
        }
    });

    suite.test('補兵為 0 時距離回滿顯示無法回滿，不會除以零', () => {
        const flow = new GovernorHallController({
            snapshot: () => snapshot({ cityTroops: { current: 100, cap: 8000, recruitPerTurn: 0 } }),
        }).getFlowView();
        assert.equals('距離回滿 無法回滿（補兵為 0）', flow.texts.govTroopRecover);
    });

    suite.test('未傳等級資訊時為 Lv1、2 格，升級按鈕不可按', () => {
        const flow = new GovernorHallController({ snapshot: () => snapshot() }).getFlowView();
        assert.equals('太守府 Lv1', flow.texts.govLevel);
        assert.equals('內政任務格 2', flow.texts.govSlots);
        assert.equals('', flow.texts.govPending);
        assert.isFalse(flow.actives.btnUpgrade);
    });

    suite.test('可升級時顯示目標等級與費用，按鈕可按', () => {
        const flow = new GovernorHallController({
            snapshot: () => snapshot(),
            territory: () => ({ level: 1, maxSlots: 2, pendingLevel: null, plan: planTerritoryUpgrade(1, null, 5000) }),
        }).getFlowView();
        assert.equals('升級至 Lv2（金 4000・糧 1000）', flow.texts.btnUpgradeLabel);
        assert.isTrue(flow.actives.btnUpgrade);
    });

    suite.test('待生效升級時顯示待生效文字，按鈕不可按並說明原因', () => {
        const flow = new GovernorHallController({
            snapshot: () => snapshot(),
            territory: () => ({ level: 1, maxSlots: 2, pendingLevel: 2, plan: planTerritoryUpgrade(1, 2, 5000) }),
        }).getFlowView();
        assert.equals('Lv2 將於季結生效', flow.texts.govPending);
        assert.equals('已有待生效的升級', flow.texts.btnUpgradeLabel);
        assert.isFalse(flow.actives.btnUpgrade);
    });

    suite.test('金錢不足時升級按鈕停用並顯示金錢不足提示', () => {
        const flow = new GovernorHallController({
            snapshot: () => snapshot(),
            territory: () => ({ level: 1, maxSlots: 2, pendingLevel: null, plan: planTerritoryUpgrade(1, null, 5000), goldShortage: true }),
        }).getFlowView();
        assert.equals('金錢不足', flow.texts.btnUpgradeLabel);
        assert.isFalse(flow.actives.btnUpgrade);
    });

    return suite;
}
