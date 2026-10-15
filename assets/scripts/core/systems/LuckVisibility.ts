/**
 * LuckVisibility — 運氣（LUK）屬性的前期隱藏與顯示文字（LUK-01，純邏輯，不依賴 cc）
 *
 * 規格（運氣系統 §I Data Schema、UI 字串表）：
 *   - LUK 是第六屬性，前期隱藏；Lv46 以上才可見（Phase 3 解鎖）。
 *   - 資料欄位 Is_Visible 為 true 時直接顯示；缺值時依等級判定。
 *   - 隱藏時顯示「???（Lv46 解鎖）」，顯示時顯示「天命（LUK）：{Value}」。
 *
 * Unity 對照：像一個 Attribute 的 Visibility 規則，欄位有值就尊重資料，沒有就套預設規則。
 */

/** Phase 3 解鎖等級（規格 UI_LUK_HIDDEN「Lv46 解鎖」） */
export const LUK_REVEAL_LEVEL = 46;
/** LUK 數值上限（與 LuckThresholds.LUK_MAX 同值，紫因子 ★5 上限） */
export const LUK_VALUE_CEILING = 100;

export interface LukVisibilityInput {
    /** 武將等級（Lv） */
    level: number;
    /** 資料欄位 Is_Visible；缺值時依等級判定 */
    isVisible?: boolean;
}

/** LUK 是否對玩家可見：Is_Visible 有值時以它為準，否則看等級是否達 Lv46。 */
export function isLukVisible(input: LukVisibilityInput): boolean {
    if (typeof input.isVisible === 'boolean') return input.isVisible;
    return Number.isFinite(input.level) && input.level >= LUK_REVEAL_LEVEL;
}

/** 把 LUK 數值夾到 0..100 並取整；非有限數視為 0（存檔髒值保護）。 */
export function normalizeLuk(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(LUK_VALUE_CEILING, Math.round(value)));
}

/** 畫面上 LUK 那一列的文字。隱藏時不洩漏數值。 */
export function lukDisplayText(value: number, visible: boolean): string {
    if (!visible) return `天命（LUK）：???（Lv${LUK_REVEAL_LEVEL} 解鎖）`;
    return `天命（LUK）：${normalizeLuk(value)}`;
}
