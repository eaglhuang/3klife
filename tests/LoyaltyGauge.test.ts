/**
 * LoyaltyGauge — 忠誠度條顯示數值（HUM-04）
 *
 * 覆蓋：警示與危險的邊界（60、30）、轉蛋鎖定 100、無紀錄用開局初值、無效數值保護。
 *
 * Unity 對照：像測 ViewModel 的 getter，輸入紀錄、輸出條的值與顏色等級，不需要場景。
 */
import { assert, TestSuite } from './TestRunner';
import { loyaltyGaugeOf } from '../assets/scripts/core/systems/LoyaltyGauge';

export function createLoyaltyGaugeSuite(): TestSuite {
    const suite = new TestSuite('LoyaltyGauge (忠誠度條顯示數值 HUM-04)');

    suite.test('顏色等級邊界：60 以上正常、30~59 橙色警示、30 以下紅色', () => {
        assert.equals('normal', loyaltyGaugeOf({ loyalty: 60, isGachaHero: false }).tier);
        assert.equals('warn', loyaltyGaugeOf({ loyalty: 59, isGachaHero: false }).tier);
        assert.equals('warn', loyaltyGaugeOf({ loyalty: 30, isGachaHero: false }).tier);
        assert.equals('danger', loyaltyGaugeOf({ loyalty: 29, isGachaHero: false }).tier);
    });

    suite.test('轉蛋武將鎖定為 100 並顯示鎖定，不論紀錄值多少', () => {
        const view = loyaltyGaugeOf({ loyalty: 12, isGachaHero: true });
        assert.equals(100, view.value);
        assert.equals(1, view.ratio);
        assert.isTrue(view.locked);
        assert.equals('normal', view.tier);
    });

    suite.test('非轉蛋武將依數值顯示比例，且不鎖定', () => {
        const view = loyaltyGaugeOf({ loyalty: 45, isGachaHero: false });
        assert.equals(45, view.value);
        assert.equals(0.45, view.ratio);
        assert.isFalse(view.locked);
    });

    suite.test('沒有忠誠紀錄時用開局初值，不鎖定', () => {
        const view = loyaltyGaugeOf(undefined);
        assert.equals(50, view.value);
        assert.isFalse(view.locked);
    });

    suite.test('無效數值保護：NaN 視為 0 且為危險；超出範圍夾在 0~100', () => {
        assert.equals(0, loyaltyGaugeOf({ loyalty: Number.NaN, isGachaHero: false }).value);
        assert.equals('danger', loyaltyGaugeOf({ loyalty: Number.NaN, isGachaHero: false }).tier);
        assert.equals(100, loyaltyGaugeOf({ loyalty: 150, isGachaHero: false }).value);
        assert.equals(0, loyaltyGaugeOf({ loyalty: -20, isGachaHero: false }).value);
    });

    return suite;
}
