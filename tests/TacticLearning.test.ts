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
    learnTacticInto,
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


    suite.test('學戰法：TP 達門檻、未學過、槽位未滿時寫入新清單', () => {
        const check = learnTacticInto(['TAC_A'], 'TAC_B', 30, 60, 30);
        assert.isTrue(check.ok);
        assert.equals(JSON.stringify(['TAC_A', 'TAC_B']), JSON.stringify(check.learned));
    });

    suite.test('學戰法：TP 不足（59 < 60）以 TP_SHORT 擋下，清單不變', () => {
        const check = learnTacticInto([], 'TAC_A', 30, 59, 30);
        assert.isFalse(check.ok);
        assert.equals('TP_SHORT', check.blocked!);
        assert.equals('[]', JSON.stringify(check.learned));
    });

    suite.test('學戰法：已學過的戰法以 ALREADY_LEARNED 擋下', () => {
        const check = learnTacticInto(['TAC_A'], 'TAC_A', 30, 999, 30);
        assert.equals('ALREADY_LEARNED', check.blocked!);
    });

    suite.test('學戰法：智力 29（1 槽）已學一招時以 SLOT_FULL 擋下；智力 30 起才有第 2 槽', () => {
        assert.equals('SLOT_FULL', learnTacticInto(['TAC_A'], 'TAC_B', 29, 999, 30).blocked!);
        assert.isTrue(learnTacticInto(['TAC_A'], 'TAC_B', 30, 999, 30).ok);
    });

    suite.test('學戰法：空 id 以 INVALID_TACTIC 擋下', () => {
        assert.equals('INVALID_TACTIC', learnTacticInto([], '', 90, 999, 30).blocked!);
    });

    return suite;
}
