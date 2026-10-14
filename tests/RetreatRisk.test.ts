/**
 * 精力狀態對撤退風險的影響（PROG-2-0435，LIFE-10 撤退風險段）
 *
 * 鎖住：高區與中區不加成，耗盡段加成（暫定 0.1），結果夾在 0~1，無效基礎風險視為 0。
 * 規格沒有給撤退後果，這裡只測風險數字。
 */
import { assert, TestSuite } from './TestRunner';
import { EXHAUSTED_RETREAT_RISK_BONUS } from '../assets/scripts/core/systems/VitalityBattleGate';
import { retreatRiskOf } from '../assets/scripts/core/systems/RetreatRisk';

export function createRetreatRiskSuite(): TestSuite {
    const suite = new TestSuite('RetreatRisk (精力對撤退風險的影響 PROG-2-0435)');

    suite.test('高區與中區不加成，撤退風險等於基礎風險', () => {
        assert.equals(0.2, retreatRiskOf(0.2, 'high'));
        assert.equals(0.2, retreatRiskOf(0.2, 'mid'));
    });

    suite.test('耗盡段加上精力加成（暫定 0.1）', () => {
        assert.equals(0.2 + EXHAUSTED_RETREAT_RISK_BONUS, retreatRiskOf(0.2, 'exhausted'));
    });

    suite.test('結果夾在 0~1', () => {
        assert.equals(1, retreatRiskOf(0.95, 'exhausted'));
        assert.equals(1, retreatRiskOf(5, 'high'));
    });

    suite.test('無效基礎風險視為 0；負數視為 0', () => {
        assert.equals(0, retreatRiskOf(Number.NaN, 'high'));
        assert.equals(0, retreatRiskOf(-0.3, 'mid'));
        assert.equals(EXHAUSTED_RETREAT_RISK_BONUS, retreatRiskOf(Number.NaN, 'exhausted'));
    });

    return suite;
}
