/**
 * BattleSeasonStats.test.ts — 賽季戰績分段累加、切換歸檔與舊存檔相容 headless 測試（PROG-2-0848）
 *
 * Unity 對照：EditMode Test，驗證每季計分表從零開始、上一季進 Archive、重複切換不重複歸檔。
 */
import { TestSuite, assert } from './TestRunner';
import {
    accumulateSeasonBattle,
    emptySeasonStats,
    normalizeSeasonStats,
    rolloverSeason,
} from '../assets/scripts/core/systems/BattleSeasonStats';
import { EMPTY_PERFORMANCE } from '../assets/scripts/core/systems/BattleRecordStats';

export function createBattleSeasonStatsSuite(): TestSuite {
    const suite = new TestSuite('BattleSeasonStats');

    suite.test('同賽季累加：勝負、擊殺、傷害與守護力（承傷＋治療）正確', () => {
        const once = accumulateSeasonBattle(null, 'S1', 'win', { kills: 3, damageDealt: 500, damageTaken: 120, healingDone: 30 });
        const twice = accumulateSeasonBattle(once, 'S1', 'lose', { kills: 1, damageDealt: 200, damageTaken: 80, healingDone: 0 });
        assert.equals(1, twice.wins);
        assert.equals(1, twice.losses);
        assert.equals(4, twice.kills);
        assert.equals(700, twice.totalDamage);
        assert.equals(230, twice.guardianPower);
    });

    suite.test('累加不改動傳入物件（回傳新物件）', () => {
        const before = emptySeasonStats('S1');
        const after = accumulateSeasonBattle(before, 'S1', 'win', EMPTY_PERFORMANCE);
        assert.equals(0, before.wins);
        assert.equals(1, after.wins);
    });

    suite.test('平手不計勝場也不計敗場，但表現數值仍累加', () => {
        const draw = accumulateSeasonBattle(null, 'S1', 'draw', { kills: 2, damageDealt: 90, damageTaken: 0, healingDone: 0 });
        assert.equals(0, draw.wins);
        assert.equals(0, draw.losses);
        assert.equals(2, draw.kills);
        assert.equals(90, draw.totalDamage);
    });

    suite.test('賽季 ID 不同時惰性重置：舊季數值不混入新季', () => {
        const s1 = accumulateSeasonBattle(null, 'S1', 'win', { kills: 5, damageDealt: 400, damageTaken: 0, healingDone: 0 });
        const s2 = accumulateSeasonBattle(s1, 'S2', 'lose', { kills: 1, damageDealt: 50, damageTaken: 0, healingDone: 0 });
        assert.equals('S2', s2.seasonId);
        assert.equals(0, s2.wins);
        assert.equals(1, s2.losses);
        assert.equals(1, s2.kills);
        assert.equals(50, s2.totalDamage);
    });

    suite.test('切換賽季：上一季有戰績則歸檔，新季全部歸零', () => {
        const s1 = accumulateSeasonBattle(null, 'S1', 'win', { kills: 2, damageDealt: 100, damageTaken: 10, healingDone: 5 });
        const rollover = rolloverSeason(s1, 'S2');
        assert.isTrue(rollover.archived !== null, '上一季有戰績應歸檔');
        assert.equals('S1', rollover.archived?.seasonId ?? '');
        assert.equals(1, rollover.archived?.wins ?? -1);
        assert.equals('S2', rollover.current.seasonId);
        assert.equals(0, rollover.current.wins);
        assert.equals(0, rollover.current.guardianPower);
    });

    suite.test('切換賽季：上一季完全沒有戰績則不寫入歸檔', () => {
        const rollover = rolloverSeason(emptySeasonStats('S1'), 'S2');
        assert.equals(null, rollover.archived);
        assert.equals('S2', rollover.current.seasonId);
    });

    suite.test('同一賽季重複切換不重複歸檔（冪等）', () => {
        const s1 = accumulateSeasonBattle(null, 'S1', 'win', EMPTY_PERFORMANCE);
        const rollover = rolloverSeason(s1, 'S1');
        assert.equals(null, rollover.archived);
        assert.equals(1, rollover.current.wins);
    });

    suite.test('舊存檔沒有賽季欄位時 normalize 回傳 null；欄位壞值歸零', () => {
        assert.equals(null, normalizeSeasonStats(undefined));
        assert.equals(null, normalizeSeasonStats({ wins: 3 }));
        const repaired = normalizeSeasonStats({ seasonId: 'S3', wins: -2, losses: NaN, kills: 4, totalDamage: 'x', guardianPower: 7 });
        assert.equals('S3', repaired?.seasonId ?? '');
        assert.equals(0, repaired?.wins ?? -1);
        assert.equals(0, repaired?.losses ?? -1);
        assert.equals(4, repaired?.kills ?? -1);
        assert.equals(0, repaired?.totalDamage ?? -1);
        assert.equals(7, repaired?.guardianPower ?? -1);
    });

    return suite;
}
