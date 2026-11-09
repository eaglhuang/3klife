// @spec-source → 家族血統關係圖鑑節點與視覺佈局規格書 (doc_spec_0330) §1~§3（KIN-07，PROG-2-2123）
/**
 * RelationGraphController — 關係圖鑑畫面的流程（純邏輯，不依賴 cc）。
 *
 * 只決定「現在以誰為中心、哪些節點顯示、簡卡要寫什麼」；擺位與畫線交給 RelationGraphRenderer。
 *
 * 暫定：
 * - 規格的雙擊重新置中，改成「再按一次同一節點」，手機與滑鼠操作一致。
 * - 簡卡的官職與共同出征次數目前沒有資料來源，先不顯示；加成只寫關係是否生效。
 * - 圓周最多 16 格，超出的依排序捨去並提示人數。
 *
 * Unity 對照：像 MVP 的 Presenter，輸出 ViewModel，不碰 GameObject。
 */
import { buildRelationGraph, radialPositions, type RelationGraphEdge } from '../../core/systems/RelationGraph';
import { RING_NODE_SIZE, RELATION_PEEK_SIZE, relationEdgeStyle, relationPeekIntimacyText, sortRelationGraph, type RelationEdgeStyle } from '../../core/systems/RelationGraphStyle';
import { RELATION_TYPE_LABELS } from '../../core/systems/RelationGraphView';
import type { HistoricalPairTable } from '../../core/systems/HistoricalPairs';
import type { DynamicRelation } from '../../core/systems/KinRelation';

export const RELATION_GRAPH_SLOTS = 16;

/** 簡卡與節點之間的空隙 */
const PEEK_GAP = 8;

export interface RelationGraphDeps {
    table(): HistoricalPairTable | null;
    relations(): readonly DynamicRelation[];
    nameOf(generalId: string): string;
}

export interface RelationGraphNodeView {
    id: string;
    name: string;
    /** 圓周座標；y 為負表示往上，畫面端自行換算 */
    x: number;
    y: number;
    edges: readonly RelationGraphEdge[];
    styles: readonly RelationEdgeStyle[];
}

export type RelationNodeTapResult = 'peek' | 'recenter' | 'none';

export class RelationGraphController {
    private _centerId: string | null = null;
    private _nodes: RelationGraphNodeView[] = [];
    private _hiddenCount = 0;
    private _peekSlot = -1;

    constructor(private readonly _deps: RelationGraphDeps) {}

    public get centerId(): string | null { return this._centerId; }
    public get nodes(): readonly RelationGraphNodeView[] { return this._nodes; }

    /** 以指定武將為中心重排，並收起簡卡。 */
    public open(centerId: string): void {
        const graph = sortRelationGraph(buildRelationGraph(centerId, this._deps.table(), this._deps.relations()));
        const visible = graph.nodes.slice(0, RELATION_GRAPH_SLOTS);
        const positions = radialPositions(visible.length);
        this._centerId = centerId;
        this._hiddenCount = graph.nodes.length - visible.length;
        this._peekSlot = -1;
        this._nodes = visible.map((node, i) => ({
            id: node.id,
            name: this._deps.nameOf(node.id),
            x: positions[i].x,
            y: positions[i].y,
            edges: node.edges,
            styles: node.edges.map(relationEdgeStyle),
        }));
    }

    /** 第一次按開簡卡；再按同一格改以該武將為中心。 */
    public tapNode(slot: number): RelationNodeTapResult {
        const node = this._nodes[slot];
        if (!node) return 'none';
        if (slot !== this._peekSlot) {
            this._peekSlot = slot;
            return 'peek';
        }
        this.open(node.id);
        return 'recenter';
    }

    /** 簡卡中心座標（與節點同座標系），放在節點朝外那一側；沒開簡卡回傳 null。 */
    public peekPosition(): { x: number; y: number } | null {
        const node = this._nodes[this._peekSlot];
        if (!node) return null;
        const side = node.x >= 0 ? 1 : -1;
        return { x: node.x + side * (RING_NODE_SIZE / 2 + PEEK_GAP + RELATION_PEEK_SIZE.width / 2), y: node.y };
    }

    public getFlowView(): { texts: Record<string, string>; actives: Record<string, boolean> } {
        const texts: Record<string, string> = {
            relationTitle: '關係圖鑑',
            relationHint: '點選武將看情誼，再按一次改以該武將為中心',
            relationCenterName: this._centerId ? this._deps.nameOf(this._centerId) : '',
            relationEmpty: '這位武將目前沒有可顯示的關係',
            relationOverflow: this._hiddenCount > 0 ? `另有 ${this._hiddenCount} 位未顯示` : '',
        };
        const actives: Record<string, boolean> = {
            relationEmpty: this._nodes.length === 0,
            relationOverflow: this._hiddenCount > 0,
            relationPeek: this._peekSlot >= 0,
        };
        for (let i = 0; i < RELATION_GRAPH_SLOTS; i += 1) {
            const node = this._nodes[i];
            actives[`relationNode${i}`] = !!node;
            texts[`relationNodeName${i}`] = node?.name ?? '';
        }
        Object.assign(texts, this._peekTexts());
        return { texts, actives };
    }

    private _peekTexts(): Record<string, string> {
        const node = this._nodes[this._peekSlot];
        if (!node) return { peekName: '', peekRelation: '', peekIntimacy: '', peekStatus: '' };
        const labels = node.edges.map((edge) => RELATION_TYPE_LABELS[edge.type] ?? '').filter((label) => label !== '');
        const intimacies = node.edges.flatMap((edge) => (edge.intimacy === null ? [] : [edge.intimacy]));
        const intimacy = intimacies.length > 0 ? Math.max(...intimacies) : null;
        return {
            peekName: node.name,
            peekRelation: labels.join('、'),
            peekIntimacy: `親密度 ${relationPeekIntimacyText(intimacy)}`,
            peekStatus: node.edges.some((edge) => edge.active) ? '關係生效中' : '關係已失效',
        };
    }
}
