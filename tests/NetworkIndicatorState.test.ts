/**
 * NetworkIndicatorState.test.ts — 網路狀態指示器狀態對應（UI技術規格書 doc_ui_0049，PROG-2-1881）
 *
 * Unity 對照：EditMode 測試 NetworkStatusView 的 status → 外觀對應。
 */
import { networkIndicatorView } from '../assets/scripts/ui/core/NetworkIndicatorState';
import { TestSuite, assert } from './TestRunner';

export function createNetworkIndicatorStateSuite(): TestSuite {
    const suite = new TestSuite('NetworkIndicatorState (網路指示器 PROG-2-1881)');

    suite.test('斷線：紅燈常駐、不轉圈、不自動淡出', () => {
        const v = networkIndicatorView('offline');
        assert.equals(255, v.color![0]);
        assert.equals(true, v.visible);
        assert.equals(false, v.spin);
        assert.equals(null, v.hideAfterSec);
    });

    suite.test('同步中：黃燈顯示並轉圈、不自動淡出', () => {
        const v = networkIndicatorView('syncing');
        assert.equals(true, v.visible);
        assert.equals(true, v.spin);
        assert.equals(null, v.hideAfterSec);
    });

    suite.test('恢復連線與同步完成：綠燈 1 秒後淡出，不強制顯示', () => {
        for (const ev of ['online', 'sync-complete'] as const) {
            const v = networkIndicatorView(ev);
            assert.equals(255, v.color![1]);
            assert.equals(true, v.visible === 'keep');
            assert.equals(1, v.hideAfterSec);
        }
        assert.equals(false, networkIndicatorView('sync-complete').spin);
    });

    suite.test('離線提醒：顯示並閃爍，不改顏色也不排淡出', () => {
        const v = networkIndicatorView('reminder');
        assert.equals(null, v.color);
        assert.equals(true, v.visible);
        assert.equals(true, v.pulse);
        assert.equals(null, v.hideAfterSec);
    });

    return suite;
}
