/**
 * LabelCharAtlasBudget.test.ts — 字元圖集預算：超出時改走 TTF，避免新字畫不出來（UI-2-0164）
 */
import { assert, TestSuite } from './TestRunner';
import { LabelCharAtlasBudget } from '../assets/scripts/ui/core/LabelCharAtlasBudget';

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
        const glyphs = [...'一二三四五六七八九十'];
        let accepted = 0;
        for (const char of glyphs) {
            if (budget.reserve(char, 200, 'noto|fff')) accepted += 1;
        }
        assert.equals(true, accepted > 0 && accepted < glyphs.length);
        assert.equals(true, budget.reserve(glyphs[0], 200, 'noto|fff'));
        assert.equals(false, budget.reserve(glyphs[glyphs.length - 1], 200, 'noto|fff'));
    });

    suite.test('不同樣式各佔一份字元；reset 後歸零', () => {
        const budget = new LabelCharAtlasBudget();
        let count = 0;
        while (budget.reserve('將', 200, `noto|${count}`)) count += 1;
        assert.equals(true, count > 1);
        assert.equals(false, budget.reserve('將', 200, 'noto|new'));
        budget.reset();
        assert.equals(true, budget.reserve('將', 200, 'noto|new'));
    });

    return suite;
}
