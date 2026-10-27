/**
 * TournamentSeason.test.ts — 賽季相位、段位門檻與軟重置（PROG-2-0989）
 */
import { assert, TestSuite } from './TestRunner';
import { rankTierOf, softResetPoints, tournamentPhaseOf } from '../assets/scripts/core/systems/TournamentSeason';

export function createTournamentSeasonSuite(): TestSuite {
    const suite = new TestSuite('TournamentSeason (PROG-2-0989 賽季週期與段位)');

    suite.test('賽季相位：第 0–6 日培育期、第 7–13 日競賽期、第 14 日起結束', () => {
        assert.equals('PREPARATION', tournamentPhaseOf(0));
        assert.equals('PREPARATION', tournamentPhaseOf(6));
        assert.equals('COMPETITION', tournamentPhaseOf(7));
        assert.equals('COMPETITION', tournamentPhaseOf(13));
        assert.equals('ENDED', tournamentPhaseOf(14));
    });

    suite.test('賽季開始前視為培育期', () => {
        assert.equals('PREPARATION', tournamentPhaseOf(-1));
    });

    suite.test('段位門檻邊界：銅 0–999、銀 1000、金 1500、白金 2000、鑽石 2500、傳說 3000', () => {
        assert.equals('BRONZE', rankTierOf(0));
        assert.equals('BRONZE', rankTierOf(999));
        assert.equals('SILVER', rankTierOf(1000));
        assert.equals('GOLD', rankTierOf(1500));
        assert.equals('PLATINUM', rankTierOf(2000));
        assert.equals('DIAMOND', rankTierOf(2500));
        assert.equals('LEGEND', rankTierOf(3000));
    });

    suite.test('負數或非有限分數視為銅段位', () => {
        assert.equals('BRONZE', rankTierOf(-50));
        assert.equals('BRONZE', rankTierOf(Number.NaN));
    });

    suite.test('軟重置：傳說 -250、鑽石 -200、白金 -150', () => {
        assert.equals(2750, softResetPoints(3000));
        assert.equals(2300, softResetPoints(2500));
        assert.equals(1850, softResetPoints(2000));
    });

    suite.test('其他段位不扣，非有限分數視為 0', () => {
        assert.equals(100, softResetPoints(100));
        assert.equals(1200, softResetPoints(1200));
        assert.equals(0, softResetPoints(Number.NaN));
    });

    return suite;
}
