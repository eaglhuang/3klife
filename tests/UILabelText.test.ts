/**
 * UILabelText.test.ts — label 文字解析順序（PROG-2-1079）
 *
 * HTML 稿轉成的畫面帶 auto.* textKey 但字典沒收錄，畫面曾直接露出鍵名；查不到翻譯要退回原文。
 */
import { resolveLabelText } from '../assets/scripts/ui/core/UILabelText';
import { TestSuite, assert } from './TestRunner';

export function createUILabelTextSuite(): TestSuite {
    const suite = new TestSuite('UILabelText');

    suite.test('有翻譯用翻譯；缺翻譯退回原文；都沒有才露出鍵名', () => {
        const dict = { 'ui.back': '返回' };
        assert.equals('返回', resolveLabelText({ textKey: 'ui.back', text: 'Back' }, dict));
        assert.equals('三 國 志', resolveLabelText({ textKey: 'auto.lobby-main-screen.div-1', text: '三 國 志' }, dict));
        assert.equals('auto.x', resolveLabelText({ textKey: 'auto.x' }, dict));
        assert.equals('', resolveLabelText({ textKey: 'auto.x', text: '' }, dict), '原文是空字串也算原文');
    });

    suite.test('沒有 textKey：原文 > bind 佔位 > 空字串', () => {
        assert.equals('甲', resolveLabelText({ text: '甲', bind: 'a.b' }, {}));
        assert.equals('{a.b}', resolveLabelText({ bind: 'a.b' }, {}));
        assert.equals('', resolveLabelText({}, {}));
    });

    return suite;
}
