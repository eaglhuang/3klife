/**
 * 演武聖境：精華快照與付費復活的數值（LIFE-11，PROG-2-0432）
 *
 * 規格係數只有快照 TP × 0.5；上限與復活回復比例為暫定，這裡鎖住計算規則，
 * 不鎖暫定數字本身，調整數值時不必改測試。
 */
import { assert, TestSuite } from './TestRunner';
import {
    LEGACY_ARENA_TUNING,
    legacyReviveRestoreOf,
    legacySnapshotOf,
} from '../assets/scripts/core/systems/LegacyArena';

export function createLegacyArenaSuite(): TestSuite {
    const suite = new TestSuite('LegacyArena (演武聖境精華快照與付費復活 LIFE-11)');

    suite.test('規格係數為 TP × 0.5', () => {
        assert.equals(0.5, LEGACY_ARENA_TUNING.snapshotRatio);
    });

    suite.test('精華快照：floor(TP × 係數)', () => {
        assert.equals(50, legacySnapshotOf(101));
        assert.equals(50, legacySnapshotOf(100));
    });

    suite.test('精華快照：超過上限時封頂', () => {
        assert.equals(LEGACY_ARENA_TUNING.snapshotCap, legacySnapshotOf(1_000_000));
    });

    suite.test('精華快照：無效輸入回 0', () => {
        assert.equals(0, legacySnapshotOf(0));
        assert.equals(0, legacySnapshotOf(-50));
        assert.equals(0, legacySnapshotOf(Number.NaN));
        assert.equals(0, legacySnapshotOf(Number.POSITIVE_INFINITY));
    });

    suite.test('付費復活：回復 floor(快照 × 回復係數)', () => {
        const restore = legacyReviveRestoreOf(100);
        assert.equals(Math.floor(100 * LEGACY_ARENA_TUNING.reviveRestoreRatio), restore);
    });

    suite.test('付費復活：無效輸入回 0', () => {
        assert.equals(0, legacyReviveRestoreOf(0));
        assert.equals(0, legacyReviveRestoreOf(-10));
        assert.equals(0, legacyReviveRestoreOf(Number.NaN));
    });

    suite.test('數值表可覆寫：傳入自訂 tuning 時使用該組數值', () => {
        const custom = { snapshotRatio: 1, snapshotCap: 20, reviveRestoreRatio: 0.5 };
        assert.equals(20, legacySnapshotOf(500, custom));
        assert.equals(10, legacyReviveRestoreOf(20, custom));
    });

    return suite;
}
