/**
 * UnitHpBar.test.ts — 單位頭頂血條顯示判斷（主戰場UI規格書 §3.1，PROG-2-1874）
 *
 * Unity 對照：EditMode 測試 HP Bar 的 fillAmount 與 SetActive 條件。
 */
import { unitHpBarState } from '../assets/scripts/battle/shared/UnitHpBar';
import { TestSuite, assert } from './TestRunner';

export function createUnitHpBarSuite(): TestSuite {
    const suite = new TestSuite('UnitHpBar (頭頂血條 PROG-2-1874)');

    suite.test('滿血不顯示', () => {
        const s = unitHpBarState(120, 120, true);
        assert.equals(false, s.visible);
        assert.equals(1, s.ratio);
        assert.equals('player', s.tone);
    });

    suite.test('受傷顯示，比例正確；敵方為 enemy 色', () => {
        const s = unitHpBarState(30, 120, false);
        assert.equals(true, s.visible);
        assert.equals(0.25, s.ratio);
        assert.equals('enemy', s.tone);
    });

    suite.test('Buff 加血後超過上限仍視為滿血；死亡或上限異常不顯示', () => {
        assert.equals(false, unitHpBarState(150, 120, true).visible);
        assert.equals(false, unitHpBarState(0, 120, true).visible);
        assert.equals(false, unitHpBarState(10, 0, true).visible);
        assert.equals(false, unitHpBarState(Number.NaN, 120, true).visible);
    });

    return suite;
}
