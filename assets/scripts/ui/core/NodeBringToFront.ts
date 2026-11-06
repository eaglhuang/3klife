/**
 * 把節點移到同層最上方（最後繪製），讓彈窗蓋住後來才動態加進 Canvas 的圖層。
 * 只用結構型別，不依賴 cc，方便單元測試。
 */
export interface SiblingOrderNode {
    parent: { children: ArrayLike<unknown> } | null;
    getSiblingIndex(): number;
    setSiblingIndex(index: number): void;
}

/** 已在最上層時不動；有移動回傳 true */
export function bringNodeToFront(node: SiblingOrderNode): boolean {
    const parent = node.parent;
    if (!parent) return false;
    const top = parent.children.length - 1;
    if (node.getSiblingIndex() >= top) return false;
    node.setSiblingIndex(top);
    return true;
}
