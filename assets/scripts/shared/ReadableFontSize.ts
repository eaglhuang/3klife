// @spec-source → 見 docs/cross-reference-index.md（PROG-2-9433）
/**
 * ReadableFontSize — 小螢幕最小可讀字級（純邏輯，無引擎相依）
 *
 * 專案設計解析度 1920×1080，手機橫屏 812×375 時整個畫面縮成約 0.35 倍，
 * 設計稿 26px 的字在手機上只剩約 9 CSS px，看不清楚。
 * 這裡算出「縮放後至少 12 CSS px」需要的設計字級；桌機縮放夠大時原字級不變，
 * 所以網頁原稿的字型設定在桌機照舊，只有小螢幕放大。
 *
 * 任何 UI 想在手機放大過小的字都可共用；引擎端取縮放比例用 ui/core/ReadableText.ts。
 *
 * Unity 對照：類似依 Canvas Scaler 的 scaleFactor 反推 TextMeshPro 的最小字級。
 */

/** 手機上最小可讀字級（CSS px）；Apple 建議最小 11pt，取 12 留一點餘裕 */
export const MIN_READABLE_CSS_PX = 12;

/**
 * 畫面縮放比例（設計 px → CSS px）。
 * 專案依視窗比例在 FIXED_HEIGHT／FIXED_WIDTH 間切換（AdaptiveResolution），兩者剛好都等於寬高縮放取小者。
 */
export function screenCssScale(frameWidth: number, frameHeight: number, designWidth: number, designHeight: number): number {
    if (!(frameWidth > 0) || !(frameHeight > 0) || !(designWidth > 0) || !(designHeight > 0)) return 1;
    return Math.min(frameWidth / designWidth, frameHeight / designHeight);
}

/** 縮放後低於最小可讀字級時，回傳放大後的設計字級；夠大或輸入無效時原值不變 */
export function readableFontSize(designPx: number, cssScale: number, minCssPx: number = MIN_READABLE_CSS_PX): number {
    if (!(designPx > 0) || !(cssScale > 0) || !(minCssPx > 0)) return designPx;
    if (designPx * cssScale >= minCssPx) return designPx;
    return Math.ceil(minCssPx / cssScale);
}

/** 字級放大時行高跟著等比放大（四捨五入），維持原本的行距比例 */
export function readableLineHeight(designFontPx: number, designLineHeight: number, readableFontPx: number): number {
    if (!(designFontPx > 0) || !(designLineHeight > 0) || readableFontPx <= designFontPx) return designLineHeight;
    return Math.round(designLineHeight * readableFontPx / designFontPx);
}
