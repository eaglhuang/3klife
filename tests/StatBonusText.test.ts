/**
 * StatBonusText.test.ts — 單位頭頂數值帶出 Buff 增減量（主戰場UI規格書 §3.1，PROG-2-1870）
 *
 * Unity 對照：純函式 EditMode 測試，不需場景。
 */
import { statBonusTone, statWithBonusText } from '../assets/scripts/battle/shared/StatBonusText';
import { TestSuite, assert } from './TestRunner';

export function createStatBonusTextSuite(): TestSuite {
    const suite = new TestSuite('StatBonusText (頭頂數值增減量 PROG-2-1870)');

    suite.test('規格例：35 (+10)；無變化只顯示數值', () => {
        assert.equals('35 (+10)', statWithBonusText(35, 10));
        assert.equals('35', statWithBonusText(35, 0));
    });

    suite.test('減益顯示負號；小數四捨五入；可加前綴', () => {
        assert.equals('20 (-5)', statWithBonusText(20, -5));
        assert.equals('攻 40 (+3)', statWithBonusText(40, 2.6, '攻 '));
        assert.equals('命 12', statWithBonusText(12, 0.4, '命 '));
    });

    suite.test('顏色分級：增益 up、減益 down、無變化 normal', () => {
        assert.equals('up', statBonusTone(10));
        assert.equals('down', statBonusTone(-1));
        assert.equals('normal', statBonusTone(0.2));
    });

    return suite;
}
