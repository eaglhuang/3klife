/**
 * AdaptiveResolution.test.ts — 依視窗比例選縮放策略（PROG-2-1626）
 *
 * Unity 對照：像 CanvasScaler 的 Match Width Or Height，窄螢幕對齊寬、寬螢幕對齊高。
 */
import { assert, TestSuite } from './TestRunner';
import { ResolutionPolicy } from 'cc';
import { pickResolutionPolicy } from '../assets/scripts/ui/core/AdaptiveResolution';

export function createAdaptiveResolutionSuite(): TestSuite {
    const suite = new TestSuite('AdaptiveResolution (窄視窗不裁左右)');

    suite.test('比 16:9 窄（4:3）改固定寬度，左上返回鍵與姓名欄不被裁掉', () => {
        assert.equals(ResolutionPolicy.FIXED_WIDTH, pickResolutionPolicy(800, 600, 1920, 1080));
    });

    suite.test('剛好 16:9 或更寬維持固定高度', () => {
        assert.equals(ResolutionPolicy.FIXED_HEIGHT, pickResolutionPolicy(1920, 1080, 1920, 1080));
        assert.equals(ResolutionPolicy.FIXED_HEIGHT, pickResolutionPolicy(2560, 1080, 1920, 1080));
    });

    suite.test('尺寸未就緒（0）時退回固定高度', () => {
        assert.equals(ResolutionPolicy.FIXED_HEIGHT, pickResolutionPolicy(0, 0, 1920, 1080));
    });

    return suite;
}
