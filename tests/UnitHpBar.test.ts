/**
 * UnitHpBar.test.ts — 單位頭頂血條顯示判斷（主戰場UI規格書 §3.1，PROG-2-1874）
 *
 * Unity 對照：EditMode 測試 HP Bar 的 fillAmount 與 SetActive 條件。
 */
import { HP_CHIP_HOLD_SEC, hpChipOnChange, stepHpChip, unitHpBarState } from '../assets/scripts/battle/shared/UnitHpBar';
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

    suite.test('掉血殘影：先停住再追上，追上後消失（PROG-2-9412）', () => {
        let chip = hpChipOnChange(null, 1, 0.75);
        assert.equals(1, chip!.lag);
        chip = stepHpChip(chip, 0.75, HP_CHIP_HOLD_SEC - 0.01);
        assert.equals(1, chip!.lag);
        chip = stepHpChip(chip, 0.75, 0.05);
        assert.isTrue(chip!.lag < 1 && chip!.lag > 0.75);
        for (let i = 0; i < 100 && chip; i += 1) chip = stepHpChip(chip, 0.75, 1 / 60);
        assert.equals(null, chip);
    });

    suite.test('連續挨打殘影留在最早的位置；補血清掉殘影', () => {
        let chip = hpChipOnChange(null, 1, 0.8);
        chip = stepHpChip(chip, 0.8, 0.1);
        chip = hpChipOnChange(chip, 0.8, 0.5);
        assert.equals(1, chip!.lag);
        assert.equals(HP_CHIP_HOLD_SEC, chip!.hold);
        assert.equals(null, hpChipOnChange(chip, 0.5, 0.7));
        assert.equals(null, hpChipOnChange(null, 0.5, 0.5));
    });

    return suite;
}
