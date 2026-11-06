// @spec-source → 主戰場UI規格書.md §4.1 Toast 提示（doc_ui_0001，PROG-2-1894）
/**
 * ToastMotion — Toast 停留與上浮消失的參數（純邏輯，不依賴 cc）
 *
 * 規格 §4.1：出現 2 秒後自動上浮消失。
 * 呼叫端沒指定時長時用 TOAST_DEFAULT_HOLD_SEC；停留不少於 TOAST_MIN_HOLD_SEC，避免一閃即逝。
 * 消失時同時淡出並向上移 TOAST_RISE_PX。
 *
 * Unity 對照：像 DOTween 序列的參數表（Delay → Join(DOFade, DOLocalMoveY)）。
 */

export const TOAST_DEFAULT_HOLD_SEC = 2;
export const TOAST_MIN_HOLD_SEC = 0.2;
export const TOAST_FADE_SEC = 0.3;
export const TOAST_RISE_PX = 40;

/** 停留秒數：未指定或無效時用預設 2 秒，且不少於下限 */
export function toastHoldSec(duration?: number): number {
    if (duration === undefined || !Number.isFinite(duration)) return TOAST_DEFAULT_HOLD_SEC;
    return Math.max(TOAST_MIN_HOLD_SEC, duration);
}
