// @spec-source → 血統樹14人UI規格書 §1.1 世代結構、§2.2 節點名稱（NodeCard 命名）；WBS BUI-01 後續綁定；PROG-2-1049
/**
 * BloodlineTreeBinding — 把 14 張先祖卡對應到 bloodline-tree-main.json 的節點名稱（純邏輯，不依賴 cc）。
 *
 * - 第 1 排 8 人（曾祖父母）→ NodeCard_G1_0..7；第 2 排 4 人（祖父母）→ NodeCard_G2_0..3；第 3 排 2 人（父母）→ NodeCard_G3_0..1。
 * - 序號依 PEDIGREE_SLOTS 在同一排內的先後順序，與 buildNodeCards 的產出順序一致。
 * - 卡片文字：空卡顯示「—」；有資料時第一行為名稱，第二行為地點。
 *
 * Unity 對照：像 Layout 的 Prefab 陣列，Inspector 上的每個 child 名字固定，腳本只依名字把資料填進對應 child。
 */
import { type NodeCardView } from './BloodlineNodeCards';

export const TREE_CARD_NODE_PREFIX = 'NodeCard_G';

export interface TreeCardTarget {
    /** bloodline-tree-main.json 內的節點名稱 */
    nodeName: string;
    card: NodeCardView;
}

/** 依排數與同排序號產生節點名稱；排數由 buildNodeCards 的 row 欄位決定（1＝第 1 代，3＝父母）。 */
export function treeCardNodeName(row: 1 | 2 | 3, indexInRow: number): string {
    return `${TREE_CARD_NODE_PREFIX}${row}_${indexInRow}`;
}

/** 把 14 張卡配上節點名稱；同排內保持輸入順序，不重排。 */
export function bindTreeCards(cards: readonly NodeCardView[]): TreeCardTarget[] {
    const counters: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
    return cards.map((card) => {
        const index = counters[card.row];
        counters[card.row] += 1;
        return { nodeName: treeCardNodeName(card.row, index), card };
    });
}

/** 節點上的文字：空卡為「—」，否則名稱換行接地點；名稱為空時也視為空卡。 */
export function treeCardText(card: NodeCardView): string {
    if (card.empty === true) return '—';
    return `${card.name}\n${card.location}`;
}
