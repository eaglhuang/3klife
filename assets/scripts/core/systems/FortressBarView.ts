// @spec-source → 主戰場UI規格書.md §2.1 頂部陣地血量條（doc_ui_0001）
/**
 * FortressBarView — 戰場頂部「我軍陣地／敵軍陣地」城寨血條的顯示數值（純邏輯，不依賴 cc）
 *
 * 規格重點：
 * - 頂部長條顯示雙方城寨（陣地）血量；我方藍色、敵方紅色，中央以 VS 分隔
 * - 頭像旁的數字標籤顯示的是主將血量，不在本檔範圍
 *
 * 邊界：上限無效（非有限數或 ≤0）時比例視為 0；血量為 NaN 時視為 0。
 *
 * Unity 對照：像 Slider 的 value 計算函式，只回傳 0~1 的 fillAmount，
 * 由 View 元件把它套到 RectTransform 寬度上。
 */

/** 城寨開場血量（BattleState 開場與重開時填入的值） */
export const FORTRESS_MAX_HP = 500;

/** 城寨血條填充比例，夾在 0~1；輸入無效時回傳 0 */
export function fortressBarRatio(hp: number, max: number = FORTRESS_MAX_HP): number {
    if (!Number.isFinite(hp) || !Number.isFinite(max) || max <= 0) return 0;
    return Math.min(1, Math.max(0, hp / max));
}

/**
 * 守城戰我方城寨血條文字（PROG-2-9430，總PM 11/21 核准；使用者 11/06 裁決「城寨要血條」）。
 * 血量夾在 0~上限並取整，例如「我方城寨 455／500」。
 */
export function defenseFortressBarText(hp: number, max: number = FORTRESS_MAX_HP): string {
    const safeMax = Number.isFinite(max) && max > 0 ? Math.round(max) : FORTRESS_MAX_HP;
    const safeHp = Number.isFinite(hp) ? Math.round(Math.min(safeMax, Math.max(0, hp))) : 0;
    return `我方城寨 ${safeHp}／${safeMax}`;
}

/** 剩餘比例低於這個值時血條改成警示紅（約剩三成） */
export const DEFENSE_FORTRESS_WARN_RATIO = 0.3;
