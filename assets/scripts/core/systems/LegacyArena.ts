// @spec-source → 武將壽命系統.md §名將保值（演武聖境）；數值係數為暫定（PM 2026-10-14，待定案）
/**
 * LegacyArena — 演武聖境：死亡名將的精華快照與付費復活（純邏輯，不依賴 cc）
 *
 * 規格：死後精華快照 = TP × 0.5，轉為可繼承資源；付費復活回復特定數值。
 *
 * Unity 對照：像一張集中的 ScriptableObject 數值表，策劃調數值只改這裡，
 * 流程程式（快照、復活）不用跟著動。
 */

/**
 * 演武聖境的數值表。
 * 只有 snapshotRatio 來自規格，其餘為暫定（PM 2026-10-14 決定：規格未定前先給一組可調的值）。
 * 調整時只改這裡；定案後記錄到待辦文件並更新此註解。
 */
export const LEGACY_ARENA_TUNING = {
    /** 精華快照係數：規格 TP × 0.5 */
    snapshotRatio: 0.5,
    /** 單次快照上限，避免高戰力名將無限累積（暫定） */
    snapshotCap: 300,
    /** 付費復活時，快照中回復到武將身上的比例（暫定） */
    reviveRestoreRatio: 0.3,
} as const;

export type LegacyArenaTuning = {
    readonly snapshotRatio: number;
    readonly snapshotCap: number;
    readonly reviveRestoreRatio: number;
};

/** 死亡時的精華快照量：floor(TP × 係數)，不超過上限；無效輸入回 0 */
export function legacySnapshotOf(totalPower: number, tuning: LegacyArenaTuning = LEGACY_ARENA_TUNING): number {
    if (!Number.isFinite(totalPower) || totalPower <= 0) return 0;
    return Math.min(tuning.snapshotCap, Math.floor(totalPower * tuning.snapshotRatio));
}

/** 付費復活時回復的精華量：floor(快照 × 回復係數)；無效輸入回 0 */
export function legacyReviveRestoreOf(snapshot: number, tuning: LegacyArenaTuning = LEGACY_ARENA_TUNING): number {
    if (!Number.isFinite(snapshot) || snapshot <= 0) return 0;
    return Math.floor(snapshot * tuning.reviveRestoreRatio);
}
