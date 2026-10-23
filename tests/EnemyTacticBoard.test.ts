/**
 * EnemyTacticBoard — 敵方選技戰場數值來源（PROG-2-0919）的純邏輯測試
 */
import { estimateHealValue, hasChokePointLane, hasDenseArea } from '../assets/scripts/battle/shared/EnemyTacticBoard';
import { TestSuite, assert } from './TestRunner';

export function createEnemyTacticBoardSuite(): TestSuite {
    const suite = new TestSuite('EnemyTacticBoard (敵方選技戰場數值 PROG-2-0919)');

    suite.test('密集區：3 個單位聚在相鄰格為真；兩兩分散為假', () => {
        assert.isTrue(hasDenseArea([{ lane: 1, depth: 2 }, { lane: 2, depth: 2 }, { lane: 2, depth: 3 }]));
        assert.isFalse(hasDenseArea([{ lane: 0, depth: 0 }, { lane: 2, depth: 2 }, { lane: 4, depth: 4 }]));
        assert.isFalse(hasDenseArea([]));
    });

    suite.test('咽喉：一路只剩 1 個、別路有 2 個以上才為真；全部同樣厚度為假', () => {
        assert.isTrue(hasChokePointLane([{ lane: 0, depth: 1 }, { lane: 1, depth: 1 }, { lane: 1, depth: 2 }]));
        assert.isFalse(hasChokePointLane([{ lane: 0, depth: 1 }, { lane: 1, depth: 1 }]));
        assert.isFalse(hasChokePointLane([{ lane: 0, depth: 1 }, { lane: 0, depth: 2 }]));
    });

    suite.test('回復量：醫療類依最低血量隊友已損 HP 的比例，取整數', () => {
        assert.equals(25, estimateHealValue({ healMissingRatio: 0.25 }, 1000, 100));
        assert.equals(0, estimateHealValue({ healMissingRatio: 0.25 }, 1000, 0));
    });

    suite.test('回復量：比例類依施放者最大 HP，且不低於 healFloor', () => {
        assert.equals(180, estimateHealValue({ healRatio: 0.18, healFloor: 30 }, 1000, 0));
        assert.equals(30, estimateHealValue({ healRatio: 0.18, healFloor: 30 }, 100, 0));
    });

    suite.test('回復量：沒有設定或沒有回復欄位（增益類）回 0', () => {
        assert.equals(0, estimateHealValue(null, 1000, 100));
        assert.equals(0, estimateHealValue({}, 1000, 100));
    });

    return suite;
}
