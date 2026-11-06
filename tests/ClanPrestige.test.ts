/**
 * ClanPrestige — 祠堂軍功聲望與 60 歲榮譽退役（doc_spec_0310 §3、TC-LEGACY-02；PROG-2-1910）
 */
import { assert, TestSuite } from './TestRunner';
import { CLAN_PRESTIGE_THRESHOLDS, calculatePrestigeGain, clanPrestigeTierOf } from '../assets/scripts/core/systems/GenerationalLegacy';
import { RETIRE_MIN_AGE, RETIREMENT_AGE } from '../assets/scripts/core/systems/GeneralAging';

export function createClanPrestigeSuite(): TestSuite {
    const suite = new TestSuite('ClanPrestige (祠堂聲望與榮譽退役 PROG-2-1910)');

    suite.test('TC-LEGACY-02：聲望 = 將階×500 + 斬將×50 + 勝場×100', () => {
        assert.equals(5 * 500 + 12 * 50 + 30 * 100, calculatePrestigeGain({ finalRank: 5, totalKills: 12, totalWins: 30 }));
        assert.equals(0, calculatePrestigeGain({ finalRank: -1, totalKills: NaN, totalWins: 0 }));
    });

    suite.test('五階門檻：剛好達標即升階', () => {
        assert.equals(1, clanPrestigeTierOf(0));
        assert.equals(1, clanPrestigeTierOf(1499));
        CLAN_PRESTIGE_THRESHOLDS.forEach((t, i) => assert.equals(i + 1, clanPrestigeTierOf(t)));
        assert.equals(5, clanPrestigeTierOf(999999));
    });

    suite.test('榮譽退役 60 歲，天年門檻仍為 65', () => {
        assert.equals(60, RETIRE_MIN_AGE);
        assert.equals(65, RETIREMENT_AGE);
    });

    return suite;
}
