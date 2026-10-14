/**
 * FemaleConceptionMod — 母體來源對受孕率的倍率（FEM-02，PROG-2-0246）
 */
import { assert, TestSuite } from './TestRunner';
import { applyConceptionMod, CONCEPTION_RATE_CAP } from '../assets/scripts/core/systems/BreedingSystem';
import { createFemaleSource, femaleSourceConceptionMod } from '../assets/scripts/core/systems/FemaleSource';

export function createFemaleConceptionModSuite(): TestSuite {
    const suite = new TestSuite('FemaleConceptionMod (母體來源受孕率 FEM-02)');

    suite.test('來源倍率：SSR 轉蛋 ×1.2、R 地下城 ×0.8、安胎藥 ×1.5、其餘 ×1', () => {
        assert.equals(1.2, femaleSourceConceptionMod(createFemaleSource('GACHA', 'SSR', 1)));
        assert.equals(0.8, femaleSourceConceptionMod(createFemaleSource('DUNGEON', 'R', 1)));
        assert.equals(1, femaleSourceConceptionMod(createFemaleSource('GACHA', 'SR', 1)));
        assert.equals(1, femaleSourceConceptionMod(createFemaleSource('CAPTIVE', 'SR', 1)));
        assert.equals(1, femaleSourceConceptionMod(null));
        assert.equals(1.5, femaleSourceConceptionMod(null, { fetalMedicine: true }));
        assert.equals(1.2 * 1.5, femaleSourceConceptionMod(createFemaleSource('GACHA', 'SSR', 1), { fetalMedicine: true }));
    });

    suite.test('套用倍率：仍不超過上限 0.95；倍率不合法時視為 1', () => {
        assert.equals(0.95, applyConceptionMod(0.9, 1.5));
        assert.equals(CONCEPTION_RATE_CAP, applyConceptionMod(0.8, 1.2));
        assert.equals(0.4, applyConceptionMod(0.4, 1));
        assert.equals(0.4, applyConceptionMod(0.4, Number.NaN));
        assert.equals(0.4, applyConceptionMod(0.4, -2));
    });

    return suite;
}
