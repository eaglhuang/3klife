/**
 * GeneralDetailBloodlineChild
 *
 * UCUF M4 ChildPanel — 血脈 Tab（Bloodline）。
 * 對應 fragment: gd-tab-bloodline.json
 * dataSource: 'config'
 *
 * AncestorTree 的動態渲染委託給已存在的 BloodlineTreePanel；
 * 此 ChildPanel 負責附掛元件並轉送 generalId。
 */
import { Button, Label, UITransform } from 'cc';
import type { Node } from 'cc';
import { ChildPanelBase } from '../../core/ChildPanelBase';
import type { UISkinResolver } from '../../core/UISkinResolver';
import type { UITemplateBinder } from '../../core/UITemplateBinder';
import type { GeneralConfig } from '../../../core/models/GeneralUnit';
import { mask, formatGene } from './GeneralDetailFormatters';
import { hiddenFactorLine } from '../../core/HiddenFactorText';
import { FactorMaskPresenter } from '../../../core/systems/FactorMaskState';
import type { AncestorPeekView } from '../../../core/systems/AncestorTreeLayout';
import { BloodlineTreePanel } from '../../panels/BloodlineTreePanel';
import { UCUFLogger, LogCategory } from '../../../core/utils/UCUFLogger';
import { services } from '../../../core/managers/ServiceLoader';
import { spiritSlotActions, type SpiritSlotAction } from '../../../core/systems/BloodlineRightPanelLayout';
import { spiritSlotViewOf } from '../../../core/systems/SpiritSlotState';
import {
    STORY_DOCK_VISIBLE_CELLS,
    nextStoryDockState,
    storyDockLayout,
    type StoryDockGesture,
    type StoryDockStateName,
} from '../../../core/systems/BloodlineStoryDockLayout';

/** 玩家發現等級；服務尚未初始化時退回 1（只顯示藍粉因子） */
function currentDiscoveryLevel(): number {
    try {
        return services().session.discoveryLevel;
    } catch {
        return 1;
    }
}

export class GeneralDetailBloodlineChild extends ChildPanelBase {
    override dataSource = 'config';
    private static readonly ROOT_PATH = 'TabBloodlineContent';

    private _lEpRating!:  Label;
    private _lBloodline!: Label;
    private _lParents!:   Label;
    private _lAncestors!: Label;
    private _lGenes:      Label[] = [];
    /** 因子遮罩的上一次狀態（PROG-2-0513）；justRevealed 交給 View 播亮起動畫 */
    private _maskPresenter = new FactorMaskPresenter();
    private _justRevealed: number[] = [];
    /** 本次資料更新剛解鎖的因子槽位（0-based）；動畫由 View 讀取 */
    get justRevealedSlots(): readonly number[] { return this._justRevealed; }
    private _lAwakening!: Label;
    private _lHiddenFactor!: Label;
    private _lSpiritSlotValue!: Label;
    private _treePanel: BloodlineTreePanel | null = null;
    private _peekNode: Node | null = null;
    private _peekTitle!: Label;
    private _peekTendency!: Label;
    private _peekLine!: Label;
    /** 故事抽屜目前三態（GDUI-06）；預設收合 */
    private _storyDockState: StoryDockStateName = 'COLLAPSED';
    private _stageNode: Node | null = null;
    private _storyDockNode: Node | null = null;
    private _storyCells: Node[] = [];
    _lastData: GeneralConfig | null = null;

    constructor(hostNode: Node, skinResolver: UISkinResolver, binder: UITemplateBinder) {
        super(hostNode, skinResolver, binder);
    }

