/**
 * LuckVisibility.test.ts — 運氣屬性前期隱藏與顯示（LUK-01）headless 測試
 *
 * Unity 對照：像 Attribute Visibility 的 EditMode 測試，逐一驗邊界等級與欄位優先序。
 */
import { TestSuite, assert } from './TestRunner';
import {
    LUK_REVEAL_LEVEL,
    LUK_VALUE_CEILING,
    isLukVisible,
    lukDisplayText,
    normalizeLuk,
} from '../assets/scripts/core/systems/LuckVisibility';

export function createLuckVisibilitySuite(): TestSuite {
    const suite = new TestSuite('LuckVisibility (運氣屬性前期隱藏 LUK-01)');

    suite.test('Lv46 解鎖常數維持規格值（Lv46 規則待有等級欄位後接回）', () => {
        assert.equals(46, LUK_REVEAL_LEVEL);
    });

    suite.test('Is_Visible 為 true 才可見，false 或缺值一律隱藏（PM 裁決 B）', () => {
        assert.isTrue(isLukVisible({ isVisible: true }));
        assert.isFalse(isLukVisible({ isVisible: false }));
        assert.isFalse(isLukVisible({}));
    });

    suite.test('數值夾制：0..100 並取整，非有限數為 0', () => {
        assert.equals(0, normalizeLuk(-5));
        assert.equals(LUK_VALUE_CEILING, normalizeLuk(250));
        assert.equals(78, normalizeLuk(77.6));
        assert.equals(0, normalizeLuk(Number.POSITIVE_INFINITY));
    });

    suite.test('隱藏時顯示「???（Lv46 解鎖）」且不洩漏數值，顯示時顯示數值', () => {
        assert.equals('天命（LUK）：???（Lv46 解鎖）', lukDisplayText(78, false));
        assert.equals('天命（LUK）：78', lukDisplayText(78, true));
    });

    return suite;
}
