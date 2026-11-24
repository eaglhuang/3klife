/**
 * GachaFirstPullPricing — G-01 轉蛋首抽 (PROG-2-9952) 測試
 *
 * 驗證：
 * 1. hero-pool 名將池啟用 firstPullFree。
 * 2. tenPullCost 為 1500，貨幣為 gems（玉璧）。
 */
import { TestSuite, assert } from './TestRunner';
import gachaConfig from '../assets/resources/data/gacha-config.json';

export function createGachaFirstPullPricingSuite(): TestSuite {
    const suite = new TestSuite('GachaFirstPullPricing (G-01 轉蛋首抽 PROG-2-9952)');

    suite.test('名將池 hero-pool 設定首抽免費、十連 1500 玉璧', () => {
        const heroPool = (gachaConfig as Array<Record<string, unknown>>).find(p => p.poolId === 'hero-pool');
        assert.isTrue(!!heroPool);
        assert.equals(heroPool!.firstPullFree, true);
        assert.equals(heroPool!.tenPullCost, 1500);
        assert.equals((heroPool!.presentation as Record<string, unknown>).currency, 'gems');
    });

    return suite;
}
