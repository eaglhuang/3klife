// @spec-source → 道具系統（付費免費道具）.md §掉落機率（極限任務）；WBS ITM-07（PROG-2-1366）
/**
 * ExtremeTaskDrop — 極限任務掉落表與抽樣（純邏輯，不依賴 cc）。
 *
 * 機率：黃金 70%、劣質高粱 15%、戰法筆記 10%、補元散 5%。
 * 黃金數量在 100~500 之間均勻抽取（暫定，規格只寫範圍，未寫分布）。
 * 隨機來源由呼叫端注入，測試可固定種子；不直接用 Math.random 以外的全域狀態。
 *
 * 暫定：劣質高粱與戰法筆記的道具 id 尚未進 PlayerInventory 的 ItemDef，這裡先以規格代號定義常數。
 *
 * Unity 對照：像一張 Weighted Loot Table 的 ScriptableObject，抽一次 Random.value 落在哪一段就掉哪一項。
 */
import type { RandomSource } from './GeneralAging';
import { ITEM_VITALITY_PILL } from './PlayerInventory';

export const EXTREME_TASK_ITEM_SORGHUM = 'ITEM_SORGHUM';
export const EXTREME_TASK_ITEM_TACTIC_NOTE = 'ITEM_TACTIC_NOTE';
export const EXTREME_TASK_GOLD_MIN = 100;
export const EXTREME_TASK_GOLD_MAX = 500;

export type ExtremeTaskDrop =
    | { kind: 'gold'; amount: number }
    | { kind: 'item'; itemId: string; count: 1 };

/** 掉落機率（百分比，總和 100）；順序即抽樣區段順序。 */
export const EXTREME_TASK_DROP_WEIGHTS: ReadonlyArray<{ readonly kind: 'gold' | 'sorghum' | 'note' | 'pill'; readonly percent: number }> = Object.freeze([
    { kind: 'gold', percent: 70 },
    { kind: 'sorghum', percent: 15 },
    { kind: 'note', percent: 10 },
    { kind: 'pill', percent: 5 },
]);

/** 抽一次極限任務掉落；random 回傳 [0, 1)。 */
export function rollExtremeTaskDrop(random: RandomSource = Math.random): ExtremeTaskDrop {
    const roll = random() * 100;
    let threshold = 0;
    for (const entry of EXTREME_TASK_DROP_WEIGHTS) {
        threshold += entry.percent;
        if (roll < threshold) return dropOf(entry.kind, random);
    }
    return dropOf('pill', random);
}

function dropOf(kind: 'gold' | 'sorghum' | 'note' | 'pill', random: RandomSource): ExtremeTaskDrop {
    switch (kind) {
        case 'gold': {
            const span = EXTREME_TASK_GOLD_MAX - EXTREME_TASK_GOLD_MIN + 1;
            const amount = EXTREME_TASK_GOLD_MIN + Math.min(span - 1, Math.floor(random() * span));
            return { kind: 'gold', amount };
        }
        case 'sorghum':
            return { kind: 'item', itemId: EXTREME_TASK_ITEM_SORGHUM, count: 1 };
        case 'note':
            return { kind: 'item', itemId: EXTREME_TASK_ITEM_TACTIC_NOTE, count: 1 };
        case 'pill':
            return { kind: 'item', itemId: ITEM_VITALITY_PILL, count: 1 };
    }
}
