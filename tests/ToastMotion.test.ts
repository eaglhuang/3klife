/**
 * ToastMotion — Toast 停留與上浮消失參數（doc_ui_0001 §4.1，PROG-2-1894）
 *
 * Unity 對照：像測 DOTween 序列的參數表，不需要場景。
 */
import { assert, TestSuite } from './TestRunner';
import { TOAST_DEFAULT_HOLD_SEC, TOAST_RISE_PX, toastHoldSec } from '../assets/scripts/core/systems/ToastMotion';

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

    return suite;
}
