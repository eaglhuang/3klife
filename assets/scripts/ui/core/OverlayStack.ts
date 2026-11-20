// @spec-source → PROG-2-9164（使用者 2026-11-19 裁決：ESC 通用關最上層彈窗）
/**
 * OverlayStack — 彈窗「最上層」判定（純邏輯，不依賴 cc）
 *
 * 畫面層把每個彈窗的「是否開著」與「由根到自己的 siblingIndex 路徑」交進來，
 * 這裡只回答：ESC 該關哪一個。沒有開著的彈窗回傳 null（ESC 不做事）。
 * 路徑以字典序比較：同一父節點下 siblingIndex 大者在上；不同父節點時，上層父節點內的全部都在上面。
 */
export interface OverlayCandidate {
    id: string;
    active: boolean;
    /** 由根節點往下每層的 siblingIndex */
    order: readonly number[];
}

/** 比較兩條路徑；回傳正數代表 a 在 b 上面 */
export function compareOverlayOrder(a: readonly number[], b: readonly number[]): number {
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
}

/** 取開著的彈窗中最上層的一個；沒有則回傳 null */
export function pickTopOverlay(candidates: readonly OverlayCandidate[]): OverlayCandidate | null {
    let top: OverlayCandidate | null = null;
    for (const candidate of candidates) {
        if (!candidate.active) continue;
        if (top === null || compareOverlayOrder(candidate.order, top.order) > 0) top = candidate;
    }
    return top;
}
