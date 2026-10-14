/**
 * FactorAwakeningLuk.test.ts — LUK 覺醒速度修正（PROG-2-0509，headless）
 *
 * Unity 對照：EditMode Test 直接算機率數值，不開場景、不跑真實隨機。
 */
import { TestSuite, assert } from './TestRunner';
import {
    awakeningSpeedModifier,
    nurtureAwakeningChance,
    nurturePeekChance,
    NURTURE_PEEK_BASE_CHANCE,
} from '../assets/scripts/core/systems/FactorAwakening';

function near(expected: number, actual: number): boolean {
    return Math.abs(expected - actual) < 1e-9;
}

export function createFactorAwakeningLukSuite(): TestSuite {
    const suite = new TestSuite('FactorAwakeningLuk (LUK 覺醒速度修正 PROG-2-0509)');

    suite.test('覺醒速度 = 1 + LUK/300：LUK=90 → ×1.3，LUK=0 → ×1', () => {
        assert.isTrue(near(1.3, awakeningSpeedModifier(90)));
        assert.isTrue(near(1, awakeningSpeedModifier(0)));
    });

    suite.test('非有限值與負數視為 LUK 0', () => {
        assert.isTrue(near(1, awakeningSpeedModifier(NaN)));
        assert.isTrue(near(1, awakeningSpeedModifier(-30)));
        assert.isTrue(near(1, awakeningSpeedModifier(Infinity)));
    });

    suite.test('培育覺醒機率 = 窺探基礎率 × 覺醒速度，LUK 缺省時與舊版相同', () => {
        assert.isTrue(near(nurturePeekChance(0), nurtureAwakeningChance(0)), '缺省 LUK 等於舊機率');
        assert.isTrue(near(NURTURE_PEEK_BASE_CHANCE, nurtureAwakeningChance(0, 0)));
        assert.isTrue(near(nurturePeekChance(2) * 1.3, nurtureAwakeningChance(2, 90)), '高 LUK 按倍率提升');
    });

    suite.test('機率封頂 1，不會超過', () => {
        assert.isTrue(nurtureAwakeningChance(5, 100000) <= 1);
        assert.isTrue(near(1, nurtureAwakeningChance(5, 1e9)));
    });

    return suite;
}
