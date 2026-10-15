/**
 * FactorMaskWiring.test.ts — 因子遮罩接上結緣與詳情畫面的 headless 測試（PROG-2-0275）
 *
 * Unity 對照：等同 EditMode Test，驗證 Label 文字的資料來源，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { factorMaskLabels } from '../assets/scripts/core/systems/FactorMask';
import { formatGene } from '../assets/scripts/ui/components/general-detail/GeneralDetailFormatters';
import type { GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';

const blue: GeneralGeneConfig = { id: 'g-blue', type: 'blue', displayName: '藍因子甲', discoveryLevel: 1, isLocked: false };
const green: GeneralGeneConfig = { id: 'g-green', type: 'green', displayName: '綠因子乙', discoveryLevel: 20, isLocked: true };

export function createFactorMaskWiringSuite(): TestSuite {
    const suite = new TestSuite('FactorMaskWiring (PROG-2-0275 因子遮罩接線)');

    suite.test('結緣用的因子文字：低等級只看得到藍因子名稱，高發現等級後綠因子也顯示', () => {
        assert.equals(JSON.stringify(['藍因子甲', '??? (Lv21 解鎖)']), JSON.stringify(factorMaskLabels([blue, green], 1)));
        assert.equals(JSON.stringify(['藍因子甲', '綠因子乙']), JSON.stringify(factorMaskLabels([blue, green], 21)));
    });

    suite.test('詳情因子槽：傳入發現等級後，看不到的因子顯示遮罩並加鎖頭', () => {
        const text = formatGene(2, green, 5);
        assert.contains(text, '??? (Lv21 解鎖)');
        assert.contains(text, '🔒');
    });

    suite.test('詳情因子槽：未傳發現等級時維持舊行為，直接顯示名稱', () => {
        assert.contains(formatGene(1, blue), '藍因子甲');
    });

    return suite;
}
