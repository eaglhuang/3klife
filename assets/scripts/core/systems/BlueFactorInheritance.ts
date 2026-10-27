// @spec-source → 育成與戰鬥公式基準手冊 §5.1 藍色因子（基礎屬性）機率；WBS FORM-08（PROG-2-1275）
/**
 * BlueFactorInheritance — 藍色 3 星因子的繼承機率（純邏輯，不依賴 cc）
 *
 * 規格 §5.1：
 *   - 數值 < 600：0%
 *   - 600 ≤ 數值 < 1100：6%
 *   - 數值 ≥ 1100：10%
 *
 * 暫定 / 待企劃確認：
 *   - §5.1 寫「數值」，沒有指明是哪一項屬性；本檔只接受呼叫端傳入的數值。
 *   - §5.2 世代相性對白、紅因子的影響只有定性描述，沒有數字，本檔不實作。
 *
 * Unity 對照：像一張分段 AnimationCurve 的查表，三個區間各一個固定值，邊界值屬於較高的那一段。
 */

export const BLUE_FACTOR_TIER_LOW = 600;
export const BLUE_FACTOR_TIER_HIGH = 1100;

/** 數值對應的 3 星藍色因子機率（0..1）；非有限值視為 0 */
export function blueFactorInheritChance(value: number): number {
    if (!Number.isFinite(value) || value < BLUE_FACTOR_TIER_LOW) return 0;
    if (value < BLUE_FACTOR_TIER_HIGH) return 0.06;
    return 0.1;
}
