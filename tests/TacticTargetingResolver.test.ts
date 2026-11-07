/**
 * TacticTargetingResolver — 戰法目標管線（doc_spec_0358；PROG-2-2044）
 */
import { assert, TestSuite } from './TestRunner';
import {
    PIERCING_RATIO_NORMAL, checkTacticCondition, computeDistanceFalloff, effectiveDefense, patternCells, resolveTacticTargets,
} from '../assets/scripts/battle/shared/TacticTargetingResolver';

export function createTacticTargetingResolverSuite(): TestSuite {
    const suite = new TestSuite('TacticTargetingResolver (目標管線 doc_spec_0358 PROG-2-2044)');

    suite.test('§5-1 直線 3 格衰減 1.0／0.85／0.70；扇形每格 −10%', () => {
        assert.equals('1,0.85,0.7', [1, 2, 3].map((d) => computeDistanceFalloff(d, 'TLINE')).join(','));
        assert.equals(0.6, computeDistanceFalloff(5, 'TFAN'));
        assert.equals(1, computeDistanceFalloff(4, 'TDIR'));
        const cells = patternCells('TFAN', { x: 0, y: 0 }, { x: 1, y: 0 });
        assert.isTrue(cells.some((c) => c.coord.x === 5 && c.coord.y === 0));
        assert.isFalse(cells.some((c) => c.coord.x === 1 && c.coord.y === 1));
        assert.isFalse(cells.some((c) => c.coord.x < 0));
    });

    suite.test('§5-2 雨天火攻回 WEATHER_MISMATCH；兵種不符阻絕', () => {
        const rain = checkTacticCondition({ tacticType: 'FIRE', weather: 'RAINY', casterTroopType: 'ARCHER' });
        assert.isFalse(rain.ok);
        assert.equals('WEATHER_MISMATCH', rain.ok ? '' : rain.reason);
        const troop = checkTacticCondition({ tacticType: 'CHARGE', weather: 'CLEAR', casterTroopType: 'INFANTRY', requiredTroopTypes: ['CAVALRY'] });
        assert.equals('TROOP_MISMATCH', troop.ok ? '' : troop.reason);
        assert.isTrue(checkTacticCondition({ tacticType: 'FIRE', weather: 'CLEAR', casterTroopType: 'ARCHER' }).ok);
    });

    suite.test('§5-3 無真視時直線掠過伏兵；穿甲 30%', () => {
        const units = [
            { unitId: 'ambush', coord: { x: 1, y: 0 }, isEnemy: true, stealthed: true },
            { unitId: 'e2', coord: { x: 2, y: 0 }, isEnemy: true, stealthed: false },
            { unitId: 'ally', coord: { x: 3, y: 0 }, isEnemy: false, stealthed: false },
        ];
        const hit = resolveTacticTargets('TLINE', { x: 0, y: 0 }, { x: 3, y: 0 }, units, false);
        assert.equals('e2', hit.map((h) => h.unitId).join(','));
        assert.equals(0.85, hit[0].falloff);
        assert.equals('ambush,e2', resolveTacticTargets('TLINE', { x: 0, y: 0 }, { x: 3, y: 0 }, units, true).map((h) => h.unitId).join(','));
        assert.equals(70, effectiveDefense(100, PIERCING_RATIO_NORMAL));
    });

    return suite;
}
