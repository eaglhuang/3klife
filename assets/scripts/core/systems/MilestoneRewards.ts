// @spec-source → 武將戰績系統.md §里程碑門檻（成就與獎勵表）、§因子覺醒條件；隱藏因子的因子 ID 待因子字典確認，稱號與虎符品質提升的細節待企劃（PM 2026-10-14）
/**
 * MilestoneRewards — 里程碑達成後的獎勵內容（純邏輯，不依賴 cc）
 *
 * 判定條件已在 BattleRecordStats（BATTLE_MILESTONES / newlyReachedMilestones）。
 * 本模組只負責「達成後發什麼」：獎勵資料表與依新達成的里程碑組出獎勵清單。
 *
 * Unity 對照：像 ScriptableObject 的獎勵表；達成事件只讀取，發放由呼叫端寫入背包。
 */
import { newlyReachedMilestones, type BattleRecordLike } from './BattleRecordStats';
import { addItem, ITEM_BATTLE_NOTE, type PlayerInventory } from './PlayerInventory';

export type MilestoneRewardItem =
    | { readonly kind: 'tacticNote'; readonly count: number }
    | { readonly kind: 'title'; readonly titleId: string }
    | { readonly kind: 'tallyQualityUp' }
    | { readonly kind: 'spiritWallAnimation' }
    | { readonly kind: 'hiddenFactor'; readonly name: string; readonly color: 'white' | 'red'; readonly factorId: string };

/**
 * 獎勵表（依規格「成就與獎勵」）。
 * - 稱號 titleId 為暫定佔位，名稱待企劃。
 * - 隱藏因子 factorId 對應 gene-dictionary.json 的 gene_hidden_*（PM 暫定裁定 2026-10-14，白色／紅色標 provisional，待 KIN-05 裁決後只需改字典）。
 */
export const MILESTONE_REWARDS: Readonly<Record<string, readonly MilestoneRewardItem[]>> = {
    KILL_100: [{ kind: 'tacticNote', count: 1 }],
    KILL_1000: [
        { kind: 'tacticNote', count: 3 },
        { kind: 'title', titleId: 'TITLE_KILL_1000_PLACEHOLDER' },
    ],
    KILL_10000: [{ kind: 'tallyQualityUp' }, { kind: 'spiritWallAnimation' }],
    UNDEFEATED_50: [{ kind: 'hiddenFactor', name: '不敗', color: 'white', factorId: 'gene_hidden_undefeated' }],
    GUARDIAN_WALL: [{ kind: 'hiddenFactor', name: '鐵壁', color: 'white', factorId: 'gene_hidden_iron_wall' }],
    ASURA: [{ kind: 'hiddenFactor', name: '殺意', color: 'red', factorId: 'gene_hidden_killing_intent' }],
};

/** 依里程碑 id 組出獎勵清單，依輸入順序；未知 id 略過 */
export function rewardsForMilestones(milestoneIds: readonly string[]): MilestoneRewardItem[] {
    return milestoneIds.flatMap((id) => MILESTONE_REWARDS[id] ?? []);
}

export interface MilestoneClaim {
    /** 這次新達成的里程碑 id；呼叫端須把它們寫入 record.milestones，才不會重複發放 */
    readonly newIds: string[];
    readonly rewards: MilestoneRewardItem[];
}

/**
 * 把里程碑獎勵中的戰法筆記寫入庫存（GEN-13 / PROG-2-0816）。
 * 只處理 tacticNote；稱號、虎符品質、因子等其他獎勵由各自系統接手，這裡原樣略過。
 * 回傳新庫存，不修改傳入的物件。
 */
export function grantTacticNotes(inventory: PlayerInventory, rewards: readonly MilestoneRewardItem[]): PlayerInventory {
    return rewards.reduce((acc, reward) => (reward.kind === 'tacticNote' ? addItem(acc, ITEM_BATTLE_NOTE, reward.count) : acc), inventory);
}

/** 判定新達成的里程碑並組出獎勵；只讀取 record，不修改它 */
export function claimMilestoneRewards(record: BattleRecordLike): MilestoneClaim {
    const newIds = newlyReachedMilestones(record);
    return { newIds, rewards: rewardsForMilestones(newIds) };
}
