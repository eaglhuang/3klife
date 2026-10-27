// @spec-source → 領地治理系統 §E #9 非培育子嗣內政、§F 非培育子嗣內政職位（郡城縣令）；PROG-2-1162
/**
 * ChildMagistrate — 子嗣擔任郡城縣令的加成規則（純邏輯，不依賴 cc）
 *
 * 規格：郡城縣令「黃金產出 +20%」，Official_Output = Base_Output × (1 + Child_RelevantStat / 100)。
 * 暫定：縣令推薦「任何子嗣」沒指定屬性，暫用政治（POL）；
 * 「未進入培育鏡像」目前沒有對應狀態，暫以名冊中存活的子嗣為準。
 *
 * Unity 對照：一組靜態公式，像 ScriptableObject 上的 OfficeConfig 加一個 GetBonus(stat)。
 */

/** 郡城縣令基礎黃金加成（規格 +20%） */
export const MAGISTRATE_BASE_GOLD_BONUS = 0.2;

/** 子嗣判定：有父或母（與 LegacyService 的後代判定一致） */
export function isDescendant(general: { fatherId?: string; motherId?: string }): boolean {
    return Boolean(general.fatherId?.trim() || general.motherId?.trim());
}

/** 縣令的黃金加成比例 = 20% × (1 + POL / 100) */
export function magistrateGoldBonus(pol: number): number {
    // 先用整數百分比相乘再除，避免 0.2 × 1.5 的浮點誤差
    return (Math.round(MAGISTRATE_BASE_GOLD_BONUS * 100) * (100 + Math.max(0, Math.floor(pol || 0)))) / 10000;
}

/** 加成百分比顯示用（四捨五入到整數） */
export function bonusPercentText(bonus: number): string {
    return `${Math.round(bonus * 100)}%`;
}
