/**
 * CountdownIconView.test.ts — 趕路倒數常駐圖示文字與按鈕狀態（OPEN-11，PROG-2-0468）
 */
import { assert, TestSuite } from './TestRunner';
import { createCountdown } from '../assets/scripts/core/systems/CountdownManager';
import { buildCountdownIconFlowView, buildCountdownIconView, formatRemaining } from '../assets/scripts/core/systems/CountdownIconView';

export function createCountdownIconViewSuite(): TestSuite {
    const suite = new TestSuite('CountdownIconView (OPEN-11 趕路倒數圖示)');

    suite.test('倒數格式：不足一小時為 mm:ss，一小時以上為 h:mm:ss，無效值為 00:00', () => {
        assert.equals('05:00', formatRemaining(5 * 60 * 1000));
        assert.equals('00:01', formatRemaining(500));
        assert.equals('1:00:00', formatRemaining(3600 * 1000));
        assert.equals('00:00', formatRemaining(-1));
        assert.equals('00:00', formatRemaining(Number.NaN));
    });

    suite.test('趕路中顯示圖示與剩餘時間；可加速時加速鈕可按', () => {
        const state = createCountdown('zhang-fei', 0, 120 * 1000, true);
        const view = buildCountdownIconView(state, 30 * 1000);
        assert.isTrue(view.visible);
        assert.equals('01:30', view.label);
        assert.isTrue(view.rushEnabled);
    });

    suite.test('已到達或加速完成：圖示隱藏，加速鈕不可按', () => {
        const state = createCountdown('zhang-fei', 0, 120 * 1000, true);
        const arrived = buildCountdownIconView(state, 120 * 1000);
        assert.isFalse(arrived.visible);
        assert.equals('', arrived.label);
        assert.isFalse(arrived.rushEnabled);
        const rushed = { ...state, accelerated: true };
        assert.isFalse(buildCountdownIconView(rushed, 1000).visible);
    });

    suite.test('不可加速的倒數：圖示顯示但加速鈕不可按', () => {
        const state = createCountdown('guan-yu', 0, 60 * 1000, false);
        const view = buildCountdownIconView(state, 0);
        assert.isTrue(view.visible);
        assert.isFalse(view.rushEnabled);
    });

    suite.test('HUD flow view：沒有倒數時隱藏；趕路中 key 為 countdownIconLabel 並帶文字', () => {
        const hidden = buildCountdownIconFlowView(null, 0);
        assert.isFalse(hidden.actives.countdownIconLabel);
        assert.equals('', hidden.texts.countdownIconLabel);
        const state = createCountdown('zhang-fei', 0, 90 * 1000, true);
        const shown = buildCountdownIconFlowView(state, 0);
        assert.isTrue(shown.actives.countdownIconLabel);
        assert.equals('01:30', shown.texts.countdownIconLabel);
    });

    return suite;
}
