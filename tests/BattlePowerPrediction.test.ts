// @spec-source → 數值系統.md §F-4 戰役勝敗快速預判（PROG-2-0208）
/**
 * BattlePowerPrediction — 勝率預判的 headless 測試（PROG-2-0208）
 */
import { TestSuite, assert } from './TestRunner';
import { predictBattleOutcome } from '../assets/scripts/core/systems/BattlePowerPrediction';

export function createBattlePowerPredictionSuite(): TestSuite {
    const suite = new TestSuite('BattlePowerPrediction');

    suite.test('勢均力敵：攻守戰力相同時勝率 50%，標籤為勢均力敵', () => {
        const p = predictBattleOutcome(1000, 1000);
        assert.equals(50, p.winRate);
        assert.equals('勢均力敵', p.result);
    });

    suite.test('攻方大優：比值 1.5 → 勝率 80%，攻方優勢', () => {
        const p = predictBattleOutcome(1500, 1000);
        assert.equals(80, p.winRate);
        assert.equals('攻方優勢', p.result);
    });

    suite.test('攻方大劣：比值 0.5 → 勝率 20%，攻方劣勢', () => {
        const p = predictBattleOutcome(500, 1000);
        assert.equals(20, p.winRate);
        assert.equals('攻方劣勢', p.result);
    });

    suite.test('勝率夾在 5%~95%：比值極大或極小都不越界', () => {
        assert.equals(95, predictBattleOutcome(100000, 1).winRate);
        assert.equals(5, predictBattleOutcome(1, 100000).winRate);
    });

    suite.test('守方戰力為 0 時以 1 計，不會除以零', () => {
        const p = predictBattleOutcome(10, 0);
        assert.equals(95, p.winRate);
        assert.equals('攻方優勢', p.result);
    });

    return suite;
}
