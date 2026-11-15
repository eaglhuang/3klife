// @spec-source → 使用者裁定（轉蛋立繪大小不一）：統一腳底基準線、統一身高比例縮放、以最高者驗算頭頂不出畫面；PROG-2-9037
/**
 * GachaPortraitBaseline — 轉蛋橫幅立繪的統一腳底基準線與身高比例換算（純數學，不依賴 cc）
 *
 * 規則（資料驅動，數值來自 data/general-portrait-bounds.json，由 tools_node/measure-gacha-portrait-bounds.js 量測）：
 * - 每張立繪量出不透明邊界（頭頂 top、腳底 bottom、水平中心 cx）。原圖畫布大小不一，所以只看人物本身，不看畫布。
 * - 所有立繪的腳底都貼同一條基準線 baselineY。
 * - 每人的身高 = bodyHeight × heightRatio（heightRatio 預設 1，即統一身高比例）。縮放係數 s = bodyHeight × heightRatio ÷ (bottom − top)。
 * - 水平：人物不透明中心對齊框中線 centerX。
 * - 驗算：以身高比例最大的那位算頭頂位置，確認不超過 headLimitY；比他矮的一定也在畫面內。
 *
 * 座標與 LobbyScene 的 _applyGachaBannerPortrait 一致：以立繪所在 artNode 的錨點為原點、y 向上。
 *
 * Unity 對照：Sprite 的 pivot 統一設在腳底、依身高把每張圖換成同一個 pixels-per-unit。
 */

/** 量測結果（原圖像素，y 向下） */
export interface PortraitBounds {
    /** 原圖寬高 */
    w: number;
    h: number;
    /** 第一列不透明像素（頭頂） */
    top: number;
    /** 最後一列不透明像素 + 1（腳底下緣） */
    bottom: number;
    /** 不透明像素水平中心 */
    cx: number;
    /** 身高比例，預設 1；比 1 大代表此人比標準身高高 */
    heightRatio?: number;
}

export interface PortraitBoundsDoc {
    portraits?: Record<string, PortraitBounds>;
}

/** 框內的統一幾何（同一個 artNode 座標系） */
export interface BaselineFrame {
    /** 腳底基準線（y） */
    baselineY: number;
    /** 頭頂上限（y，畫面頂端留邊後的位置） */
    headLimitY: number;
    /** 人物中線（x） */
    centerX: number;
}

export interface PortraitPlacement {
    /** 縮放係數（原圖 px → 畫面 px） */
    scale: number;
    /** 立繪節點的內容尺寸 */
    width: number;
    height: number;
    /** 立繪節點中心（錨點 0.5,0.5） */
    x: number;
    y: number;
}

export interface BaselineFitReport {
    ok: boolean;
    /** 身高比例最大的那位 */
    tallestId: string | null;
    /** 該位頭頂 y（越大越高） */
    tallestHeadY: number;
    headLimitY: number;
}

/** 標準身高（畫面 px）：從腳底基準線到頭頂上限的距離，所有立繪共用 */
export function standardBodyHeight(frame: BaselineFrame): number {
    return frame.headLimitY - frame.baselineY;
}

/** 單張立繪在統一基準下的縮放與位置 */
export function placePortraitOnBaseline(bounds: PortraitBounds, frame: BaselineFrame): PortraitPlacement {
    const body = bounds.bottom - bounds.top;
    if (!(body > 0)) throw new Error('portrait bounds: body height must be positive');
    const ratio = bounds.heightRatio ?? 1;
    const scale = (standardBodyHeight(frame) * ratio) / body;
    return {
        scale,
        width: bounds.w * scale,
        height: bounds.h * scale,
        // 水平：不透明中心對齊人物中線（節點中心 = 中線 + (w/2 − cx) × s）
        x: frame.centerX + (bounds.w / 2 - bounds.cx) * scale,
        // 垂直：腳底（bottom）落在基準線上（節點中心 = 基準 + (bottom − h/2) × s）
        y: frame.baselineY + (bounds.bottom - bounds.h / 2) * scale,
    };
}

/** 頭頂在畫面內的 y（節點座標）：基準線 + 身高 × 比例 */
export function headTopY(bounds: PortraitBounds, frame: BaselineFrame): number {
    return frame.baselineY + standardBodyHeight(frame) * (bounds.heightRatio ?? 1);
}

/** 以身高比例最大者驗算：頭頂不得超過上限，比他矮的一定也不超出 */
export function verifyBaselineFits(portraits: Readonly<Record<string, PortraitBounds>>, frame: BaselineFrame): BaselineFitReport {
    let tallestId: string | null = null;
    let tallestRatio = -Infinity;
    for (const [id, b] of Object.entries(portraits)) {
        const ratio = b.heightRatio ?? 1;
        if (ratio > tallestRatio) {
            tallestRatio = ratio;
            tallestId = id;
        }
    }
    const tallestHeadY = tallestId ? headTopY(portraits[tallestId], frame) : frame.baselineY;
    return { ok: tallestHeadY <= frame.headLimitY + 1e-6, tallestId, tallestHeadY, headLimitY: frame.headLimitY };
}
