/**
 * UIBackdropLayout.ts — 彈窗遮罩的歸屬與層級計算（純函式，PROG-2-9122）
 *
 * 規則（與任何特定視窗無關）：
 *   1. 遮罩只屬於「登記為開啟、且節點真的顯示中」的最上層彈窗；全部關完就沒有擁有者，遮罩收掉。
 *   2. 遮罩永遠緊貼在擁有者正下方，不動擁有者本身的層級。
 */

export interface BackdropCandidate {
    /** 管理器是否認為它開著 */
    readonly open: boolean;
    /** 節點是否真的顯示中（被元件自己 hide() 關掉時為 false） */
    readonly shown: boolean;
}

/** 節點是否顯示中：失效或階層內未啟用都算沒顯示；沒有這些欄位的替身節點視為顯示中 */
export function isNodeShown(node: { isValid?: boolean; activeInHierarchy?: boolean } | null | undefined): boolean {
    if (!node) return false;
    return node.isValid !== false && node.activeInHierarchy !== false;
}

/**
 * 從「由低到高」排列的候選裡挑出遮罩擁有者：最後一個 open 且 shown 的。
 * 回傳其索引；沒有則 -1（代表不該有遮罩）。
 */
export function pickBackdropOwnerIndex(candidatesLowToHigh: readonly BackdropCandidate[]): number {
    for (let index = candidatesLowToHigh.length - 1; index >= 0; index -= 1) {
        const candidate = candidatesLowToHigh[index];
        if (candidate.open && candidate.shown) return index;
    }
    return -1;
}

/**
 * 遮罩要設定的 siblingIndex：使遮罩緊貼在擁有者正下方、且擁有者不必移動。
 * setSiblingIndex 會先把節點從原位抽出，因此遮罩原本在擁有者下方時，擁有者的索引會少 1。
 */
export function backdropIndexBelowOwner(ownerIndex: number, backdropIndex: number): number {
    const target = backdropIndex >= 0 && backdropIndex < ownerIndex ? ownerIndex - 1 : ownerIndex;
    return Math.max(0, target);
}
