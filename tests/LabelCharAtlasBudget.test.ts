/**
 * LabelCharAtlasBudget.test.ts — 字元圖集預算：超出時改走 TTF，避免新字畫不出來（UI-2-0164）
 */
import { assert, TestSuite } from './TestRunner';
import { LabelCharAtlasBudget, isLetterSpacingVisible } from '../assets/scripts/ui/core/LabelCharAtlasBudget';

export function createLabelCharAtlasBudgetSuite(): TestSuite {
    const suite = new TestSuite('LabelCharAtlasBudget');

    suite.test('短文字可用 CHAR，空字串與長內文不行', () => {
        const budget = new LabelCharAtlasBudget();
        assert.equals(true, budget.reserve('將軍', 32, 'noto|fff'));
        assert.equals(false, budget.reserve('', 32, 'noto|fff'));
        assert.equals(false, budget.reserve('字'.repeat(13), 16, 'noto|fff'));
    });

    suite.test('預算用完後拒絕新字，已預約的字不再計費', () => {
        const budget = new LabelCharAtlasBudget();
        const glyphs = Array.from({ length: 200 }, (_, i) => String.fromCharCode(0x4e00 + i));
        let accepted = 0;
        for (const char of glyphs) {
            if (budget.reserve(char, 40, 'noto|fff')) accepted += 1;
        }
        assert.equals(true, accepted > 0 && accepted < glyphs.length);
        assert.equals(true, budget.reserve(glyphs[0], 40, 'noto|fff'));
        assert.equals(false, budget.reserve(glyphs[glyphs.length - 1], 40, 'noto|fff'));
    });

    suite.test('不同樣式各佔一份字元；reset 後歸零', () => {
        const budget = new LabelCharAtlasBudget();
        let count = 0;
        while (budget.reserve('將', 40, `noto|${count}`)) count += 1;
        assert.equals(true, count > 1);
        assert.equals(false, budget.reserve('將', 40, 'noto|new'));
        budget.reset();
        assert.equals(true, budget.reserve('將', 40, 'noto|new'));
    });

    suite.test('引擎擺不下後一律拒絕，換場景 reset 才恢復', () => {
        const budget = new LabelCharAtlasBudget();
        budget.exhaust();
        assert.equals(false, budget.reserve('將', 20, 'noto|fff'));
        budget.reset();
        assert.equals(true, budget.reserve('將', 20, 'noto|fff'));
    });

    suite.test('大字級不走 CHAR', () => {
        assert.equals(false, new LabelCharAtlasBudget().reserve('呂布', 120, 'noto|fff'));
    });

    suite.test('字距太小不走 CHAR；描邊讓字元佔更多預算', () => {
        assert.equals(false, isLetterSpacingVisible(0.96, 26));
        assert.equals(true, isLetterSpacingVisible(4, 26));
        const plain = new LabelCharAtlasBudget();
        const outlined = new LabelCharAtlasBudget();
        let a = 0, b = 0;
        while (plain.reserve('將', 40, `p|${a}`)) a += 1;
        while (outlined.reserve('將', 40, `o|${b}`, 40)) b += 1;
        assert.equals(true, b < a);
    });

    return suite;
}
