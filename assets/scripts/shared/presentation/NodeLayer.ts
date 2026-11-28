/**
 * NodeLayer.ts — 動態建立節點的 layer 繼承工具
 *
 * Cocos 的 new Node() 預設 layer 是 DEFAULT，UI 相機只看 UI_2D，所以執行期 new 出來的節點
 * 如果沒設 layer 就會整個看不見（PROG-2-10231 單挑舞台就踩過）。
 * 規則：動態建立的節點一律用 addChildInherit 加進父節點，或建好整串後呼叫 inheritLayer，
 * 讓整棵子樹的 layer 跟父節點一致。
 * Unity 對照：相當於建立 GameObject 後設定 gameObject.layer = parent.layer（含所有子物件）。
 */
import type { Node } from 'cc';

/** 把 node 與其全部子孫的 layer 設成 layer（已相同的略過，不重複寫） */
export function setLayerDeep(node: Node, layer: number): void {
    if (node.layer !== layer) node.layer = layer;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) setLayerDeep(kids[i], layer);
}

/** 讓 node 整棵子樹繼承它目前父節點的 layer；沒有父節點就不動 */
export function inheritLayer(node: Node): void {
    const parent = node.parent;
    if (parent) setLayerDeep(node, parent.layer);
}

/** parent.addChild(child) 並讓 child 整棵子樹繼承 parent.layer，回傳 child 方便串接 */
export function addChildInherit<T extends Node>(parent: Node, child: T): T {
    parent.addChild(child);
    setLayerDeep(child, parent.layer);
    return child;
}
