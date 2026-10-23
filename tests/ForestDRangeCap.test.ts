/**
 * 林地 D 級視野受限簡化版（PROG-2-0789）headless 測試
 *
 * 協調者暫定：林地 D 的部隊只能攻擊相鄰格，不能對射程 2 以上的目標發動遠程攻擊或戰法。
 * 這裡測射程上限的規則；戰鬥與戰法接線用同一條規則。
 */
import { TestSuite, assert } from './TestRunner';
import { FOREST_D_ATTACK_RANGE_CAP, terrainAttackRangeCapOf } from '../assets/scripts/core/systems/TerrainTroopRules';
import { resolveAptitude } from '../assets/scripts/core/systems/BattleAptitude';
import { TerrainType } from '../assets/scripts/shared/CommonEnums';

export function createForestDRangeCapSuite(): TestSuite {
    const suite = new TestSuite('ForestDRangeCap (林地 D 視野受限簡化版 PROG-2-0789)');

    suite.test('林地 D：射程上限為 1（只打相鄰格）', () => {
        assert.equals(FOREST_D_ATTACK_RANGE_CAP, terrainAttackRangeCapOf(TerrainType.Forest, 'D'));
        assert.equals(1, terrainAttackRangeCapOf(TerrainType.Forest, 'D'));
    });

    suite.test('林地 S/A/B/C 與非林地 D 都沒有射程上限', () => {
        assert.equals(null, terrainAttackRangeCapOf(TerrainType.Forest, 'S'));
        assert.equals(null, terrainAttackRangeCapOf(TerrainType.Forest, 'B'));
        assert.equals(null, terrainAttackRangeCapOf(TerrainType.Forest, 'C'));
        assert.equals(null, terrainAttackRangeCapOf(TerrainType.Plain, 'D'));
    });

    suite.test('由武將地形適性解析：林地 D 的 terrain 等級會觸發上限', () => {
        const r = resolveAptitude({ terrainAptitude: { FOREST: 'D' } }, { troopType: 'archer', terrain: 'forest' });
        assert.equals('D', r.terrain);
        assert.equals(1, terrainAttackRangeCapOf(TerrainType.Forest, r.terrain));
    });

    return suite;
}
