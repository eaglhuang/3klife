/**
 * TallyPowerRating — 虎符戰力評分與升星成本（doc_spec_0349；PROG-2-2035）
 */
import { assert, TestSuite } from './TestRunner';
import { computeTallyBattlePower, tryTallyStarUp } from '../assets/scripts/core/systems/TallyPowerRating';

export function createTallyPowerRatingSuite(): TestSuite {
    const suite = new TestSuite('TallyPowerRating (虎符戰力 doc_spec_0349 PROG-2-2035)');

    suite.test('§4-1 滿星＋專屬＋S 地形＋神品封頂且為整數', () => {
        // 500 × 4.0 × 2.0 × 1.35 × 1.2 = 6480
        const top = computeTallyBattlePower({ quality: 'Red', starLevel: 5, resonanceType: 'Exclusive', aptitudeRank: 'S' });
        assert.equals(6480, top);
        assert.equals(6480, computeTallyBattlePower({ quality: 'Red', starLevel: 9, resonanceType: 'Exclusive', aptitudeRank: 'S' }));
        assert.isTrue(Number.isInteger(top));
    });

    suite.test('§1 基本值與各乘區', () => {
        assert.equals(500, computeTallyBattlePower({ quality: 'White', starLevel: 1, resonanceType: 'None', aptitudeRank: 'B' }));
        // 500 × 1.2 × 1.25 × 1.15 × 0.9 = 776.25
        assert.equals(776, computeTallyBattlePower({ quality: 'Green', starLevel: 2, resonanceType: 'Faction', aptitudeRank: 'C' }));
        // 500 × 1.5 × 1.5 × 1 × 0.8 = 900
        assert.equals(900, computeTallyBattlePower({ quality: 'Blue', starLevel: 3, resonanceType: 'None', aptitudeRank: 'D' }));
    });

    suite.test('§4-2 升星原子扣減', () => {
        const wallet = { shards: 20, essence: 100, copper: 5000 };
        const ok = tryTallyStarUp(1, wallet);
        assert.isTrue(ok.ok);
        if (ok.ok) {
            assert.equals(2, ok.star);
            assert.equals(0, ok.wallet.shards + ok.wallet.essence + ok.wallet.copper);
        }
        const poor = { shards: 50, essence: 249, copper: 99999 };
        const fail = tryTallyStarUp(2, poor);
        assert.isFalse(fail.ok);
        if (!fail.ok) {
            assert.equals('essence', fail.missing.join(','));
            assert.equals(249, fail.wallet.essence);
            assert.equals(50, fail.wallet.shards);
        }
        const max = tryTallyStarUp(5, { shards: 9999, essence: 9999, copper: 999999 });
        assert.isFalse(max.ok);
        if (!max.ok) assert.equals('max-star', max.reason);
    });

    return suite;
}
