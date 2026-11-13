// @spec-source → 使用者 11/13 裁決：新手十連要全螢幕滿版；PROG-2-9022
// 引擎中立：只吃寬高，Cocos／Unity 都可用
/** 滿版十連：面板等比放大到舞台 FULL_PANEL_FILL 比例，只放大不縮小 */
const FULL_PANEL_FILL = 0.94;
export function fullScreenPanelScale(stage: { width: number; height: number } | null | undefined, panel: { width: number; height: number } | null | undefined): number {
    if (!stage || !panel || panel.width <= 0 || panel.height <= 0) return 1;
    return Math.max(1, Math.min(stage.width * FULL_PANEL_FILL / panel.width, stage.height * FULL_PANEL_FILL / panel.height));
}
