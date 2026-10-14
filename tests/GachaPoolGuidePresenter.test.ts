/**
 * GachaPoolGuidePresenter — 卡池頁與名將詳情定位文字（PROG-2-0565）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import { DEATH_LEGACY_HINT, GENERAL_POOL_GUIDE, SUPPORT_POOL_GUIDE } from '../assets/scripts/core/systems/GachaPoolGuide';
import { buildGachaPoolGuideLines, appendDeathLegacyHint } from '../assets/scripts/ui/core/GachaPoolGuidePresenter';

export function createGachaPoolGuidePresenterSuite(): TestSuite {
    const suite = new TestSuite('GachaPoolGuidePresenter (卡池定位文字 PROG-2-0565)');

    suite.test('卡池頁兩個系列標題行使用雙池定位文案', () => {
        const lines = buildGachaPoolGuideLines();
        assert.equals(GENERAL_POOL_GUIDE, lines.generalSeries);
        assert.equals(SUPPORT_POOL_GUIDE, lines.supportSeries);
    });

    suite.test('已故武將來源欄附加死亡傳承提示', () => {
        const text = appendDeathLegacyHint('三國名將', 'dead');
        assert.equals(`三國名將\n${DEATH_LEGACY_HINT}`, text);
    });

    suite.test('存活武將來源欄維持原文字，不附加提示', () => {
        assert.equals('三國名將', appendDeathLegacyHint('三國名將', 'Active'));
        assert.equals('三國名將', appendDeathLegacyHint('三國名將', undefined));
    });

    return suite;
}
