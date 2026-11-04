// @spec-source → 家族關係（史實相性）系統-shards/ab.md §E #6「關係圖鑑 UI」（展示武將的人際網絡圖：節點＋連線）；PROG-2-1728
/**
 * RelationGraph — 組出單一武將的人際網絡圖資料（純邏輯，不依賴 cc）。
 *
 * - 中心是指定武將；其餘節點是與他有史實關係（HistoricalPairTable）或動態關係（DynamicRelationBook）的武將。
 * - 同一位武將可能同時有多條關係（例如史實義兄弟＋戰友），合併成一個節點、多條連線。
 * - 史實關係永遠生效；動態關係親密度歸 0 即標為未生效（與 isDynamicBonusActive 一致），畫面可淡化顯示。
 * - 節點排序：先史實後動態，同類依對方 id 排序，輸出穩定。
 * - 位置以中心為原點平均排在圓周上，第一個節點在正上方、順時針排列。
 *
 * 暫定：版面、半徑、連線樣式規格未定；本檔只給資料與座標，畫面接線另卡。
 *
 * Unity 對照：像 Graph View 的 Model 層，只產出 Node／Edge 資料與座標，View 再依此畫線。
 */
import type { DynamicRelation, DynamicRelationType, HistoricalRelationType } from './KinRelation';
import { isDynamicBonusActive } from './KinDynamicRelations';
import type { HistoricalPairTable } from './HistoricalPairs';

/** 暫定（規格未寫）：節點離中心的距離 */
export const RELATION_GRAPH_RADIUS = 240;

export type RelationEdgeKind = 'historical' | 'dynamic';

export interface RelationGraphEdge {
    kind: RelationEdgeKind;
    type: HistoricalRelationType | DynamicRelationType;
    /** 動態關係的親密度；史實關係為 null */
    intimacy: number | null;
    active: boolean;
}

export interface RelationGraphNode {
    id: string;
    x: number;
    y: number;
    edges: RelationGraphEdge[];
}

export interface RelationGraph {
    centerId: string;
    nodes: RelationGraphNode[];
}

function otherOf(a: string, b: string, centerId: string): string {
    return a === centerId ? b : a;
}

/** 依節點數平均排在圓周上；第一個在正上方（y 為負表示往上），順時針 */
export function radialPositions(count: number, radius = RELATION_GRAPH_RADIUS): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i += 1) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
        positions.push({ x: Math.round(radius * Math.cos(angle)) || 0, y: Math.round(radius * Math.sin(angle)) || 0 });
    }
    return positions;
}

export function buildRelationGraph(
    centerId: string,
    table: HistoricalPairTable | null,
    dynamicRelations: readonly DynamicRelation[],
    radius = RELATION_GRAPH_RADIUS,
): RelationGraph {
    const historical = new Map<string, RelationGraphEdge[]>();
    for (const relation of table?.relationsOf(centerId) ?? []) {
        const other = otherOf(relation.templateA, relation.templateB, centerId);
        const edges = historical.get(other) ?? [];
        edges.push({ kind: 'historical', type: relation.type, intimacy: null, active: true });
        historical.set(other, edges);
    }

    const dynamic = new Map<string, RelationGraphEdge[]>();
    for (const relation of dynamicRelations) {
        if (relation.uidA !== centerId && relation.uidB !== centerId) continue;
        const other = otherOf(relation.uidA, relation.uidB, centerId);
        const edges = dynamic.get(other) ?? [];
        edges.push({ kind: 'dynamic', type: relation.type, intimacy: relation.intimacy, active: isDynamicBonusActive(relation) });
        dynamic.set(other, edges);
    }

    const order = Array.from(historical.keys()).sort();
    for (const id of Array.from(dynamic.keys()).sort()) {
        if (!historical.has(id)) order.push(id);
    }
    const positions = radialPositions(order.length, radius);
    return {
        centerId,
        nodes: order.map((id, i) => ({
            id,
            x: positions[i].x,
            y: positions[i].y,
            edges: [...(historical.get(id) ?? []), ...(dynamic.get(id) ?? [])],
        })),
    };
}
