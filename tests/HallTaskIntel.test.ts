/**
 * HallTaskIntel.test.ts — F-5 任務情報度與委任狀態判斷（PROG-2-0465）
 */
import { assert, TestSuite } from './TestRunner';
import {
    canRevealFullHallTask,
    canUseReconAction,
    getHallTaskIntelRevealPercent,
    isAutoAssignEnabled,
} from '../assets/scripts/core/systems/HallTaskIntel';

export function createHallTaskIntelSuite(): TestSuite {
    const suite = new TestSuite('HallTaskIntel (F-5 任務情報度與委任狀態)');

    suite.test('情報度缺值或非數字時預設 50，超出範圍夾回 0~100', () => {
        assert.equals(50, getHallTaskIntelRevealPercent({}));
        assert.equals(50, getHallTaskIntelRevealPercent({ Intel_Reveal_Percent: Number.NaN }));
        assert.equals(0, getHallTaskIntelRevealPercent({ Intel_Reveal_Percent: -20 }));
        assert.equals(100, getHallTaskIntelRevealPercent({ Intel_Reveal_Percent: 150 }));
        assert.equals(70, getHallTaskIntelRevealPercent({ Intel_Reveal_Percent: 70 }));
    });

    suite.test('只有情報滿 100 才能完整揭露；未滿 100 才能再探', () => {
        assert.isFalse(canRevealFullHallTask({ Intel_Reveal_Percent: 99 }));
        assert.isTrue(canRevealFullHallTask({ Intel_Reveal_Percent: 100 }));
        assert.isTrue(canUseReconAction({ Intel_Reveal_Percent: 50 }));
        assert.isFalse(canUseReconAction({ Intel_Reveal_Percent: 100 }));
    });

    suite.test('委任只在 AI_Assign_Enabled 明確為 true 時開啟', () => {
        assert.isTrue(isAutoAssignEnabled({ AI_Assign_Enabled: true }));
        assert.isFalse(isAutoAssignEnabled({ AI_Assign_Enabled: false }));
        assert.isFalse(isAutoAssignEnabled({}));
    });

    return suite;
}
