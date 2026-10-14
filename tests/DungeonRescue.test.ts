// @spec-source → 養成系統與教官來源定義：地下城救美（PROG-2-0561）
/**
 * DungeonRescue — 地下城救美結果與刷新 headless 測試（PROG-2-0561）
 */
import { assert, TestSuite } from './TestRunner';
import { isRescueRefreshDue, RESCUE_OUTCOME_WEIGHTS, rollDungeonRescue } from '../assets/scripts/core/systems/DungeonRescue';

const HOUR = 60 * 60 * 1000;

export function createDungeonRescueSuite(): TestSuite {
    const suite = new TestSuite('DungeonRescue (地下城救美 FEM-07)');

    suite.test('機率權重總和為 1，且為 60 / 30 / 10', () => {
        const total = RESCUE_OUTCOME_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
        assert.isTrue(Math.abs(total - 1) < 1e-9);
        assert.equals(0.6, RESCUE_OUTCOME_WEIGHTS[0].weight);
        assert.equals(0.3, RESCUE_OUTCOME_WEIGHTS[1].weight);
        assert.equals(0.1, RESCUE_OUTCOME_WEIGHTS[2].weight);
    });

    suite.test('區間邊界：0.59 民女、0.6 千金、0.89 千金、0.9 貴族', () => {
        assert.equals('commoner', rollDungeonRescue(() => 0.59));
        assert.equals('noble-lady', rollDungeonRescue(() => 0.6));
        assert.equals('noble-lady', rollDungeonRescue(() => 0.89));
        assert.equals('noble', rollDungeonRescue(() => 0.9));
    });

    suite.test('8 小時刷新間隔（與傭兵池相同）', () => {
        assert.isFalse(isRescueRefreshDue(0, 8 * HOUR - 1));
        assert.isTrue(isRescueRefreshDue(0, 8 * HOUR));
    });

    return suite;
}
