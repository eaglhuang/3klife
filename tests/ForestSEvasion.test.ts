/**
 * 林地 S 級迴避 +30%（PROG-2-0788）headless 測試
 *
 * 暫定實作：防守方站在林地且林地適性 S 時，攻擊方命中率 −30%，仍受命中下限（50%）約束。
 */
import { TestSuite, assert } from './TestRunner';
import { FOREST_S_EVASION_BONUS, terrainEvasionBonusOf } from '../assets/scripts/core/systems/TerrainTroopRules';
import { hitRateOf } from '../assets/scripts/core/systems/BattleAptitude';
import { TerrainType } from '../assets/scripts/shared/CommonEnums';

export function createForestSEvasionSuite(): TestSuite {
    const suite = new TestSuite('ForestSEvasion (林地 S 迴避 +30% PROG-2-0788)');

    suite.test('林地 S：迴避加成為 30%', () => {
        assert.equals(FOREST_S_EVASION_BONUS, terrainEvasionBonusOf(TerrainType.Forest, 'S'));
        assert.equals(0.3, terrainEvasionBonusOf(TerrainType.Forest, 'S'));
    });

    suite.test('林地 A/B/C/D 與非林地 S 都沒有迴避加成', () => {
        assert.equals(0, terrainEvasionBonusOf(TerrainType.Forest, 'A'));
        assert.equals(0, terrainEvasionBonusOf(TerrainType.Forest, 'D'));
        assert.equals(0, terrainEvasionBonusOf(TerrainType.Plain, 'S'));
    });

    suite.test('迴避讓攻擊方命中率降 30%（基礎 100% → 70%）', () => {
        assert.equals(0.7, hitRateOf(0 - terrainEvasionBonusOf(TerrainType.Forest, 'S')));
    });

    suite.test('迴避仍受命中下限約束（不會低於 50%）', () => {
        assert.equals(0.5, hitRateOf(-0.15 - 0.3 - 0.3), '基礎 100% − 0.75 = 25%，夾到下限 50%');
    });

    return suite;
}
