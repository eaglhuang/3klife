/**
 * GovernorHallView.test.ts — 太守府治理頁文字與數值（GOV-07 / PROG-2-0973）
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildGovernorHallView,
    GovernorSnapshot,
    turnsToFullTroops,
} from '../assets/scripts/core/systems/GovernorHallView';

function snapshot(overrides: Partial<GovernorSnapshot> = {}): GovernorSnapshot {
    return {
        population: 1200,
        morale: 65,
        gold: { base: 100, populationBonus: 20, policyModifier: -5 },
        food: { base: 120, populationBonus: 0, policyModifier: 10 },
        cityTroops: { current: 800, cap: 1000, recruitPerTurn: 50 },
        ...overrides,
    };
}

export function createGovernorHallViewSuite(): TestSuite {
    const suite = new TestSuite('GovernorHallView (GOV-07 太守府治理頁)');

    suite.test('中央儀表盤顯示人口與民心', () => {
        const view = buildGovernorHallView(snapshot());
        assert.equals('人口 1200', view.populationText);
        assert.equals('民心 65', view.moraleText);
    });

    suite.test('四條流向：金錢、糧草、城市兵源上限、補兵速度', () => {
        const view = buildGovernorHallView(snapshot());
        assert.equals(4, view.flows.length);
        assert.equals('gold', view.flows[0].key);
        assert.equals('115', view.flows[0].valueText);
        assert.equals('130', view.flows[1].valueText);
        assert.equals('1000', view.flows[2].valueText);
        assert.equals('50', view.flows[3].valueText);
    });

    suite.test('產出卡拆成 基礎值 / 人口紅利 / 政策修正 / 總計，正負號明確', () => {
        const card = buildGovernorHallView(snapshot()).goldCard;
        assert.equals('基礎值 100', card.baseText);
        assert.equals('人口紅利 +20', card.populationBonusText);
        assert.equals('政策修正 -5', card.policyModifierText);
        assert.equals('總計 115', card.totalText);
    });

    suite.test('修正為 0 時顯示 +0', () => {
        const card = buildGovernorHallView(snapshot()).foodCard;
        assert.equals('人口紅利 +0', card.populationBonusText);
    });

    suite.test('城市兵源卡：目前 / 上限、每回合補兵、距離回滿', () => {
        const card = buildGovernorHallView(snapshot()).cityTroopCard;
        assert.equals('目前兵源 800 / 1000', card.stockText);
        assert.equals('每回合補兵 +50', card.recruitText);
        assert.equals('距離回滿 4 回合', card.recoverText);
    });

    suite.test('已回滿顯示已回滿；補兵為 0 顯示無法回滿', () => {
        const full = buildGovernorHallView(snapshot({ cityTroops: { current: 1000, cap: 1000, recruitPerTurn: 50 } }));
        assert.equals('距離回滿 已回滿', full.cityTroopCard.recoverText);
        const stalled = buildGovernorHallView(snapshot({ cityTroops: { current: 800, cap: 1000, recruitPerTurn: 0 } }));
        assert.equals('距離回滿 無法回滿（補兵為 0）', stalled.cityTroopCard.recoverText);
    });

    suite.test('turnsToFullTroops 無條件進位', () => {
        assert.equals(3, turnsToFullTroops(850, 1000, 50)!);
        assert.equals(0, turnsToFullTroops(1000, 1000, 50)!);
        assert.isTrue(turnsToFullTroops(0, 1000, 0) === null);
    });

    suite.test('不改輸入快照', () => {
        const input = snapshot();
        buildGovernorHallView(input);
        assert.equals(100, input.gold.base);
        assert.equals(800, input.cityTroops.current);
    });

    return suite;
}
