/**
 * TacticLearning.test.ts — 戰法學習 TP 門檻（PROG-2-0534）headless 測試
 *
 * 規則：門檻 = TP 消耗 × 2；持有 TP 達門檻才可學。
 * Unity 對照：像 EditMode 測試，直接驗證 CanLearn 的邊界值。
 */
import { TestSuite, assert } from './TestRunner';
import {
    TACTIC_LEARN_THRESHOLD_MULTIPLIER,
    canLearnTactic,
    tacticLearnThreshold,
} from '../assets/scripts/core/systems/TacticLearning';

export function createTacticLearningSuite(): TestSuite {
    const suite = new TestSuite('TacticLearning (戰法學習 TP 門檻 PROG-2-0534)');

    suite.test('門檻倍率為 2，門檻 = TP 消耗 × 2', () => {
        assert.equals(2, TACTIC_LEARN_THRESHOLD_MULTIPLIER);
        assert.equals(60, tacticLearnThreshold(30));
        assert.equals(100, tacticLearnThreshold(50));
    });

    suite.test('持有 TP 剛好等於門檻時可學習', () => {
        assert.isTrue(canLearnTactic(60, 30));
    });

    suite.test('持有 TP 高於門檻可學習', () => {
        assert.isTrue(canLearnTactic(61, 30));
        assert.isTrue(canLearnTactic(500, 30));
    });

    suite.test('持有 TP 不足門檻（差 1）不可學習', () => {
        assert.isFalse(canLearnTactic(59, 30));
        assert.isFalse(canLearnTactic(0, 30));
    });

    suite.test('TP 消耗為 0 或負值時門檻為 0，任何非負持有值皆可學', () => {
        assert.equals(0, tacticLearnThreshold(0));
        assert.equals(0, tacticLearnThreshold(-10));
        assert.isTrue(canLearnTactic(0, 0));
        assert.isTrue(canLearnTactic(5, -10));
    });

    suite.test('非有限數輸入：持有 TP 為 NaN、負數或 Infinity 皆不可學', () => {
        assert.isFalse(canLearnTactic(NaN, 30));
        assert.isFalse(canLearnTactic(-1, 30));
        assert.isFalse(canLearnTactic(Infinity, 30));
        assert.equals(0, tacticLearnThreshold(NaN));
        assert.equals(0, tacticLearnThreshold(Infinity));
    });

    return suite;
}
