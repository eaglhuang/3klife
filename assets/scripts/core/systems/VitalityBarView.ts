// @spec-source → 育成與戰鬥公式基準手冊.md §7.2-3 體力與疲勞反饋系統（FORM-11）
import { vitalityBandOf, type VitalityBand } from './VitalityBattleGate';
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

// ── 名牌旁精力能量環（武將壽命系統 §UI 可視化要求，PROG-2-1853）──

/** 能量環顏色：充足飽和紫光、中段弱火琥珀、枯竭灰暗（RGB） */
export const VITALITY_RING_COLORS: Readonly<Record<VitalityBand, readonly [number, number, number]>> = {
    high: [180, 120, 255],
    mid: [230, 170, 80],
    exhausted: [120, 120, 120],
};

export interface VitalityRingView {
    /** 弧長比例 0~1 */
    ratio: number;
    band: VitalityBand;
    /** 環中百分比文字，例：「72%」 */
    text: string;
    color: readonly [number, number, number];
}

/** 能量環顯示資料；區段沿用戰場精力分段（vitalityBandOf） */
export function vitalityRingView(current: number, max: number): VitalityRingView {
    const ratio = vitalityBarRatio(current, max);
    const band = vitalityBandOf(Number.isFinite(current) ? current : 0, Number.isFinite(max) && max > 0 ? max : 1);
    return { ratio, band, text: `${Math.round(ratio * 100)}%`, color: VITALITY_RING_COLORS[band] };
}
