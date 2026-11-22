/**
 * ReadableFontSize — 小螢幕最小可讀字級（PROG-2-9433）
 *
 * 覆蓋：畫面縮放比例取寬高較小者、手機 812×375 放大到至少 12 CSS px、桌機原字級不變、行高等比、無效輸入。
 *
 * Unity 對照：像測 Canvas Scaler 反推最小字級的純函式。
 */
import { assert, TestSuite } from './TestRunner';
import { MIN_READABLE_CSS_PX, readableFontSize, readableLineHeight, screenCssScale } from '../assets/scripts/shared/ReadableFontSize';

export function createReadableFontSizeSuite(): TestSuite {
    const suite = new TestSuite('ReadableFontSize (小螢幕最小可讀字級 PROG-2-9433)');

    suite.test('縮放比例：手機橫屏 812×375 依高度約 0.347；窄視窗依寬度', () => {
        assert.equals(375 / 1080, screenCssScale(812, 375, 1920, 1080));
        assert.equals(768 / 1920, screenCssScale(768, 1024, 1920, 1080));
        assert.equals(1, screenCssScale(1920, 1080, 1920, 1080));
    });

    suite.test('手機：26px 明細字放大到 35，縮放後至少 12 CSS px', () => {
        const scale = screenCssScale(812, 375, 1920, 1080);
        const size = readableFontSize(26, scale);
        assert.equals(35, size);
        assert.isTrue(size * scale >= MIN_READABLE_CSS_PX);
        assert.equals(56, readableFontSize(56, scale));
    });

    suite.test('桌機 1920×1080：字級不變，照網頁原稿', () => {
        assert.equals(26, readableFontSize(26, 1));
        assert.equals(24, readableFontSize(24, 1));
    });

    suite.test('行高等比放大；字級沒放大時行高不變', () => {
        assert.equals(48, readableLineHeight(26, 36, 35));
        assert.equals(36, readableLineHeight(26, 36, 26));
    });

    suite.test('無效輸入：縮放 ≤0、NaN 時原值不變，比例預設 1', () => {
        assert.equals(26, readableFontSize(26, 0));
        assert.equals(26, readableFontSize(26, Number.NaN));
        assert.equals(1, screenCssScale(0, 375, 1920, 1080));
    });

    return suite;
}
