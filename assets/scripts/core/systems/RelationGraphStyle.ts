// @spec-source → 家族血統關係圖鑑節點與視覺佈局規格書 (doc_spec_0330) §1~§3（KIN-07，PROG-2-2006）
/**
 * RelationGraphStyle — 關係圖鑑的節點排序、連線樣式與縮放互動數值（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 排序：史實（夫妻 → 義兄弟 → 宿敵）在前，其餘依動態親密度高到低順時針排列。
 * - 連線：夫妻 3px 實線 #FF69B4；義兄弟 3px 實線 #FFD700；宿敵 2px 鋸齒 #8B0000；
 *   戰友 2px 虛線 #00BFFF；結緣/結義 2px 虛線 #2ECC71；親密度歸零 1px 點線 #666666 透明 40%。
 * - 節點：中心 80px、圓周 56px；情誼簡卡 220×140；雙擊重新置中 0.4 秒；縮放 0.6~1.5 倍，超出回彈。
 *
 * 圓周座標沿用 RelationGraph.radialPositions（R=240）。
 * 暫定：既有 buildRelationGraph 依 id 字母排序，本檔另立 sortRelationGraph 依規格重排，畫面接線另卡。
 * 史實型別對應：COUPLE＝夫妻、SWORN＝義兄弟、RIVAL＝宿敵；師徒、君臣規格未列，排在宿敵之後並借用金色實線 2px。
 * 動態型別：COMRADE＝戰友；DYNAMIC_SWORN 與 SPOUSE（結緣）＝綠虛線；PARENT_CHILD 規格未列，暫用綠虛線。
 * Unity 對照：像 LineRenderer 的樣式表與 Cinemachine 的縮放限制。
 */
import { radialPositions, RelationGraph, RelationGraphEdge, RELATION_GRAPH_RADIUS } from './RelationGraph';

export type EdgeLineStyle = 'solid' | 'zigzag' | 'dashed' | 'dotted';

export interface RelationEdgeStyle {
    line: EdgeLineStyle;
    width: number;
    color: string;
    alpha: number;
    badge: string;
}

export const CENTER_NODE_SIZE = 80;
export const RING_NODE_SIZE = 56;
export const RELATION_PEEK_SIZE = { width: 220, height: 140 } as const;
export const RECENTER_TWEEN_SEC = 0.4;
export const RELATION_ZOOM_MIN = 0.6;
export const RELATION_ZOOM_MAX = 1.5;

const HISTORICAL_STYLE: Readonly<Record<string, RelationEdgeStyle>> = {
    COUPLE: { line: 'solid', width: 3, color: '#FF69B4', alpha: 1, badge: '連理同心印' },
    SWORN: { line: 'solid', width: 3, color: '#FFD700', alpha: 1, badge: '桃園雙劍印' },
    RIVAL: { line: 'zigzag', width: 2, color: '#8B0000', alpha: 1, badge: '斷魂裂刃印' },
};
const HISTORICAL_FALLBACK: RelationEdgeStyle = { line: 'solid', width: 2, color: '#FFD700', alpha: 1, badge: '' };
const COMRADE_STYLE: RelationEdgeStyle = { line: 'dashed', width: 2, color: '#00BFFF', alpha: 1, badge: '疾風鐵盾印' };
const BOND_STYLE: RelationEdgeStyle = { line: 'dashed', width: 2, color: '#2ECC71', alpha: 1, badge: '同心青竹印' };
const INACTIVE_STYLE: RelationEdgeStyle = { line: 'dotted', width: 1, color: '#666666', alpha: 0.4, badge: '裂隙鎖孔' };

/** 單條連線的樣式；動態關係失效（親密度歸零）一律灰點線。 */
export function relationEdgeStyle(edge: RelationGraphEdge): RelationEdgeStyle {
    if (edge.kind === 'historical') return HISTORICAL_STYLE[edge.type] ?? HISTORICAL_FALLBACK;
    if (!edge.active) return INACTIVE_STYLE;
    return edge.type === 'COMRADE' ? COMRADE_STYLE : BOND_STYLE;
}

const HISTORICAL_RANK: Readonly<Record<string, number>> = { COUPLE: 0, SWORN: 1, RIVAL: 2 };
const HISTORICAL_OTHER_RANK = 3;

function nodeSortKey(edges: readonly RelationGraphEdge[]): { tier: number; intimacy: number } {
    let tier = Number.POSITIVE_INFINITY;
    let intimacy = -1;
    for (const e of edges) {
        if (e.kind === 'historical') tier = Math.min(tier, HISTORICAL_RANK[e.type] ?? HISTORICAL_OTHER_RANK);
        else intimacy = Math.max(intimacy, e.intimacy ?? 0);
    }
    return { tier, intimacy };
}

/** 依規格排序節點並重算圓周座標；同序保持原順序。 */
export function sortRelationGraph(graph: RelationGraph, radius = RELATION_GRAPH_RADIUS): RelationGraph {
    const ordered = graph.nodes
        .map((n, i) => ({ n, i, k: nodeSortKey(n.edges) }))
        .sort((a, b) => a.k.tier - b.k.tier || b.k.intimacy - a.k.intimacy || a.i - b.i)
        .map((x) => x.n);
    const pos = radialPositions(ordered.length, radius);
    return { centerId: graph.centerId, nodes: ordered.map((n, i) => ({ ...n, x: pos[i].x, y: pos[i].y })) };
}

/** 縮放限制：放開手後回彈到 0.6~1.5。 */
export function clampRelationZoom(zoom: number): number {
    if (!Number.isFinite(zoom)) return 1;
    return Math.min(RELATION_ZOOM_MAX, Math.max(RELATION_ZOOM_MIN, zoom));
}

/** 拖曳時超出邊界的阻尼位移（回彈前的橡皮筋效果，阻尼 0.5）。 */
export function rubberBandOffset(offset: number, limit: number): number {
    const l = Math.abs(limit);
    if (Math.abs(offset) <= l) return offset;
    const sign = offset < 0 ? -1 : 1;
    return sign * (l + (Math.abs(offset) - l) * 0.5);
}

/** 情誼簡卡的親密度文字，如 85/100。 */
export function relationPeekIntimacyText(intimacy: number | null): string {
    return intimacy === null ? '—' : `${Math.max(0, Math.min(100, Math.round(intimacy)))}/100`;
}
