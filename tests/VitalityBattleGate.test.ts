/**
 * VitalityBattleGate — 戰場精力軟懲罰（LIFE-10，PROG-2-0425）
 *
 * 覆蓋：區間邊界（50% / 10%）、各區間允許的行動、基本行為永不被擋、撤退風險只在耗盡段提高、上限無效時不猜測。
 *
 * Unity 對照：像測一個純 Rule 類別的 bool 結果，不需要場景或 UI。
 */
import { assert, TestSuite } from './TestRunner';
import {
    EXHAUSTED_RETREAT_RISK_BONUS,
    canPerformAction,
    retreatRiskBonus,
    vitalityBandOf,
} from '../assets/scripts/core/systems/VitalityBattleGate';

export function createVitalityBattleGateSuite(): TestSuite {
    const suite = new TestSuite('VitalityBattleGate (戰場精力軟懲罰 LIFE-10)');

    suite.test('區間邊界：>50% 為高段，恰好 50% 為中段', () => {
        assert.equals('high', vitalityBandOf(51, 100));
        assert.equals('mid', vitalityBandOf(50, 100));
    });

    suite.test('區間邊界：恰好 10% 為中段，<10% 為耗盡段', () => {
        assert.equals('mid', vitalityBandOf(10, 100));
        assert.equals('exhausted', vitalityBandOf(9.9, 100));
    });

    suite.test('區間計算以上限為基準（同樣 60 點，上限 100 為高段，上限 200 為中段）', () => {
        assert.equals('high', vitalityBandOf(60, 100));
        assert.equals('mid', vitalityBandOf(60, 200));
    });

    suite.test('無效上限或數值：視為耗盡，不猜測', () => {
        assert.equals('exhausted', vitalityBandOf(50, 0));
        assert.equals('exhausted', vitalityBandOf(Number.NaN, 100));
        assert.equals('exhausted', vitalityBandOf(50, Number.POSITIVE_INFINITY));
    });

    suite.test('高段：主動戰法與終極戰法皆可發動', () => {
        assert.isTrue(canPerformAction('high', 'active-tactic'));
        assert.isTrue(canPerformAction('high', 'ultimate-tactic'));
    });

    suite.test('中段：禁終極戰法，仍可用主動戰法與基本行為', () => {
        assert.isTrue(canPerformAction('mid', 'active-tactic'));
        assert.isFalse(canPerformAction('mid', 'ultimate-tactic'));
    });

    suite.test('耗盡段：所有戰法皆禁止', () => {
        assert.isFalse(canPerformAction('exhausted', 'active-tactic'));
        assert.isFalse(canPerformAction('exhausted', 'ultimate-tactic'));
    });

    suite.test('基本行為（普攻/移動/基本技能）在任何區間都允許', () => {
        assert.isTrue(canPerformAction('high', 'basic'));
        assert.isTrue(canPerformAction('mid', 'basic'));
        assert.isTrue(canPerformAction('exhausted', 'basic'));
    });

    suite.test('撤退風險：只有耗盡段提高，其餘為 0', () => {
        assert.equals(0, retreatRiskBonus('high'));
        assert.equals(0, retreatRiskBonus('mid'));
        assert.equals(EXHAUSTED_RETREAT_RISK_BONUS, retreatRiskBonus('exhausted'));
        assert.isTrue(EXHAUSTED_RETREAT_RISK_BONUS > 0);
    });

    return suite;
}
