/**
 * ClanFame — 家族名聲值供養消耗與降階（SPI-08；PROG-2-1962）
 */
import { assert, TestSuite } from './TestRunner';
import {
    affordableClanTier, applyClanFameIncident, dampenOfferingMultiplier, settleClanFame,
} from '../assets/scripts/core/systems/ClanFame';

export function createClanFameSuite(): TestSuite {
    const suite = new TestSuite('ClanFame (家族名聲降階 SPI-08 PROG-2-1962)');

    suite.test('名聲足夠：維持已解鎖階並扣 20', () => {
        const s = settleClanFame('ETERNAL_KIN', 50);
        assert.equals('ETERNAL_KIN', s.effectiveTier);
        assert.equals(20, s.fameSpent);
        assert.equals(30, s.fameRemaining);
        assert.isFalse(s.downgraded);
    });

    suite.test('名聲不足：降到付得起的最高階，傳家之寶不需名聲', () => {
        const costs = { CLAN_RELIC: 0, NOBLE_HOUSE: 10, ETERNAL_KIN: 30, MARTIAL_DEITY: 60 };
        assert.equals('NOBLE_HOUSE', affordableClanTier('MARTIAL_DEITY', 25, costs));
        const s = settleClanFame('MARTIAL_DEITY', 5, costs);
        assert.equals('CLAN_RELIC', s.effectiveTier);
        assert.equals(0, s.fameSpent);
        assert.equals(5, s.fameRemaining);
        assert.isTrue(s.downgraded);
        assert.equals('CLAN_RELIC', settleClanFame('NOBLE_HOUSE', Number.NaN).effectiveTier);
    });

    suite.test('事件扣名聲不低於 0；供養倍率折減', () => {
        assert.equals(15, applyClanFameIncident(40, 25));
        assert.equals(0, applyClanFameIncident(10, 25));
        assert.equals(0.6, dampenOfferingMultiplier(1.2, 0.5));
        assert.equals(1.2, dampenOfferingMultiplier(1.2, 3));
        assert.equals(0, dampenOfferingMultiplier(1.2, Number.NaN));
    });

    return suite;
}
