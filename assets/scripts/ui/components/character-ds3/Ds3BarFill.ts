// @spec-source → 武將人物介面規格書.md (doc_ui_0012)
/** 進度條填色的寬度與 x（PROG-2-1696）：填色左緣貼齊軌道左緣，不論兩者錨點在哪 */
export interface Ds3BarFillPlacement {
    width: number;
    x: number;
}

export function placeDs3BarFill(trackWidth: number, trackAnchorX: number, fillAnchorX: number, ratio: number): Ds3BarFillPlacement {
    const safeRatio = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
    const width = Math.round(trackWidth * safeRatio);
    return { width, x: -trackWidth * trackAnchorX + width * fillAnchorX };
}