    async onMount(_spec: Record<string, unknown>): Promise<void> {
        const h = this.hostNode;

        this._lEpRating  = this._label(h, 'BloodlineStage/BloodlineRightPanel/BloodlineSummaryCard/EpRatingValue');
        this._lBloodline = this._label(h, 'BloodlineStage/BloodlineRightPanel/BloodlineSummaryCard/BloodlineValue');
        this._lParents   = this._label(h, 'BloodlineStage/BloodlineRightPanel/BloodlineSummaryCard/ParentsValue');
        this._lAncestors = this._label(h, 'BloodlineStage/BloodlineRightPanel/BloodlineSummaryCard/AncestorsValue');
        this._lAwakening = this._label(h, 'BloodlineStage/BloodlineRightPanel/AwakeningCard/AwakeningValue');
        this._lHiddenFactor = this._label(h, 'BloodlineStage/BloodlineRightPanel/HiddenFactorCard/HiddenFactorValue');
        this._lSpiritSlotValue = this._label(h, 'BloodlineStage/BloodlineRightPanel/SpiritSlotCard/SpiritSlotCardValue');

        for (let i = 1; i <= 5; i++) {
            this._lGenes.push(this._label(h, `BloodlineStage/BloodlineRightPanel/GeneListCard/Gene${i}Value`));
        }

        // 掛載 BloodlineTreePanel 到 AncestorTree 根節點
        this._stageNode = this._requireNode(h, 'BloodlineStage');
        this._storyDockNode = this._requireNode(h, 'StoryDock');
        for (let i = 1; i <= 6; i++) {
            this._storyCells.push(this._requireNode(h, `StoryDock/StoryCell${i}`));
        }
        this.applyStoryDockLayout();

        const treeRoot = this._requireNode(h, 'BloodlineStage/BloodlineLeftField/AncestorTree');
        let panel = treeRoot.getComponent(BloodlineTreePanel);
        if (!panel) panel = treeRoot.addComponent(BloodlineTreePanel);
        panel.gen1Container = treeRoot.getChildByPath('Gen1Container');
        panel.gen2Container = treeRoot.getChildByPath('Gen2Container');
        panel.gen3Container = treeRoot.getChildByPath('Gen3Container');
        this._treePanel = panel;

        // 祖先 peek（PROG-2-1278）：點擊卡片在樹旁顯示小面板
        this._peekNode = this._requireNode(h, 'BloodlineStage/BloodlineLeftField/AncestorTree/AncestorPeek');
        this._peekNode.active = false;
        this._peekTitle = this._label(h, 'BloodlineStage/BloodlineLeftField/AncestorTree/AncestorPeek/PeekTitle');
        this._peekTendency = this._label(h, 'BloodlineStage/BloodlineLeftField/AncestorTree/AncestorPeek/PeekTendency');
        this._peekLine = this._label(h, 'BloodlineStage/BloodlineLeftField/AncestorTree/AncestorPeek/PeekLine');
        panel.onCardPeek = (view) => this._showPeek(view);
        if (this._lastData) this.onDataUpdate(this._lastData);
    }

    onDataUpdate(data: unknown): void {
        this._lastData = data as GeneralConfig;
        const cfg = this._lastData;

        this._set(this._lEpRating,
            `${this.t('ui.general.bloodline.ep_rating')}${cfg.ep !== undefined ? `${cfg.ep}${cfg.epRating ? ` · ${cfg.epRating}` : ''}` : this.t('ui.general.bloodline.ep_locked')}`
        );
        this._set(this._lBloodline, `${this.t('ui.general.bloodline.id')}${mask(cfg.bloodlineId)}`);
        this._set(this._lParents,   `${this.t('ui.general.bloodline.parents')}${mask(cfg.parentsSummary, this.t('ui.general.bloodline.parents_collapsed'))}`);
        this._set(this._lAncestors, `${this.t('ui.general.bloodline.ancestors')}${mask(cfg.ancestorsSummary, this.t('ui.general.bloodline.ancestors_hint'))}`);

        const maskState = this._maskPresenter.update(cfg.id, cfg.genes ?? [], currentDiscoveryLevel());
        this._justRevealed = maskState.justRevealed;
        for (let i = 0; i < 5; i++) {
            this._set(this._lGenes[i], formatGene(i + 1, cfg.genes?.[i], currentDiscoveryLevel()));
        }

        this._set(this._lAwakening, `${this.t('ui.general.bloodline.awakening')}${mask(cfg.awakeningTitle, this.t('ui.general.bloodline.awakening_locked'))}`);
        this._set(this._lHiddenFactor, hiddenFactorLine(cfg.genes, (key) => this.t(key)));
        this._applySpiritSlot(cfg.id);

        // AncestorTree 動態載入
        if (this._treePanel) {
            void this._treePanel.loadForGeneral(cfg.id).catch(() => {
                this._populateLegacyTree(cfg);
            });
        }
    }

    protected override _refreshLabels(): void {
        if (this._lastData) this.onDataUpdate(this._lastData);
    }

    validateDataFormat(data: unknown): string | null {
        if (!data || typeof data !== 'object') return 'data must be a GeneralConfig object';
        return null;
    }

    // ─── Legacy 祖先樹回退 ────────────────────────────────────────────────────

    private _populateLegacyTree(cfg: GeneralConfig): void {
        const tree = (cfg as any).ancestorTree;
        if (!tree) return;
        const base = this.hostNode.getChildByPath(`${GeneralDetailBloodlineChild.ROOT_PATH}/BloodlineStage/BloodlineLeftField/AncestorTree`);
        if (!base) return;

        for (let i = 0; i < 8; i++) {
            const n = tree.gen1?.[i];
            this._setPath(base, `Gen1Container/G1_${i}/Txt`, n ? `${n.name}\n(${n.gene?.displayName ?? '?'})` : '—');
        }
        for (let i = 0; i < 4; i++) {
            const n = tree.gen2?.[i];
            this._setPath(base, `Gen2Container/G2_${i}/Txt`, n ? `${n.name}\n(${n.gene?.displayName ?? '?'})` : '—');
        }
        for (let i = 0; i < 2; i++) {
            const n = tree.gen3?.[i];
            this._setPath(base, `Gen3Container/G3_${i}/Txt`, n ? `${n.name}\n(${n.gene?.displayName ?? '?'})` : '—');
        }
    }

