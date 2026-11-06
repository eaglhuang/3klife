/**
 * FortressBarView — 戰場頂部城寨血條顯示數值（doc_ui_0001 §2.1）
 *
 * 覆蓋：開場血量為滿條、受損比例、夾限與無效輸入保護。
 *
 * Unity 對照：像測 Slider 的 fillAmount 計算，不需要場景或 UI。
 */
import { assert, TestSuite } from './TestRunner';
import { FORTRESS_MAX_HP, fortressBarRatio } from '../assets/scripts/core/systems/FortressBarView';

export function createFortressBarViewSuite(): TestSuite {
    const suite = new TestSuite('FortressBarView (戰場頂部城寨血條 doc_ui_0001 §2.1)');

    suite.test('開場血量為滿條；扣到 250 時剩一半', () => {
        assert.equals(1, fortressBarRatio(FORTRESS_MAX_HP));
        assert.equals(0.5, fortressBarRatio(250));
        assert.equals(0.5, fortressBarRatio(60, 120));
    });

    suite.test('超出範圍時夾在 0~1', () => {
        assert.equals(0, fortressBarRatio(-30));
        assert.equals(1, fortressBarRatio(FORTRESS_MAX_HP + 100));
    });

    suite.test('上限無效或血量為 NaN 時回傳 0', () => {
        assert.equals(0, fortressBarRatio(100, 0));
        assert.equals(0, fortressBarRatio(100, NaN));
        assert.equals(0, fortressBarRatio(NaN));
    });

    return suite;
}
