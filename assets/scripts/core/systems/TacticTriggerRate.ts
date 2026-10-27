// @spec-source → 育成與戰鬥公式基準手冊 §4.1（INT 戰法發動率）；WBS FORM-05（PROG-2-1263）
/**
 * TacticTriggerRate — 戰法發動率（INT 檢核器，純邏輯，不依賴 cc）
 *
 * 發動率 = 1 − K / INT，再加上戰法的 Success_Bonus，夾在 0..1 之間。
 * 規格範例：INT 300 ≈ 70%、INT 1200 ≈ 92.5%，由 K = 90 同時符合兩例。
 *
 * 暫定：
 *   - 規格列寫「1−9000/INT」，但與範例數字不一致（9000/300 會得到負值）。
 *     本檔以範例為準取 K = 90；待企劃確認 9000 是否應為百分制（9000/100 = 90）。
 *   - INT ≤ 0 視為發動率 0。
 *
 * Unity 對照：像一條 AnimationCurve 的解析式，INT 越高越接近 100%，Bonus 是額外加成。
 */

/** 發動率公式的分子常數（暫定，見檔頭說明） */
export const TACTIC_TRIGGER_K = 90;

/** 戰法發動率 0..1；successBonus 為戰法自身的發動加成（同樣是 0..1 比例） */
export function tacticTriggerRate(int: number, successBonus = 0): number {
    if (!Number.isFinite(int) || int <= 0) return 0;
    const base = 1 - TACTIC_TRIGGER_K / int;
    return Math.max(0, Math.min(1, base + successBonus));
}
