/**
 * TacticTriggerRate.test.ts — 戰法發動率 INT 檢核（FORM-05，PROG-2-1263）headless 測試
 *
 * 鎖住：規格範例 INT300 ≈ 70%、INT1200 ≈ 92.5%；Success_Bonus 加在基礎值上；
 * 結果夾在 0..1；INT 非正或非有限數時為 0。
 */
import { assert, TestSuite } from './TestRunner';
import { tacticTriggerRate } from '../assets/scripts/core/systems/TacticTriggerRate';

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

export function createTacticTriggerRateSuite(): TestSuite {
    const suite = new TestSuite('TacticTriggerRate (戰法發動率 INT 檢核 FORM-05 PROG-2-1263)');

    suite.test('規格範例：INT300 ≈ 70%，INT1200 ≈ 92.5%', () => {
        assert.isTrue(near(tacticTriggerRate(300), 0.7));
        assert.isTrue(near(tacticTriggerRate(1200), 0.925));
    });

    suite.test('Success_Bonus 加在基礎值上，並夾在 0..1', () => {
        assert.isTrue(near(tacticTriggerRate(300, 0.1), 0.8));
        assert.equals(1, tacticTriggerRate(1200, 0.5));
        assert.equals(0, tacticTriggerRate(1, 0));
    });

    suite.test('INT 非正或非有限數時發動率為 0', () => {
        assert.equals(0, tacticTriggerRate(0));
        assert.equals(0, tacticTriggerRate(-10));
        assert.equals(0, tacticTriggerRate(Number.NaN));
    });

    return suite;
}
