/**
 * MainTargetPanelText.test.ts — 主角區詞條列文字格式 headless 測試（BUI-05 cc 綁定 / PROG-2-1301）
 *
 * 鎖住：多個詞條以頓號合併；空陣列與全空白項目回傳佔位字；空字串項目略過。
 *
 * Unity 對照：像 Label 綁定前的字串組裝，確認空資料時 Label 顯示佔位而不是空白或錯字。
 */
import { assert, TestSuite } from './TestRunner';
import { formatTraitList, TRAIT_EMPTY_TEXT, TRAIT_SEPARATOR } from '../assets/scripts/core/systems/MainTargetPanelText';

export function createMainTargetPanelTextSuite(): TestSuite {
    const suite = new TestSuite('MainTargetPanelText (主角區詞條列文字 BUI-05 cc 綁定 / PROG-2-1301)');

    suite.test('多個詞條以頓號合併', () => {
        assert.equals('綠色、天命', formatTraitList(['綠色', '天命']));
        assert.equals(TRAIT_SEPARATOR, '、');
    });

    suite.test('空陣列回傳佔位字', () => {
        assert.equals(TRAIT_EMPTY_TEXT, formatTraitList([]));
    });

    suite.test('空字串與只有空白的項目略過，全部略過時回傳佔位字', () => {
        assert.equals('天命', formatTraitList(['', '  ', '天命']));
        assert.equals(TRAIT_EMPTY_TEXT, formatTraitList(['', '   ']));
    });

    suite.test('可指定分隔符與佔位字', () => {
        assert.equals('a / b', formatTraitList(['a', 'b'], ' / '));
        assert.equals('無', formatTraitList([], '、', '無'));
    });

    return suite;
}
