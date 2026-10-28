/**
 * LastSpurtJudge.test.ts — 殘局判斷器純邏輯（FORM-10）
 *
 * 鎖住：第 5 回合進入；存活低於峰值 50% 進入；恰好 50% 不進入；沒有峰值時不觸發。
 *
 * Unity 對照：像 Phase 切換條件的單元測試，只測條件函式，不跑戰場。
 */
import { LAST_SPURT_TURN, lastSpurtReasonOf } from '../assets/scripts/core/systems/LastSpurtJudge';
import { TestSuite, assert } from './TestRunner';

export function createLastSpurtJudgeSuite(): TestSuite {
    const suite = new TestSuite('LastSpurtJudge (殘局判斷器純邏輯 FORM-10)');

    suite.test('第 4 回合、兵力未折損：不進入殘局', () => {
        assert.equals(null, lastSpurtReasonOf({ turn: LAST_SPURT_TURN - 1, livingTroops: 10, peakTroops: 10 }));
    });

    suite.test('第 5 回合：不論兵力，以 turn 原因進入殘局', () => {
        assert.equals('turn', lastSpurtReasonOf({ turn: LAST_SPURT_TURN, livingTroops: 10, peakTroops: 10 }));
    });

    suite.test('存活低於峰值 50%：以 attrition 原因進入殘局', () => {
        assert.equals('attrition', lastSpurtReasonOf({ turn: 2, livingTroops: 4, peakTroops: 10 }));
    });

    suite.test('存活恰好 50%：不算低於，不進入', () => {
        assert.equals(null, lastSpurtReasonOf({ turn: 2, livingTroops: 5, peakTroops: 10 }));
    });

    suite.test('沒有峰值（開戰前無兵）：不以存活比例觸發', () => {
        assert.equals(null, lastSpurtReasonOf({ turn: 1, livingTroops: 0, peakTroops: 0 }));
    });

    return suite;
}
