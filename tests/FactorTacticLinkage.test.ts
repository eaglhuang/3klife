/**
 * FactorTacticLinkage — 因子與戰法、地形連動規則（FBR-05，PROG-2-0584）測試
 */
import { TestSuite, assert } from './TestRunner';
import { TerrainType, Weather } from '../assets/scripts/shared/CommonEnums';
import {
    GREEN_FACTOR_TP_MULTIPLIER,
    learnTpCost,
    canNavalCombinedAttack,
    hitRateInWeather,
    forestMoveBonus,
} from '../assets/scripts/core/systems/FactorTacticLinkage';

export function createFactorTacticLinkageSuite(): TestSuite {
    const suite = new TestSuite('FactorTacticLinkage (因子戰法地形連動 FBR-05)');

    suite.test('綠色因子相符時學習戰法 TP 減半，否則維持原值', () => {
        assert.equals(GREEN_FACTOR_TP_MULTIPLIER, 0.5);
        assert.equals(40, learnTpCost(80, true));
        assert.equals(4, learnTpCost(7, true), '奇數減半後無條件進位');
        assert.equals(80, learnTpCost(80, false));
    });

    suite.test('水戰適性只在水域（河流）格可合攻，沒有適性或地形不符都不可', () => {
        assert.isTrue(canNavalCombinedAttack(TerrainType.River, true));
        assert.isFalse(canNavalCombinedAttack(TerrainType.River, false));
        assert.isFalse(canNavalCombinedAttack(TerrainType.Plain, true));
    });

    suite.test('大霧免疫：大霧天氣命中 100%，其他天氣或沒有免疫維持原命中率', () => {
        assert.equals(1, hitRateInWeather(0.7, Weather.Fog, true));
        assert.equals(0.7, hitRateInWeather(0.7, Weather.Fog, false));
        assert.equals(0.7, hitRateInWeather(0.7, Weather.Clear, true));
    });

    suite.test('林地適性在林地格移動力 +1，其他情況為 0', () => {
        assert.equals(1, forestMoveBonus(TerrainType.Forest, true));
        assert.equals(0, forestMoveBonus(TerrainType.Forest, false));
        assert.equals(0, forestMoveBonus(TerrainType.Plain, true));
    });

    return suite;
}