    private _setPath(base: Node, path: string, text: string): void {
        const lbl = base.getChildByPath(path)?.getComponent(Label);
        if (lbl) lbl.string = text;
    }

    /** 依手勢切換故事抽屜三態（拖拉把手的 cc 事件由 View 呼叫，GDUI-06） */
    stepStoryDock(gesture: StoryDockGesture): void {
        this._storyDockState = nextStoryDockState(this._storyDockState, gesture);
        this.applyStoryDockLayout();
    }

    get storyDockState(): StoryDockStateName { return this._storyDockState; }

    /** 依目前三態重排：抽屜高度與主血統區互相吃剩下的高度，並顯示對應格數（不 overlay） */
    applyStoryDockLayout(): void {
        const containerHeight = this.hostNode.getComponent(UITransform)?.height ?? 0;
        const layout = storyDockLayout(containerHeight, 0, this._storyDockState);
        const stageTf = this._stageNode?.getComponent(UITransform);
        if (stageTf) stageTf.height = layout.stageHeight;
        const dockTf = this._storyDockNode?.getComponent(UITransform);
        if (dockTf) dockTf.height = layout.dockHeight;
        const visible = STORY_DOCK_VISIBLE_CELLS[this._storyDockState];
        this._storyCells.forEach((cell, i) => { cell.active = i < visible; });
    }

    /**
     * 命槽五按鈕的可用性與裝配狀態（GDUI-05 接線，PROG-2-1277）。
     * 戰鬥鎖定暫傳 false：大廳命頁不會在戰鬥中開啟（PM 2026-10-27 裁定 a）。
     */
    private _applySpiritSlot(generalId: string): void {
        let records: Parameters<typeof spiritSlotViewOf>[0] = [];
        try {
            records = services().session.inventoryRecords;
        } catch {
            records = [];
        }
        const view = spiritSlotViewOf(records, generalId, false);
        const plan = spiritSlotActions(view.state);

        const valueText = view.state.occupied
            ? (view.state.isMain ? '已裝配（主卡）' : '已裝配')
            : '未裝配';
        this._set(this._lSpiritSlotValue, valueText);

        const buttonNames: Record<SpiritSlotAction, string> = {
            insert: 'SlotInsertButton',
            replace: 'SlotReplaceButton',
            unequip: 'SlotUnequipButton',
            setMain: 'SlotSetMainButton',
            detail: 'SlotDetailButton',
        };
        for (const { action, enabled } of plan.actions) {
            const node = this.hostNode.getChildByPath(
                `${GeneralDetailBloodlineChild.ROOT_PATH}/BloodlineStage/BloodlineRightPanel/SpiritSlotCard/${buttonNames[action]}`,
            );
            const button = node?.getComponent(Button) ?? node?.addComponent(Button);
            if (button) button.interactable = enabled;
        }

        this._bindSpiritSlotClick('SlotUnequipButton', generalId, () => services().session.unequipSpiritCard(generalId, false));
        this._bindSpiritSlotClick('SlotSetMainButton', generalId, () => services().session.setPrimarySpiritCard(generalId, false));
    }

    /** 綁定命槽按鈕點擊；動作成功與否都重畫命槽狀態（PROG-2-1284）。 */
    private _bindSpiritSlotClick(buttonName: string, generalId: string, act: () => unknown): void {
        const node = this.hostNode.getChildByPath(
            `${GeneralDetailBloodlineChild.ROOT_PATH}/BloodlineStage/BloodlineRightPanel/SpiritSlotCard/${buttonName}`,
        );
        if (!node) return;
        node.off(Button.EventType.CLICK);
        node.on(Button.EventType.CLICK, () => {
            act();
            this._applySpiritSlot(generalId);
        });
    }

    private _showPeek(view: AncestorPeekView): void {
        if (!this._peekNode) return;
        this._peekNode.active = true;
        this._set(this._peekTitle, view.title);
        this._set(this._peekTendency, view.tendency);
        this._set(this._peekLine, view.lines.join(' · '));
    }

    private _label(root: Node, path: string): Label {
        const fullPath = `${GeneralDetailBloodlineChild.ROOT_PATH}/${path}`;
        const label = root.getChildByPath(fullPath)?.getComponent(Label);
        if (!label) {
            UCUFLogger.error(LogCategory.LIFECYCLE, `[BloodlineChild] 必要 Label 缺失 ${fullPath}`);
            throw new Error(`[BloodlineChild] 必要 Label 缺失 ${fullPath}`);
        }
        return label;
    }

    private _requireNode(root: Node, path: string): Node {
        const fullPath = `${GeneralDetailBloodlineChild.ROOT_PATH}/${path}`;
        const node = root.getChildByPath(fullPath);
        if (!node) {
            UCUFLogger.error(LogCategory.LIFECYCLE, `[BloodlineChild] 缺少必要節點 ${fullPath}`);
            throw new Error(`[BloodlineChild] 缺少必要節點 ${fullPath}`);
        }
        return node;
    }

    private _set(label: Label | null, text: string): void {
        if (label) label.string = text;
    }
}
