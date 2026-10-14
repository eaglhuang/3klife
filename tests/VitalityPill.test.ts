/**
 * 補元散的精力回復（VIT-05，PROG-2-0443）
 *
 * 鎖住：補元散 +50、高級補元散 +100；回復後不超過精力上限；已滿時回復為 0；無效輸入保護。
 * 道具扣除與存檔不在本卡範圍。
 */
import { assert, TestSuite } from './TestRunner';
import { VITALITY_PILL_RESTORE, applyVitalityPill } from '../assets/scripts/core/systems/VitalityPill';

export function createVitalityPillSuite(): TestSuite {
    const suite = new TestSuite('VitalityPill (補元散精力回復 VIT-05)');

    suite.test('回復量：補元散 +50、高級補元散 +100', () => {
        assert.equals(50, VITALITY_PILL_RESTORE.vitalityPill);
        assert.equals(100, VITALITY_PILL_RESTORE.premiumVitalityPill);
    });

    suite.test('一般回復：未超過上限時照回復量加', () => {
        assert.equals(70, applyVitalityPill(20, 120, 'vitalityPill'));
        assert.equals(120, applyVitalityPill(20, 120, 'premiumVitalityPill'));
    });

    suite.test('不超過上限：接近上限時夾在上限', () => {
        assert.equals(120, applyVitalityPill(90, 120, 'vitalityPill'));
        assert.equals(100, applyVitalityPill(10, 100, 'premiumVitalityPill'));
    });

    suite.test('已滿時回復為 0，不超過上限', () => {
        assert.equals(120, applyVitalityPill(120, 120, 'vitalityPill'));
    });

    suite.test('無效輸入保護：精力視為 0、上限無效視為 0', () => {
        assert.equals(50, applyVitalityPill(Number.NaN, 120, 'vitalityPill'));
        assert.equals(0, applyVitalityPill(10, Number.NaN, 'vitalityPill'));
        assert.equals(0, applyVitalityPill(10, -5, 'premiumVitalityPill'));
    });

    return suite;
}
