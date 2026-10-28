// @spec-source → 育成與戰鬥公式基準手冊.md §7.2-3 體力與疲勞反饋系統（FORM-11）
/**
 * VitalityBarView — 戰場體力條的顯示數值（FORM-11，純邏輯，不依賴 cc）
 *
 * 規格重點：
 * - 武將血條下方的細條，顯示「破釜沉舟」後的體力燃燒進度（精力比例）
 * - 體力歸零時，條的底板變灰，表示已無法發動大招（喘氣動畫不在本檔範圍）
 *
 * 邊界：上限無效（非有限數或 ≤0）時比例視為 0，不猜測；精力為 NaN 時視為 0 並變灰。
 *
 * Unity 對照：像 Slider 的 value 計算函式，只回傳 0~1 的 fillAmount 與一個 bool，
 * 由 View 元件把它套到 RectTransform 寬度與底板顏色上。
 */

/** 體力條填充比例，夾在 0~1；輸入無效時回傳 0 */
export function vitalityBarRatio(current: number, max: number): number {
    if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) return 0;
    return Math.min(1, Math.max(0, current / max));
}

/** 體力歸零（或輸入無效）時底板變灰 */
export function isVitalityBarGrayed(current: number): boolean {
    return !Number.isFinite(current) || current <= 0;
}
