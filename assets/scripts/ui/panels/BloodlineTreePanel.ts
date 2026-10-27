// @spec-source → DC-3-0004 | 資料中心架構規格書.md §2.3
import { _decorator, Button, Component, Label, Node } from 'cc';
import { BloodlineGraph, type Pedigree, type PedigreeSlot } from '../../core/services/BloodlineGraph';
import { resolveFactorColor, type FactorColor } from '../../core/systems/FactorInheritance';
import { services } from '../../core/managers/ServiceLoader';
import { buildBloodlineTreeSlots, BloodlineTreeSlot } from '../../core/systems/BloodlineTreeSlots';
import { treeCardNodeName } from '../../core/systems/BloodlineTreeBinding';
import { buildNodeCards } from '../../core/systems/BloodlineNodeCards';
import { redrawBloodlineTreeConnections } from '../components/BloodlineTreeLines';
import { ancestorPeekView, isAncestorRevealed, type AncestorPeekView } from '../../core/systems/AncestorTreeLayout';

const { ccclass, property } = _decorator;

/** peek 需要的祖先欄位（PersonRecord 的子集） */
type PeekPerson = { name: string; faction: string; core_tags?: string[]; is_virtual: boolean };

/**
 * BloodlineTreePanel — 祖先樹 UI 元件
 *
 * 從 PersonRegistry (BloodlineGraph) 讀取祖先資料渲染樹狀 UI，
 * 取代直接讀取 Ancestors_JSON 嵌套結構的舊做法。
 *
 * Unity 對照：類似一個自定義 UIDocument 綁定器，
 * 以扁平的 Dictionary<uid, PersonRecord> 查表取代嵌套 ScriptableObject 樹。
 *
 * Prefab 接線：
 *   gen1Container → 曾祖父母容器（8 個子節點命名 NodeCard_G1_0..7，各含 Txt Label）
 *   gen2Container → 祖父母容器  （4 個子節點命名 NodeCard_G2_0..3，各含 Txt Label）
 *   gen3Container → 父母容器    （2 個子節點命名 NodeCard_G3_0..1，各含 Txt Label）
 */
@ccclass('BloodlineTreePanel')
export class BloodlineTreePanel extends Component {
    /** 曾祖父母容器（depth 3，8 個祖先槽） */
    @property(Node)
    gen1Container: Node | null = null;

    /** 祖父母容器（depth 2，4 個祖先槽） */
    @property(Node)
    gen2Container: Node | null = null;

    /** 父母容器（depth 1，2 個祖先槽） */
    @property(Node)
    gen3Container: Node | null = null;

    /** 最近一次載入的 14 人祖譜（依位置），供連線取色（PROG-2-1279） */
    private _pedigree: Pedigree | null = null;
    /** 點擊祖先卡時的 peek 回呼；由命頁 ChildPanel 設定（PROG-2-1278） */
    onCardPeek: ((view: AncestorPeekView) => void) | null = null;

    /**
     * 根據武將 uid 載入並渲染 3 代祖先樹。
     *
     * 呼叫 BloodlineGraph.getAncestorChain() 取得祖先 uid 陣列（BFS 廣度優先），
     * 再以 getPerson() 從 PersonRegistry 查表取得各祖先顯示資料。
     * 不再直接讀取 Ancestors_JSON 嵌套結構。
     */
    async loadForGeneral(uid: string): Promise<void> {
        const graph = BloodlineGraph.getInstance();
        if (!graph.isLoaded) {
            await graph.loadRegistry();
        }

        // getAncestorChain BFS 排列：index 0-1 = 父母、2-5 = 祖父母、6-13 = 曾祖父母
        const slots = buildBloodlineTreeSlots(graph.getAncestorChain(uid, 3));

        this._fillContainer(this.gen3Container, 3, slots.gen3, graph);
        this._fillContainer(this.gen2Container, 2, slots.gen2, graph);
        this._fillContainer(this.gen1Container, 1, slots.gen1, graph);
        this._pedigree = graph.getPedigree(uid);
        this._redrawLines();
    }

    /** 清除所有祖先樹標籤（切換武將時呼叫） */
    clear(): void {
        const slots = buildBloodlineTreeSlots([]);
        this._fillContainer(this.gen3Container, 3, slots.gen3, BloodlineGraph.getInstance());
        this._fillContainer(this.gen2Container, 2, slots.gen2, BloodlineGraph.getInstance());
        this._fillContainer(this.gen1Container, 1, slots.gen1, BloodlineGraph.getInstance());
    }

    // ---- private ----

    /**
     * 依卡片實際位置重畫父子連線（PROG-2-1279）。延後一幀，等版面排好再讀座標。
     * 連線色：祖先格位取 gene_refs 第一個因子的色系；無因子或解析失敗為 null（中性灰）。
     */
    private _redrawLines(): void {
        this.scheduleOnce(() => {
            redrawBloodlineTreeConnections(this.node, buildNodeCards({}), (child) => this._ancestorColor(child));
        }, 0);
    }

    private _ancestorColor(slot: PedigreeSlot): FactorColor | null {
        const uid = this._pedigree?.[slot];
        if (!uid) return null;
        const factorId = BloodlineGraph.getInstance().getPerson(uid)?.gene_refs?.[0];
        if (!factorId) return null;
        let dictionary;
        try {
            dictionary = services().session.factorDictionary;
        } catch {
            dictionary = undefined;
        }
        return resolveFactorColor(factorId, dictionary);
    }

    private _fillContainer(
        container: Node | null,
        row: 1 | 2 | 3,
        slots: BloodlineTreeSlot[],
        graph: BloodlineGraph
    ): void {
        if (!container) return;
        for (let i = 0; i < slots.length; i++) {
            const uid = slots[i].uid;
            const person = uid ? graph.getPerson(uid) : null;
            const cardNode = container.getChildByPath(treeCardNodeName(row, i));
            if (cardNode) this._bindPeek(cardNode, person);
            const txtNode = container.getChildByPath(`${treeCardNodeName(row, i)}/Txt`);
            if (!txtNode) continue;
            const label = txtNode.getComponent(Label);
            if (!label) continue;
            label.string = person ? this._formatAncestorLabel(person) : '—';
        }
    }

    /** 點擊卡片發出 peek；removeAll 避免重新填充時疊加多個回呼 */
    private _bindPeek(cardNode: Node, person: PeekPerson | null): void {
        const button = cardNode.getComponent(Button) ?? cardNode.addComponent(Button);
        button.node.off(Button.EventType.CLICK);
        button.node.on(Button.EventType.CLICK, () => this._emitPeek(person));
    }

    private _emitPeek(person: PeekPerson | null): void {
        if (!this.onCardPeek) return;
        const source = person
            ? { name: person.name, faction: this._formatFaction(person.faction), core_tags: person.core_tags }
            : null;
        this.onCardPeek(ancestorPeekView(source, person ? isAncestorRevealed(person) : false));
    }

    private _formatAncestorLabel(person: { name: string; faction: string; gene_refs: string[]; is_virtual: boolean }): string {
        const factionLine = person.is_virtual ? '虛擬祖先' : this._formatFaction(person.faction);
        const geneCount = Array.isArray(person.gene_refs) ? person.gene_refs.length : 0;
        return `${person.name}\n${factionLine}\n因子 ${geneCount}`;
    }

    private _formatFaction(faction: string): string {
        switch (faction) {
            case 'player': return '玩家';
            case 'enemy': return '敵方';
            case 'wei': return '魏';
            case 'shu': return '蜀';
            case 'wu': return '吳';
            case 'neutral': return '中立';
            default: return faction || '未知';
        }
    }
}
