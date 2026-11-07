/**
 * ClanScoreTier — 家族積分與四階世家等級（SPI-07；PROG-2-1961）
 */
import { assert, TestSuite } from './TestRunner';
import {
    clanScoreOf, clanTierForScore, isClanTierUnlocked, pointsToNextClanTier, settleClanTier,
} from '../assets/scripts/core/systems/ClanScoreTier';

function near(expected: number, actual: number): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, `expected ${expected}, got ${actual}`);
}

export function createClanScoreTierSuite(): TestSuite {
    const suite = new TestSuite('ClanScoreTier (家族積分 SPI-07 PROG-2-1961)');

    suite.test('ClanScore = 人頭分（100/80/120%）× 每人點數 + 功勳分', () => {
        near(3.0 + 10, clanScoreOf(['NATIVE', 'CONVERTED_CAPTIVE', 'MATERNAL_SURNAME'], 10));
        near(80 + 0, clanScoreOf(['CONVERTED_CAPTIVE'], -5, 100));
        near(120, clanScoreOf(['MATERNAL_SURNAME'], Number.NaN, 100));
        near(0, clanScoreOf(['NATIVE'], 0, -1));
    });

    suite.test('四階門檻：0／500／5000／50000', () => {
        assert.equals('CLAN_RELIC', clanTierForScore(0));
        assert.equals('CLAN_RELIC', clanTierForScore(499));
        assert.equals('NOBLE_HOUSE', clanTierForScore(500));
        assert.equals('ETERNAL_KIN', clanTierForScore(5000));
        assert.equals('MARTIAL_DEITY', clanTierForScore(50000));
        assert.equals('CLAN_RELIC', clanTierForScore(Number.NaN));
    });

    suite.test('階位不倒退；解鎖判定與距下一階', () => {
        assert.equals('ETERNAL_KIN', settleClanTier('ETERNAL_KIN', 100));
        assert.equals('MARTIAL_DEITY', settleClanTier('NOBLE_HOUSE', 60000));
        assert.equals('NOBLE_HOUSE', settleClanTier(null, 700));
        assert.isTrue(isClanTierUnlocked('ETERNAL_KIN', 'NOBLE_HOUSE'));
        assert.isFalse(isClanTierUnlocked('NOBLE_HOUSE', 'MARTIAL_DEITY'));
        const next = pointsToNextClanTier(600);
        assert.equals('ETERNAL_KIN', next?.next);
        assert.equals(4400, next?.remaining);
        assert.equals(null, pointsToNextClanTier(70000));
    });

    return suite;
}
