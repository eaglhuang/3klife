/**
 * 部隊撤退的擲骰結算與回合閘門（PM 暫定規則，2026-10-14 19:20Z）
 *
 * 鎖住：roll 小於風險即失敗、否則成功；成功保留 HP；失敗扣最大 HP 20%（取整、扣到 0 為止）；
 * 失敗後本回合不能行動，下一回合解除。風險值本身由 retreatRiskOf 決定，這裡不重複測。
 */
import { assert, TestSuite } from './TestRunner';
import {
    RETREAT_BASE_RISK,
    RETREAT_FAIL_DAMAGE_PCT,
    resolveRetreat,
    retreatNextStep,
} from '../assets/scripts/core/systems/BattleRetreat';
import { BattleTurnManager } from '../assets/scripts/battle/runtime/BattleTurnManager';

export function createBattleRetreatSuite(): TestSuite {
    const suite = new TestSuite('BattleRetreat (部隊撤退擲骰與回合閘門 PM 暫定)');

    suite.test('暫定數值：基礎風險 0.2、失敗傷害 20%', () => {
        assert.equals(0.2, RETREAT_BASE_RISK);
        assert.equals(0.2, RETREAT_FAIL_DAMAGE_PCT);
    });

    suite.test('擲骰：roll 小於風險即失敗，等於或大於風險即成功', () => {
        assert.isFalse(resolveRetreat(100, 80, 0.2, 0.19).escaped);
        assert.isTrue(resolveRetreat(100, 80, 0.2, 0.2).escaped);
        assert.isTrue(resolveRetreat(100, 80, 0.2, 0.9).escaped);
    });

    suite.test('成功：脫離、保留現有 HP、不扣血', () => {
        const r = resolveRetreat(100, 37, 0.2, 0.9);
        assert.isTrue(r.escaped);
        assert.equals(0, r.damage);
        assert.equals(37, r.hpAfter);
    });

    suite.test('失敗：扣最大 HP 20%（取整），留在場上', () => {
        const r = resolveRetreat(100, 80, 0.2, 0.1);
        assert.isFalse(r.escaped);
        assert.equals(20, r.damage);
        assert.equals(60, r.hpAfter);
    });

    suite.test('失敗：扣到 0 為止，不會變負數', () => {
        const r = resolveRetreat(100, 10, 0.2, 0);
        assert.equals(0, r.hpAfter);
    });

    suite.test('風險與擲骰無效時的保護：風險夾在 0~1，無效 roll 視為 0', () => {
        assert.isTrue(resolveRetreat(100, 50, 0, 0).escaped);
        assert.isFalse(resolveRetreat(100, 50, 5, 0.99).escaped);
        assert.isFalse(resolveRetreat(100, 50, 0.2, Number.NaN).escaped);
    });

    suite.test('後續步驟：成功脫離；失敗且血量歸 0 為陣亡；失敗但有血留場為鎖回合', () => {
        assert.equals('escape', retreatNextStep(resolveRetreat(100, 80, 0.2, 0.9)));
        assert.equals('blocked', retreatNextStep(resolveRetreat(100, 80, 0.2, 0.1)));
        assert.equals('dead', retreatNextStep(resolveRetreat(100, 10, 0.2, 0.1)));
    });

    suite.test('回合閘門：撤退失敗後本回合不能行動，下一回合解除', () => {
        const turn = new BattleTurnManager();
        turn.markUnitActionBlocked('u1');
        assert.isTrue(turn.isUnitActionBlockedThisTurn('u1'));
        assert.isTrue(turn.hasUnitMovedThisTurn('u1'));
        assert.isFalse(turn.isUnitActionBlockedThisTurn('u2'));

        turn.refreshForNextTurn();
        assert.isFalse(turn.isUnitActionBlockedThisTurn('u1'));
        assert.isFalse(turn.hasUnitMovedThisTurn('u1'));
    });

    return suite;
}
