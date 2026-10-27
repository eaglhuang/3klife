/**
 * FatigueFailureRate.test.ts — 疲勞度與失敗率曲線（FORM-02，PROG-2-1268）headless 測試
 *
 * 鎖住：安全區 0%；風險區端點 5%～35%；危險區端點 40%～99%；曲線隨體力下降單調不減；
 * 輸入超出 0..1 與非有限值時夾住、不丟錯。
 */
import { assert, TestSuite } from './TestRunner';
import { fatigueFailureRate } from '../assets/scripts/core/systems/FatigueFailureRate';

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

export function createFatigueFailureRateSuite(): TestSuite {
    const suite = new TestSuite('FatigueFailureRate (疲勞失敗率 FORM-02 PROG-2-1268)');

    suite.test('體力 ≥ 70% 失敗率為 0', () => {
        assert.isTrue(near(fatigueFailureRate(1), 0));
        assert.isTrue(near(fatigueFailureRate(0.7), 0));
    });

    suite.test('風險區 70% 邊界為 5%，30% 邊界為 35%', () => {
        assert.isTrue(near(fatigueFailureRate(0.7 - 1e-12), 0.05));
        assert.isTrue(near(fatigueFailureRate(0.3), 0.35));
    });

    suite.test('危險區 30% 以下從 40% 爬升到 0% 時的 99%', () => {
        assert.isTrue(near(fatigueFailureRate(0.3 - 1e-12), 0.4));
        assert.isTrue(near(fatigueFailureRate(0), 0.99));
    });

    suite.test('曲線隨體力下降單調不減', () => {
        let prev = -1;
        for (let i = 100; i >= 0; i--) {
            const rate = fatigueFailureRate(i / 100);
            assert.isTrue(rate >= prev);
            prev = rate;
        }
    });

    suite.test('超出範圍與非有限值會夾住，不丟錯', () => {
        assert.isTrue(near(fatigueFailureRate(-5), 0.99));
        assert.isTrue(near(fatigueFailureRate(5), 0));
        assert.isTrue(near(fatigueFailureRate(Number.NaN), 0));
    });

    return suite;
}
