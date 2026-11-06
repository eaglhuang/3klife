/**
 * UltimateRingView — 奧義大圓 SP 環顯示狀態（doc_ui_0001 §2.4，PROG-2-1892）
 *
 * 覆蓋：未滿暗色、滿格亮色、夾限與無效輸入保護。
 *
 * Unity 對照：像測 Image(Filled) 的 ViewModel，不需要場景或 UI。
 */
import { assert, TestSuite } from './TestRunner';
import {
    ULTIMATE_RING_CHARGING_COLOR, ULTIMATE_RING_READY_COLOR, ultimateRingState,
} from '../assets/scripts/core/systems/UltimateRingView';

export function createUltimateRingViewSuite(): TestSuite {
    const suite = new TestSuite('UltimateRingView (奧義大圓 SP 環 doc_ui_0001 §2.4)');

    suite.test('SP 未滿：暗色 #3A8FD9、顯示百分比', () => {
        const s = ultimateRingState(72, 100);
        assert.equals(false, s.ready);
        assert.equals(72, s.pct);
        assert.equals(ULTIMATE_RING_CHARGING_COLOR, s.color);
    });

    suite.test('SP 滿：亮色 #7ec8f7、可發動', () => {
        const s = ultimateRingState(150, 150);
        assert.equals(true, s.ready);
        assert.equals(1, s.ratio);
        assert.equals(ULTIMATE_RING_READY_COLOR, s.color);
        assert.equals(0x7e, ULTIMATE_RING_READY_COLOR[0]);
    });

    suite.test('超過上限夾在 100%；上限無效以 100 計；SP 為 NaN 視為 0', () => {
        assert.equals(100, ultimateRingState(300, 100).pct);
        assert.equals(50, ultimateRingState(50, 0).pct);
        assert.equals(0, ultimateRingState(NaN, 100).pct);
        assert.equals(0, ultimateRingState(-20, 100).ratio);
    });

    return suite;
}
