/**
 * FoodLabelText — 戰場頂部糧草標籤（doc_ui_0003 Zone 1 v3-4，PROG-2-1896）
 *
 * Unity 對照：像測 string.Format("{0:N0}") 的包裝，不需要場景。
 */
import { assert, TestSuite } from './TestRunner';
import { foodLabelText, formatThousands } from '../assets/scripts/core/systems/FoodLabelText';

export function createFoodLabelTextSuite(): TestSuite {
    const suite = new TestSuite('FoodLabelText (糧草標籤千分位 doc_ui_0003 v3-4)');

    suite.test('規格範例：🌾 糧草 8,500 / 12,000', () => {
        assert.equals('🌾 糧草 8,500 / 12,000', foodLabelText(8500, 12000));
    });

    suite.test('千分位：三位以內不加逗號，百萬加兩個', () => {
        assert.equals('0', formatThousands(0));
        assert.equals('999', formatThousands(999));
        assert.equals('1,000', formatThousands(1000));
        assert.equals('1,234,567', formatThousands(1234567));
    });

    suite.test('小數捨去；負數與 NaN 顯示 0', () => {
        assert.equals('1,999', formatThousands(1999.9));
        assert.equals('0', formatThousands(-5));
        assert.equals('0', formatThousands(NaN));
    });

    return suite;
}
