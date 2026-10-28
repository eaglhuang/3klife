/**
 * RivalRiseFall.test.ts — 他國 AI 勢力興衰與時代更迭觸發（E-9、E-10，PROG-2-1475）
 */
import {
    NATION_STANDING_EFFECTS, nationPowerScore, nationStandingOf, shouldEvaluateStanding, shouldTriggerEraShift,
} from '../assets/scripts/core/systems/RivalRiseFall';
import { TestSuite, assert } from './TestRunner';

export function createRivalRiseFallSuite(): TestSuite {
    const suite = new TestSuite('RivalRiseFall (他國勢力興衰 E-9 E-10 PROG-2-1475)');

    suite.test('E-9 國力 = 兵力＋武將×200＋領地×500＋名聲', () => {
        assert.equals(2000 + 5 * 200 + 4 * 500 + 300, nationPowerScore({ troops: 2000, generalCount: 5, territories: 4, fame: 300 }));
    });

    suite.test('E-9 等級門檻採嚴格大於', () => {
        assert.equals('HEGEMONY', nationStandingOf(10001));
        assert.equals('STRONG', nationStandingOf(10000));
        assert.equals('STABLE', nationStandingOf(6000));
        assert.equals('DECLINING', nationStandingOf(3000));
        assert.equals('COLLAPSING', nationStandingOf(1000));
    });

    suite.test('E-9 等級效果與每年評估', () => {
        assert.equals(10, NATION_STANDING_EFFECTS.HEGEMONY.hostilityPerSeason);
        assert.equals(0.2, NATION_STANDING_EFFECTS.COLLAPSING.defectionRateBonus);
        assert.equals(0.5, NATION_STANDING_EFFECTS.COLLAPSING.invasionChanceBonus);
        assert.equals(0, NATION_STANDING_EFFECTS.STABLE.hostilityPerSeason);
        assert.isTrue(shouldEvaluateStanding(8));
        assert.isTrue(!shouldEvaluateStanding(6));
    });

    suite.test('E-10 時代更迭：霸主佔比 ≥ 0.9 或玩家長期崩潰', () => {
        assert.isTrue(shouldTriggerEraShift({ strongestDomainRatio: 0.9, playerTerritories: 10, playerCollapseSeasons: 0 }));
        assert.isTrue(shouldTriggerEraShift({ strongestDomainRatio: 0.5, playerTerritories: 2, playerCollapseSeasons: 3 }));
        assert.isTrue(!shouldTriggerEraShift({ strongestDomainRatio: 0.5, playerTerritories: 3, playerCollapseSeasons: 5 }));
        assert.isTrue(!shouldTriggerEraShift({ strongestDomainRatio: 0.89, playerTerritories: 1, playerCollapseSeasons: 2 }));
    });

    return suite;
}
