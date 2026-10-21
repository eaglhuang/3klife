// @spec-source → 血統樹14人UI規格書 §3.3 資料流（config 一次遞迴 14 位先祖）；BUI-03；PROG-2-1029
/**
 * BloodlineTreeFlatten — 把深層嵌套的基因樹一次遞迴成 14 位先祖的 slot 表（純邏輯，不依賴 cc）。
 *
 * - 根節點是子代本人，不放進輸出；父系走 F、母系走 M，slot 代碼與 PEDIGREE_SLOTS 相同。
 * - 只展開三代（slot 長度最多 3），第四代以後的資料忽略，不會無限遞迴。
 * - 某一支缺節點（null / undefined）時，該 slot 與其下所有子 slot 都不出現。
 *
 * Unity 對照：像遍歷一棵 Transform 階層，依路徑名稱（F、M 組合）把每個子物件登記到表裡，
 * 找不到的路徑就不登記，不會因為少一個節點而整棵樹崩掉。
 */
import { type PedigreeSlot } from '../services/BloodlineGraph';

export const ANCESTOR_TREE_MAX_DEPTH = 3;

export interface AncestorTreeNode<T> {
    data: T;
    father?: AncestorTreeNode<T> | null;
    mother?: AncestorTreeNode<T> | null;
}

/** 依 slot 代碼回傳先祖資料；未知的先祖不會出現在結果中。 */
export function flattenAncestorTree<T>(root: AncestorTreeNode<T> | null | undefined): Partial<Record<PedigreeSlot, T>> {
    const result: Partial<Record<PedigreeSlot, T>> = {};
    if (!root) return result;
    collect(root, '', result);
    return result;
}

function collect<T>(
    node: AncestorTreeNode<T>,
    path: string,
    out: Partial<Record<PedigreeSlot, T>>,
): void {
    if (path.length >= ANCESTOR_TREE_MAX_DEPTH) return;
    const branches: Array<['F' | 'M', AncestorTreeNode<T> | null | undefined]> = [
        ['F', node.father],
        ['M', node.mother],
    ];
    for (const [side, child] of branches) {
        if (!child) continue;
        const next = path + side;
        out[next as PedigreeSlot] = child.data;
        collect(child, next, out);
    }
}
