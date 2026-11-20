/**
 * VitalityBarView — 戰場體力條顯示數值（FORM-11）
 *
 * 覆蓋：填充比例的夾限與無效輸入保護、歸零時底板變灰、精力有值時不變灰。
 *
 * Unity 對照：像測 Slider 的 fillAmount 計算，不需要場景或 UI。
 */
import { assert, TestSuite } from './TestRunner';
import { isVitalityBarGrayed, vitalityBarRatio, vitalityDeltaText, vitalityHudBarView, VITALITY_RING_COLORS } from '../assets/scripts/core/systems/VitalityBarView';

export function createVitalityBarViewSuite(): TestSuite {
    const suite = new TestSuite('VitalityBarView (戰場體力條顯示數值 FORM-11)');

    suite.test('填充比例：精力佔上限的比例，例如 60/120 為 0.5', () => {
        assert.equals(0.5, vitalityBarRatio(60, 120));
        assert.equals(1, vitalityBarRatio(120, 120));
    });

    suite.test('填充比例夾限：超過上限為 1，負數為 0', () => {
        assert.equals(1, vitalityBarRatio(150, 120));
        assert.equals(0, vitalityBarRatio(-10, 120));
    });

    suite.test('無效輸入：上限 ≤0 或非有限數、精力為 NaN 時比例為 0', () => {
        assert.equals(0, vitalityBarRatio(50, 0));
        assert.equals(0, vitalityBarRatio(50, Number.NaN));
        assert.equals(0, vitalityBarRatio(Number.NaN, 120));
    });

    suite.test('變灰：精力歸零變灰；有精力時不變灰', () => {
        assert.isTrue(isVitalityBarGrayed(0));
        assert.isTrue(isVitalityBarGrayed(-5));
        assert.isFalse(isVitalityBarGrayed(1));
        assert.isFalse(isVitalityBarGrayed(120));
    });

    suite.test('無效精力視為歸零並變灰（不猜測）', () => {
        assert.isTrue(isVitalityBarGrayed(Number.NaN));
    });

    suite.test('HUD 精力條三段：>50% 紫、10%~50% 琥珀、<10% 灰（門檻同武將壽命系統）', () => {
        assert.equals('high', vitalityHudBarView(51, 100).band);
        assert.equals('mid', vitalityHudBarView(50, 100).band);
        assert.equals('mid', vitalityHudBarView(10, 100).band);
        assert.equals('exhausted', vitalityHudBarView(9, 100).band);
        assert.equals(VITALITY_RING_COLORS.mid, vitalityHudBarView(30, 100).color);
    });

    suite.test('HUD 精力條文字為百分比，歸零時底板變灰', () => {
        const v = vitalityHudBarView(72, 100);
        assert.equals('72%', v.text);
        assert.isFalse(v.grayed);
        assert.isTrue(vitalityHudBarView(0, 100).grayed);
    });

    suite.test('精力變化跳字：扣減帶負號、回復帶正號、無變化或無效不演出', () => {
        assert.equals('-30', vitalityDeltaText(100, 70));
        assert.equals('+20', vitalityDeltaText(60, 80));
        assert.equals('', vitalityDeltaText(50, 50));
        assert.equals('', vitalityDeltaText(Number.NaN, 50));
    });

    return suite;
}
