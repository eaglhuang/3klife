// @spec-source → 主戰場UI規格書.md §2.4 奧義大圓（doc_ui_0001，PROG-2-1892）
/**
 * UltimateRingView — 奧義大圓 SP 環的顯示狀態（純邏輯，不依賴 cc）
 *
 * 規格 §2.4：
 * - SP 滿：環色 #7ec8f7＋呼吸脈衝，文字「發動」
 * - SP 未滿：環色暗淡 #3A8FD9，文字顯示百分比
 *
 * 邊界：上限無效（非有限數或 ≤0）時以 100 計；SP 為 NaN 時視為 0。
 *
 * Unity 對照：像 Image(Filled) 的 ViewModel，回傳 fillAmount、顏色與是否播放脈衝。
 */

export type Rgb = readonly [number, number, number];

export const ULTIMATE_RING_READY_COLOR: Rgb = [0x7e, 0xc8, 0xf7];
export const ULTIMATE_RING_CHARGING_COLOR: Rgb = [0x3a, 0x8f, 0xd9];

/** SP 滿時大圓的呼吸脈衝：放大倍率與單程秒數 */
export const ULTIMATE_READY_PULSE = { scaleMax: 1.06, halfPeriodSec: 0.6 } as const;

export interface UltimateRingState {
    /** 0~1 的填充比例 */
    ratio: number;
    /** 0~100 的整數百分比 */
    pct: number;
    ready: boolean;
    color: Rgb;
}

export function ultimateRingState(sp: number, maxSp: number): UltimateRingState {
    const max = Number.isFinite(maxSp) && maxSp > 0 ? maxSp : 100;
    const cur = Number.isFinite(sp) ? sp : 0;
    const ratio = Math.min(1, Math.max(0, cur / max));
    const pct = Math.round(ratio * 100);
    const ready = pct >= 100;
    return { ratio, pct, ready, color: ready ? ULTIMATE_RING_READY_COLOR : ULTIMATE_RING_CHARGING_COLOR };
}
