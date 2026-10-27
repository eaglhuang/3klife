/**
 * BloodlineInfusion.test.ts — 血脈灌注（SAME-05，PROG-2-1073）headless 測試
 *
 * 鎖住：血脈等級與虎符層級各 +1、英靈濃度加上重複卡值、缺欄位視為 0、非法數值當 0、不改傳入物件。
 */
import { assert, TestSuite } from './TestRunner';
import { applyBloodlineInfusion } from '../assets/scripts/core/systems/BloodlineInfusion';

export function createBloodlineInfusionSuite(): TestSuite {
    const suite = new TestSuite('BloodlineInfusion (血脈灌注 SAME-05 PROG-2-1073)');

    suite.test('灌注後血脈等級與虎符層級各 +1，英靈濃度加上重複卡值', () => {
        const result = applyBloodlineInfusion({ bloodlineLevel: 3, spiritPower: 40, linkedTallyLevel: 2 }, 15);
        assert.equals(4, result.bloodlineLevel);
        assert.equals(55, result.spiritPower);
        assert.equals(3, result.linkedTallyLevel);
    });

    suite.test('缺欄位視為 0；負數與非有限數當 0', () => {
        const result = applyBloodlineInfusion({ bloodlineLevel: -2, spiritPower: Number.NaN }, Number.POSITIVE_INFINITY);
        assert.equals(1, result.bloodlineLevel);
        assert.equals(0, result.spiritPower);
        assert.equals(1, result.linkedTallyLevel);
    });

    suite.test('回傳新物件，不改傳入的英靈卡資料', () => {
        const card = { bloodlineLevel: 1, spiritPower: 5, linkedTallyLevel: 1 };
        const result = applyBloodlineInfusion(card, 5);
        assert.equals(1, card.bloodlineLevel);
        assert.equals(5, card.spiritPower);
        assert.equals(1, card.linkedTallyLevel);
        assert.equals(2, result.bloodlineLevel);
    });

    return suite;
}
