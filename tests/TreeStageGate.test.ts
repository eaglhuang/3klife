/**
 * TreeStageGate.test.ts — 人物頁族譜依家族階段展開（PROG-2-1844）
 */
import { TestSuite, assert } from './TestRunner';
import { treeGenerationVisible } from '../assets/scripts/core/systems/FamilyMilestone';

export function createTreeStageGateSuite(): TestSuite {
    const suite = new TestSuite('TreeStageGate');

    suite.test('G1 只看得到父母一代', () => {
        assert.isTrue(treeGenerationVisible(1, 1));
        assert.isFalse(treeGenerationVisible(1, 2));
        assert.isFalse(treeGenerationVisible(1, 3));
    });

    suite.test('G2 起三代全開', () => {
        for (const stage of [2, 3, 4] as const) {
            for (const generation of [1, 2, 3] as const) {
                assert.isTrue(treeGenerationVisible(stage, generation));
            }
        }
    });

    return suite;
}
