/**
 * BlueFactorInheritance.test.ts — 藍色 3 星因子繼承機率（FORM-08，PROG-2-1275）headless 測試
 *
 * 鎖住：< 600 為 0；600 與 1099 為 6%；1100 為 10%（邊界歸較高段）；非有限值為 0。
 */
import { assert, TestSuite } from './TestRunner';
import { blueFactorInheritChance } from '../assets/scripts/core/systems/BlueFactorInheritance';

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

export function createBlueFactorInheritanceSuite(): TestSuite {
    const suite = new TestSuite('BlueFactorInheritance (藍色因子繼承機率 FORM-08 PROG-2-1275)');

    suite.test('數值低於 600 時機率為 0', () => {
        assert.isTrue(near(blueFactorInheritChance(599), 0));
        assert.isTrue(near(blueFactorInheritChance(0), 0));
    });

    suite.test('600 與 1099 的機率為 6%（600 歸中段）', () => {
        assert.isTrue(near(blueFactorInheritChance(600), 0.06));
        assert.isTrue(near(blueFactorInheritChance(1099), 0.06));
    });

    suite.test('1100 以上的機率為 10%（1100 歸高段）', () => {
        assert.isTrue(near(blueFactorInheritChance(1100), 0.1));
        assert.isTrue(near(blueFactorInheritChance(2000), 0.1));
    });

    suite.test('非有限值視為 0', () => {
        assert.isTrue(near(blueFactorInheritChance(Number.NaN), 0));
        assert.isTrue(near(blueFactorInheritChance(Number.POSITIVE_INFINITY), 0));
    });

    return suite;
}
