import { assert, TestSuite } from './TestRunner';
import {
    BOND_POINT_COST,
    bondToPermanent,
    BondStats,
    snapshotBondStats,
} from '../assets/scripts/core/systems/MercenaryBondPermanent';

const STATS: BondStats = { STR: 80, INT: 60, POL: 40, CHR: 70, LUK: 50 };

export function createMercenaryBondPermanentSuite(): TestSuite {
    const suite = new TestSuite('MercenaryBondPermanent (MERC-04/12 結義轉永久與快照)');

    suite.test('點數成本：R100 / SR300 / SSR600 / UR1200', () => {
        assert.equals(100, BOND_POINT_COST.R);
        assert.equals(300, BOND_POINT_COST.SR);
        assert.equals(600, BOND_POINT_COST.SSR);
        assert.equals(1200, BOND_POINT_COST.UR);
    });

    suite.test('點數足夠：扣對應點數並保留數值快照', () => {
        const result = bondToPermanent({ bondPoints: 350 }, 'SR', 'points', STATS);
        assert.isTrue(result.ok);
        assert.equals(50, result.wallet.bondPoints);
        assert.equals(300, result.pointsSpent);
        assert.equals(80, result.snapshot!.STR);
        assert.equals(50, result.snapshot!.LUK);
    });

    suite.test('點數剛好夠時可結義並歸零', () => {
        const result = bondToPermanent({ bondPoints: 100 }, 'R', 'points', STATS);
        assert.isTrue(result.ok);
        assert.equals(0, result.wallet.bondPoints);
    });

    suite.test('點數不足：拒絕且錢包與快照都不產生', () => {
        const wallet = { bondPoints: 299 };
        const result = bondToPermanent(wallet, 'SR', 'points', STATS);
        assert.isFalse(result.ok);
        assert.equals('insufficient-points', result.reason!);
        assert.equals(299, result.wallet.bondPoints);
        assert.equals(0, result.pointsSpent);
        assert.isTrue(result.snapshot === undefined);
        assert.equals(299, wallet.bondPoints);
    });

    suite.test('SSR/UR 美酒路徑：依 Q42 未定，回傳 undecided 且不扣點', () => {
        const result = bondToPermanent({ bondPoints: 5000 }, 'SSR', 'wine', STATS);
        assert.isFalse(result.ok);
        assert.equals('wine-path-undecided', result.reason!);
        assert.equals(5000, result.wallet.bondPoints);
    });

    suite.test('未知稀有度拒絕', () => {
        const result = bondToPermanent({ bondPoints: 5000 }, 'X', 'points', STATS);
        assert.isFalse(result.ok);
        assert.equals('unknown-rarity', result.reason!);
    });

    suite.test('快照是副本：之後修改來源數值不影響快照', () => {
        const source: BondStats = { ...STATS };
        const snap = snapshotBondStats(source);
        source.STR = 1;
        assert.equals(80, snap.STR);
        assert.isTrue(snap !== source);
    });

    suite.test('輸入錢包與數值不被修改', () => {
        const wallet = Object.freeze({ bondPoints: 600 });
        const stats = Object.freeze({ ...STATS });
        bondToPermanent(wallet, 'SSR', 'points', stats);
        assert.equals(600, wallet.bondPoints);
        assert.equals(80, stats.STR);
    });

    return suite;
}
