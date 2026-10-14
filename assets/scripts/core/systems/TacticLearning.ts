/**
 * TacticLearning — 戰法學習 TP 門檻（NUR-10 續，純邏輯，不依賴 cc）
 *
 * 暫定規則（PM 裁定 2026-10-14）：學習門檻 = 該戰法 TP 消耗 × 2；
 * 玩家持有 TP 達此門檻才可學習。
 *
 * Unity 對照：像 Skill.CanLearn(player)，只回傳 bool，不直接扣錢或改存檔。
 */
export const TACTIC_LEARN_THRESHOLD_MULTIPLIER = 2;

function isUsableNumber(value: number): boolean {
    return Number.isFinite(value);
}

/** 學習門檻：TP 消耗 × 2。非有限數或負值視為 0（不擋學習，交由上游資料驗證）。 */
export function tacticLearnThreshold(tpCost: number): number {
    if (!isUsableNumber(tpCost) || tpCost <= 0) return 0;
    return tpCost * TACTIC_LEARN_THRESHOLD_MULTIPLIER;
}

/** 持有 TP 是否達到學習門檻。持有值非有限數或為負時一律不可學。 */
export function canLearnTactic(heldTp: number, tpCost: number): boolean {
    if (!isUsableNumber(heldTp) || heldTp < 0) return false;
    return heldTp >= tacticLearnThreshold(tpCost);
}
