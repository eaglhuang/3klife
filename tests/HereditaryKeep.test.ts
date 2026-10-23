/**
 * HereditaryKeep.test.ts — 世襲主城保護與背水一戰（GOV-09 / PROG-2-0971）
 */
import { assert, TestSuite } from './TestRunner';
import {
    attemptTerritoryLoss,
    canCaptureTerritory,
    KeepTerritory,
    lastStandModifiers,
} from '../assets/scripts/core/systems/HereditaryKeep';

const HOME: KeepTerritory = { id: 'home', isHome: true };
const OUTER_A: KeepTerritory = { id: 'a', isHome: false };
const OUTER_B: KeepTerritory = { id: 'b', isHome: false };

export function createHereditaryKeepSuite(): TestSuite {
    const suite = new TestSuite('HereditaryKeep (GOV-09 世襲主城與背水一戰)');

    suite.test('主城不可攻陷，外圍領地可以', () => {
        assert.isFalse(canCaptureTerritory(HOME));
        assert.isTrue(canCaptureTerritory(OUTER_A));
    });

    suite.test('攻陷主城被拒絕，清單不變', () => {
        const result = attemptTerritoryLoss([HOME, OUTER_A], 'home');
        assert.isFalse(result.ok);
        assert.equals('home-city-protected', result.reason!);
        assert.equals(2, result.territories.length);
    });

    suite.test('外圍失守成功，主城保留', () => {
        const result = attemptTerritoryLoss([HOME, OUTER_A, OUTER_B], 'a');
        assert.isTrue(result.ok);
        assert.equals(2, result.territories.length);
        assert.isTrue(result.territories.some(t => t.id === 'home'));
    });

    suite.test('找不到的領地 ID 回報 territory-not-found', () => {
        const result = attemptTerritoryLoss([HOME], 'nowhere');
        assert.isFalse(result.ok);
        assert.equals('territory-not-found', result.reason!);
    });

    suite.test('外圍全失（只剩主城）：防禦 ×2、兵力生產 +50%', () => {
        const mods = lastStandModifiers([HOME]);
        assert.equals(2, mods.defenseMultiplier);
        assert.equals(0.5, mods.troopProductionBonus);
    });

    suite.test('還有外圍領地時沒有背水一戰加成', () => {
        const mods = lastStandModifiers([HOME, OUTER_A]);
        assert.equals(1, mods.defenseMultiplier);
        assert.equals(0, mods.troopProductionBonus);
    });

    suite.test('只剩外圍（主城不在清單）不觸發背水一戰', () => {
        const mods = lastStandModifiers([OUTER_A]);
        assert.equals(1, mods.defenseMultiplier);
    });

    suite.test('連續失守到只剩主城：最後一次失守後觸發背水一戰，且主城仍在', () => {
        let territories: KeepTerritory[] = [HOME, OUTER_A, OUTER_B];
        territories = attemptTerritoryLoss(territories, 'a').territories;
        assert.equals(1, lastStandModifiers(territories).defenseMultiplier);
        territories = attemptTerritoryLoss(territories, 'b').territories;
        assert.equals(2, lastStandModifiers(territories).defenseMultiplier);
        assert.isTrue(territories.some(t => t.isHome));
    });

    suite.test('不改輸入', () => {
        const input: KeepTerritory[] = [HOME, OUTER_A];
        attemptTerritoryLoss(input, 'a');
        assert.equals(2, input.length);
    });

    return suite;
}
