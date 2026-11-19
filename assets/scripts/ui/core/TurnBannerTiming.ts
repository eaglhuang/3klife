// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；回合開始橫幅節奏（PROG-2-1888、PROG-2-9416）
/**
 * 回合開始橫幅的淡入淡出秒數與「畫面上看得到多久」。純模組，不依賴 cc，可單元測試。
 * 提示框（Toast）在橫幅期間要暫停，避免兩者都在畫面中央疊字。
 */

export const TURN_BANNER_FADE_IN_SEC = 0.2;
export const TURN_BANNER_FADE_OUT_SEC = 0.3;
/** 淡入與淡出之間至少停留的秒數 */
export const TURN_BANNER_MIN_HOLD_SEC = 0.3;
/** 第一次顯示要等版面掛載，畫面上會比排定時間晚一點點收掉 */
const MOUNT_SLACK_SEC = 0.25;

/** 橫幅從呼叫 show() 到完全淡出、從畫面消失的秒數（含掛載餘裕）；提示框暫停用 */
export function turnBannerVisibleSeconds(durationSec: number): number {
    return Math.max(durationSec, TURN_BANNER_FADE_IN_SEC + TURN_BANNER_MIN_HOLD_SEC + TURN_BANNER_FADE_OUT_SEC) + MOUNT_SLACK_SEC;
}
