/**
 * ToastMotion — Toast 停留與上浮消失參數（doc_ui_0001 §4.1，PROG-2-1894）
 *
 * Unity 對照：像測 DOTween 序列的參數表，不需要場景。
 */
import { assert, TestSuite } from './TestRunner';
import { TOAST_DEFAULT_HOLD_SEC, TOAST_MODAL_BOTTOM_MARGIN_PX, TOAST_RISE_PX, keepBracketsTogether, toastCenterY, toastHoldSec } from '../assets/scripts/core/systems/ToastMotion';

export function createToastMotionSuite(): TestSuite {
    const suite = new TestSuite('ToastMotion (Toast 上浮消失 doc_ui_0001 §4.1)');

    suite.test('未指定時長時停留 2 秒（規格 §4.1）', () => {
        assert.equals(2, TOAST_DEFAULT_HOLD_SEC);
        assert.equals(2, toastHoldSec());
        assert.equals(2, toastHoldSec(NaN));
    });

    suite.test('指定時長照用，但不少於 0.2 秒', () => {
        assert.equals(1.5, toastHoldSec(1.5));
        assert.equals(0.2, toastHoldSec(0));
    });

    suite.test('消失時向上飄', () => {
        assert.isTrue(TOAST_RISE_PX > 0);
    });

    suite.test('沒彈窗時留在設計稿位置；有彈窗改貼底緣，不蓋標題（PROG-2-9994）', () => {
        assert.equals(420, toastCenterY(420, false, 1080, 112));
        assert.equals(-540 + 56 + TOAST_MODAL_BOTTOM_MARGIN_PX, toastCenterY(420, true, 1080, 112));
        assert.isTrue(toastCenterY(420, true, 1080, 112) < 0);
    });

    suite.test('容器高度無效時，即使有彈窗也退回設計稿位置', () => {
        assert.equals(420, toastCenterY(420, true, 0, 112));
        assert.equals(420, toastCenterY(420, true, NaN, 112));
    });

    suite.test('彈窗開著的提示條不蓋住結緣卡底部按鈕列（卡 880 高置中於 1080，按鈕列離卡底 28px 以上）', () => {
        const toastTop = toastCenterY(420, true, 1080, 112) + 56;
        const cardBottom = -440;
        const buttonRowTop = cardBottom + 28 + 48;
        assert.isTrue(toastTop <= cardBottom + 16, '提示條頂緣最多只能侵入卡片底緣 16px（空白邊）');
        assert.isTrue(toastTop < buttonRowTop);
    });

    suite.test('括號詞不被換行拆開：【才思出眾】會整個移到下一行行首', () => {
        // 一行 10 格：前面 8 格＋括號詞 6 格放不下 → 括號詞前補換行
        assert.equals('一二三四五六七八\n【才思出眾】', keepBracketsTogether('一二三四五六七八【才思出眾】', 10));
        // 放得下就不動
        assert.equals('一二【才思出眾】', keepBracketsTogether('一二【才思出眾】', 10));
        // 開頭就是括號詞不補換行；括號詞比一行還長時不處理
        assert.equals('【才思出眾】', keepBracketsTogether('【才思出眾】', 10));
        assert.equals('一【超過一行寬度的括號詞】', keepBracketsTogether('一【超過一行寬度的括號詞】', 4));
        // 沒括號、無效寬度原樣回傳；已有換行會重算行首
        assert.equals('甲乙丙', keepBracketsTogether('甲乙丙', 2));
        assert.equals('甲乙丙【丁】', keepBracketsTogether('甲乙丙【丁】', 0));
        assert.equals('甲乙丙\n【丁戊己】', keepBracketsTogether('甲乙丙\n【丁戊己】', 8));
    });

    suite.test('月旦評放榜實句：括號詞不落在行尾或行中被拆', () => {
        const line = '滾滾長江東逝水，且看今歲【月旦評】天下俊彥榜！關羽【才思出眾】、張飛【武勇過人】，皆一時之選也！';
        for (const perLine of [18, 20, 22, 24, 26]) {
            const lines = keepBracketsTogether(line, perLine).split('\n');
            for (const row of lines) {
                const open = (row.match(/【/g) ?? []).length;
                const close = (row.match(/】/g) ?? []).length;
                assert.equals(open, close, `每行括號成對（${perLine}）：${row}`);
            }
        }
    });

    return suite;
}
