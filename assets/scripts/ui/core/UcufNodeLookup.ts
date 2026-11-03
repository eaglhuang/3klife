// @spec-source → UI-2-0146（UI-2-0123 子項）：UCUF 節點依語意 id 查找
/**
 * UcufNodeLookup — 依 layout 的 _ucufId（由 HTML data-ucuf-id 轉出）找 runtime 節點。
 *
 * UIPreviewBuilder 建節點時把 _ucufId 記在節點上；轉換器產生的節點名稱是 div_N 流水號，
 * 設計稿改版就會變，所以畫面邏輯應改用語意 id 找節點。
 * 只依賴 { children } 結構，不 import cc，方便單元測試。
 * Unity 對照：像 GameObject.FindWithTag，但只在指定根節點底下找。
 */

export interface UcufLookupNode {
    readonly children: readonly UcufLookupNode[];
}

export function ucufIdOf(node: UcufLookupNode): string | null {
    const id = (node as { _ucufId?: unknown })._ucufId;
    return typeof id === 'string' && id.length > 0 ? id : null;
}

/** 深度優先找第一個 _ucufId 相符的節點（含 root 自己）；找不到回傳 null。 */
export function findUcufNode<T extends UcufLookupNode>(root: T, id: string): T | null {
    if (ucufIdOf(root) === id) return root;
    for (const child of root.children) {
        const hit = findUcufNode(child as T, id);
        if (hit) return hit;
    }
    return null;
}

/** 收集 root 底下所有帶 _ucufId 的節點；同 id 重複時保留第一個。 */
export function collectUcufNodes<T extends UcufLookupNode>(root: T): Map<string, T> {
    const out = new Map<string, T>();
    const walk = (node: T): void => {
        const id = ucufIdOf(node);
        if (id && !out.has(id)) out.set(id, node);
        for (const child of node.children) walk(child as T);
    };
    walk(root);
    return out;
}
