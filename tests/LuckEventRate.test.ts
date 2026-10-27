/**
 * LuckEventRate.test.ts — 運氣影響事件觸發率（運氣系統 E-5，PROG-2-1349）
 */
import { assert, TestSuite } from './TestRunner';
import { luckEventRate } from '../assets/scripts/core/systems/LuckEventRate';
import { NURTURE_AFFECTION_CHANCE, NURTURE_INJURY_CHANCE, rollNurtureRoundEvents } from '../assets/scripts/core/systems/NurtureEvents';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

export function createLuckEventRateSuite(): TestSuite {
    const suite = new TestSuite('LuckEventRate (運氣事件觸發率 PROG-2-1349)');

    suite.test('公式：LUK 0 不變、LUK 100 +50%、負值與非有限數視為 0', () => {
        assert.isTrue(near(0.1, luckEventRate(0.1, 0)));
        assert.isTrue(near(0.15, luckEventRate(0.1, 100)));
        assert.isTrue(near(0.1, luckEventRate(0.1, -50)));
        assert.isTrue(near(0.1, luckEventRate(0.1, Number.NaN)));
    });

    suite.test('結果夾在 0~1', () => {
        assert.equals(1, luckEventRate(0.9, 100));
        assert.equals(0, luckEventRate(-0.2, 100));
    });

    suite.test('培育好感：介於基礎與修正後機率之間的骰值，只有高 LUK 會觸發', () => {
        const roll = (NURTURE_AFFECTION_CHANCE + luckEventRate(NURTURE_AFFECTION_CHANCE, 100)) / 2;
        const seq = () => { const v = [0.99, roll]; let i = 0; return () => v[i++]; };
        assert.isFalse(rollNurtureRoundEvents(true, seq()).affection, '預設 LUK 0 不觸發');
        assert.isTrue(rollNurtureRoundEvents(true, seq(), 100).affection, 'LUK 100 觸發');
    });

    suite.test('受傷機率不受 LUK 影響', () => {
        const justAbove = NURTURE_INJURY_CHANCE + 1e-6;
        assert.isFalse(rollNurtureRoundEvents(true, () => justAbove, 100).injured);
        assert.isTrue(rollNurtureRoundEvents(true, () => NURTURE_INJURY_CHANCE - 1e-6, 100).injured);
    });

    return suite;
}
