/**
 * ExtremeTaskDrop.test.ts — 極限任務掉落表（ITM-07，PROG-2-1366）headless 測試
 *
 * 鎖住：機率權重總和 100 且順序與規格一致；區段邊界落點正確；黃金數量在 100~500；
 * 大量抽樣的分布落在規格機率 ±1.5 個百分點內。
 *
 * Unity 對照：EditMode Test 用固定種子抽樣一萬次，統計各項比例是否符合權重表。
 */
import { assert, TestSuite } from './TestRunner';
import {
    EXTREME_TASK_DROP_WEIGHTS,
    EXTREME_TASK_GOLD_MAX,
    EXTREME_TASK_GOLD_MIN,
    EXTREME_TASK_ITEM_SORGHUM,
    EXTREME_TASK_ITEM_TACTIC_NOTE,
    rollExtremeTaskDrop,
} from '../assets/scripts/core/systems/ExtremeTaskDrop';
import { ITEM_VITALITY_PILL } from '../assets/scripts/core/systems/PlayerInventory';

function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

export function createExtremeTaskDropSuite(): TestSuite {
    const suite = new TestSuite('ExtremeTaskDrop (極限任務掉落 ITM-07 PROG-2-1366)');

    suite.test('權重總和為 100，順序為黃金、高粱、筆記、補元散', () => {
        const total = EXTREME_TASK_DROP_WEIGHTS.reduce((sum, entry) => sum + entry.percent, 0);
        assert.equals(100, total);
        assert.equals('gold,sorghum,note,pill', EXTREME_TASK_DROP_WEIGHTS.map((entry) => entry.kind).join(','));
    });

    suite.test('區段邊界：0 落黃金、69.99 落黃金、70 落高粱、84.99 落高粱、85 落筆記、95 落補元散', () => {
        const at = (roll: number) => rollExtremeTaskDrop(() => roll / 100);
        assert.equals('gold', at(0).kind);
        assert.equals('gold', at(69.99).kind);
        assert.equals(EXTREME_TASK_ITEM_SORGHUM, (at(70) as { itemId: string }).itemId);
        assert.equals(EXTREME_TASK_ITEM_SORGHUM, (at(84.99) as { itemId: string }).itemId);
        assert.equals(EXTREME_TASK_ITEM_TACTIC_NOTE, (at(85) as { itemId: string }).itemId);
        assert.equals(ITEM_VITALITY_PILL, (at(95) as { itemId: string }).itemId);
    });

    suite.test('黃金數量在 100~500 之間（含端點）', () => {
        // 第一次抽的是掉落區段（0 落黃金），第二次抽的是黃金數量
        const sequence = (values: number[]) => {
            let index = 0;
            return () => values[index++];
        };
        const low = rollExtremeTaskDrop(sequence([0, 0]));
        const high = rollExtremeTaskDrop(sequence([0, 0.999999]));
        assert.equals(EXTREME_TASK_GOLD_MIN, (low as { amount: number }).amount);
        assert.equals(EXTREME_TASK_GOLD_MAX, (high as { amount: number }).amount);
    });

    suite.test('一萬次抽樣的分布落在規格機率 ±1.5 個百分點內', () => {
        const random = seeded(20261027);
        const counts: Record<string, number> = { gold: 0, ITEM_SORGHUM: 0, ITEM_TACTIC_NOTE: 0, ITEM_VITALITY_PILL: 0 };
        const samples = 10000;
        for (let i = 0; i < samples; i++) {
            const drop = rollExtremeTaskDrop(random);
            const key = drop.kind === 'gold' ? 'gold' : drop.itemId;
            counts[key] += 1;
        }
        const expected: Record<string, number> = { gold: 70, ITEM_SORGHUM: 15, ITEM_TACTIC_NOTE: 10, ITEM_VITALITY_PILL: 5 };
        for (const key of Object.keys(expected)) {
            const percent = (counts[key] / samples) * 100;
            assert.isTrue(Math.abs(percent - expected[key]) <= 1.5, `${key} 實際 ${percent.toFixed(2)}%`);
        }
    });

    return suite;
}
