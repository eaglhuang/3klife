// @spec-source → 見 docs/cross-reference-index.md  (UCUF M12)
/**
 * GeneralListComposite — 武將列表面板（CompositePanel 版）
 *
 * UCUF M12 — 將 GeneralListPanel（UIPreviewBuilder）遷移至 CompositePanel 架構。
 *
 * 遷移重點：
 *   - buildScreen(layout, skin, i18n, tokens) → mount('general-list-screen')
 *   - onReady(binder)                          → _onAfterBuildReady(binder)
 *   - 公開 API 完全與原 GeneralListPanel 相同（向後相容）
 *
 * Unity 對照：GeneralRosterPanel，排序可重複點擊欄頭切換升降冪
 */
import { _decorator, Node, Label, Button, UITransform, Layout, Widget, HorizontalTextAlignment, VerticalTextAlignment, Color } from 'cc';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import type { NpcDialogueKeywordSelection, NpcDialogueLocale, NpcDialogueModelPreset, NpcDialogueResponse, NpcDialogueSpeechContextMode } from '../../core/services/NpcDialogueService';
import { services } from '../../core/managers/ServiceLoader';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';

const { ccclass } = _decorator;

// 欄位排序 key（對應 header col name → GeneralConfig 欄位）
type SortKey = 'name' | 'gender' | 'age' | 'str' | 'int' | 'lea' | 'pol' | 'cha' | 'luk' | 'troop' | 'faction';
type GeneralFilterMode = 'all' | 'player' | 'enemy';
export interface GeneralListShowOptions {
    npcDialogueDevControls?: boolean;
}

// 兵種等級順序，供排序比較
const APTITUDE_ORDER: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

// 每個 header col name → 對應 SortKey
const COL_SORT_MAP: Record<string, SortKey> = {
    ColName:    'name',
    ColGender:  'gender',
    ColAge:     'age',
    ColStr:     'str',
    ColInt:     'int',
    ColLea:     'lea',
    ColPol:     'pol',
    ColCha:     'cha',
    ColLuk:     'luk',
    ColTroop:   'troop',
    ColFaction: 'faction',
};

const HEADER_TO_ROW_MAP: Record<string, string> = {
    ColName: 'Name',
    ColGender: 'Gender',
    ColAge: 'Age',
    ColStr: 'Str',
    ColInt: 'Int',
    ColLea: 'Lea',
    ColPol: 'Pol',
    ColCha: 'Cha',
    ColLuk: 'Luk',
    ColTroop: 'Troop',
    ColFaction: 'Faction',
};

// 欄頭顯示文字
const DEFAULT_HEADER_LABELS: Record<SortKey, string> = {
    name:    '武將姓名',
    gender:  '性別',
    age:     '年齡',
    str:     '武力',
    int:     '智力',
    lea:     '統率',
    pol:     '政治',
    cha:     '魅力',
    luk:     '運氣',
    troop:   '最強兵種',
    faction: '陣營',
};

const LIST_ROOT_NAME = 'GeneralListRoot';
const LIST_PANEL_REL_PATH = 'MainContainer/ListPanel';
const LIST_REL_PATH = `${LIST_PANEL_REL_PATH}/DataList`;
const HEADER_ROW_REL_PATH = `${LIST_PANEL_REL_PATH}/ColumnHeaderRow`;
const CONTENT_REL_PATH = `${LIST_REL_PATH}/view/Content`;
const NPC_DIALOGUE_TOOLBAR_NAME = 'NpcDialogueDevToolbar';
const NPC_DIALOGUE_MENU_NAME = 'NpcDialogueKeywordMenu';
type NpcDialogueMenuMode = 'keyword' | 'speechContext' | 'model';

const NPC_DIALOGUE_LOCALE_OPTIONS: Array<{ value: NpcDialogueLocale; label: string }> = [
    { value: 'zh-TW', label: '繁中' },
    { value: 'en', label: 'EN' },
    { value: 'ja', label: '日文' },
];

const NPC_DIALOGUE_SPEECH_CONTEXT_OPTIONS: Array<{ value: NpcDialogueSpeechContextMode; label: string }> = [
    { value: 'life_chat', label: '生活聊天' },
    { value: 'encounter_speech', label: '遭遇發言' },
    { value: 'inner_monologue', label: '想法獨白' },
    { value: 'meeting_statement', label: '會議發言' },
];

const NPC_DIALOGUE_MODEL_OPTIONS: Array<{ value: NpcDialogueModelPreset; label: string }> = [
    { value: 'fallback_chain', label: 'Fallback' },
    { value: 'gemini_pro', label: 'Gemini Pro' },
    { value: 'gemini_flash', label: 'Gemini Flash' },
    { value: 'gemini_flash_lite', label: 'Flash Lite' },
    { value: 'qwen2_5_7b', label: 'Qwen 7B' },
    { value: 'qwen2_5_3b', label: 'Qwen 3B' },
    { value: 'deepseek_r1_7b', label: 'DeepSeek R1' },
    { value: 'local_llama_env', label: 'Local Env' },
];

@ccclass('GeneralListComposite')
export class GeneralListComposite extends CompositePanel {

    public static readonly GENERAL_FILTER_ALL = 'all';
    public static readonly GENERAL_FILTER_PLAYER = 'player';
    public static readonly GENERAL_FILTER_ENEMY = 'enemy';

    /** 選中武將時的回呼，外部（如場景/父面板）設定 */
    public onSelectGeneral: ((config: GeneralConfig) => void) | null = null;
    public onRequestClose: (() => void) | null = null;

    private _isMounted   = false;
    private _binder:    UITemplateBinder | null = null;
    private _allGenerals: GeneralConfig[] = [];
    private _filterMode: GeneralFilterMode = 'all';
    private _sortKey: SortKey | null = null;
    private _sortAsc     = false;
    private _headerBaseLabels: Partial<Record<SortKey, string>> = {};
    private readonly _renderedRowsByGeneralId = new Map<string, Node>();
    private _npcDialogueDevControls = false;
    private _npcDialogueSelectedGeneral: GeneralConfig | null = null;
    private _npcDialogueKeywords: NpcDialogueKeywordSelection[] = [];
    private _npcDialogueSelectedKeyword: NpcDialogueKeywordSelection | null = null;
    private _npcDialogueLocale: NpcDialogueLocale = 'zh-TW';
    private _npcDialogueSpeechContextMode: NpcDialogueSpeechContextMode = 'life_chat';

    private _npcDialogueModelPreset: NpcDialogueModelPreset = 'fallback_chain';
    private _npcDialogueStatusLabel: Label | null = null;
    private _npcDialogueKeywordLabel: Label | null = null;
    private _npcDialogueLocaleLabel: Label | null = null;
    private _npcDialogueSpeechContextLabel: Label | null = null;
    private _npcDialogueModelLabel: Label | null = null;
    private _npcDialogueHintLabel: Label | null = null;
    private _npcDialogueProviderLabel: Label | null = null;
    private _npcDialogueProviderTraceLabel: Label | null = null;
    private _npcDialogueMenuNode: Node | null = null;
    private _npcDialogueMenuMode: NpcDialogueMenuMode = 'keyword';

    // ── 生命週期 ─────────────────────────────────────────────

    protected onDestroy(): void {
        this.unmount();
        this._isMounted = false;
        this._binder = null;
    }

    // ── 公開 API ─────────────────────────────────────────────

    /**
     * 顯示武將列表。
     * 初次呼叫時掛載畫面；後續呼叫僅刷新列表。
     */
    public async show(generals: GeneralConfig[], filterMode: GeneralFilterMode = 'all', options: GeneralListShowOptions = {}): Promise<void> {
        this.node.active = true;
        this._allGenerals = generals;
        this._filterMode = filterMode;
        this._npcDialogueDevControls = !!options.npcDialogueDevControls;

        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralListComposite] show start', {
            generalCount: generals.length,
            filterMode,
            isMounted: this._isMounted,
            nodeActive: this.node.active,
        });

        if (!this._isMounted) {
            this._clearLegacySceneChildren();
            await this.mount('general-list-screen');
            this._isMounted = true;
            UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralListComposite] mount completed', {
                childCount: this.node.children.length,
            });
        }

        this._syncNpcDialogueDevToolbarVisibility();
        await this._repopulate();
        this.playEnterTransition(this.node);
        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralListComposite] show complete', {
            rowCount: this._allGenerals.length,
            sortKey: this._sortKey,
            sortAsc: this._sortAsc,
        });
    }

    public hide(): void {
        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralListComposite] hide', {
            nodeActive: this.node.active,
        });
        this.playExitTransition(this.node, undefined, () => {
            this.node.active = false;
        });
    }

    public requestClose(): void {
        if (this.onRequestClose) {
            this.onRequestClose();
            return;
        }
        this.hide();
    }

    public selectGeneralById(generalId: string): boolean {
        const normalizedId = generalId.trim();
        if (!normalizedId) {
            return false;
        }

        const row = this._renderedRowsByGeneralId.get(normalizedId);
        if (!row) {
            UCUFLogger.warn(LogCategory.LIFECYCLE, '[GeneralListComposite] selectGeneralById missing rendered row', {
                generalId: normalizedId,
            });
            return false;
        }

        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralListComposite] selectGeneralById emit row click', {
            generalId: normalizedId,
            rowName: row.name,
        });
        // 程式化呼叫（smoke route）直接觸發，繞過雙擊保護
        const general = this._allGenerals.find((g) => g.id === normalizedId) ?? null;
        if (general) {
            this.onSelectGeneral?.(general);
        } else {
            row.emit(Button.EventType.CLICK);
        }
        return true;
    }

    public hasRenderedGeneralById(generalId: string): boolean {
        const normalizedId = generalId.trim();
        return !!normalizedId && this._renderedRowsByGeneralId.has(normalizedId);
    }

    public async previewNpcDialogueDevSmoke(generalId = 'zhang-fei', runDialogue = true): Promise<void> {
        if (!this._npcDialogueDevControls) {
            throw new Error('[GeneralListComposite] NPC dialogue dev controls are not enabled');
        }

        const normalizedId = generalId.trim();
        const targetGeneral = this._allGenerals.find((general) => general.id === normalizedId);
        if (!targetGeneral) {
            throw new Error(`[GeneralListComposite] NPC dialogue smoke target not found: ${normalizedId}`);
        }

        await this._selectNpcDialogueGeneral(targetGeneral);
        if (this._npcDialogueKeywords.length === 0 || !this._npcDialogueSelectedKeyword) {
            throw new Error(`[GeneralListComposite] NPC dialogue smoke target has no keywords: ${normalizedId}`);
        }

        if (runDialogue) {
            await this._runNpcDialogueTest();
        }
    }

    // ── CompositePanel 鉤子 ───────────────────────────────────

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._binder = binder;
        binder.getButton('BtnBack')?.node.on(Button.EventType.CLICK, this.requestClose, this);
        this._bindSortHandlers();
        this._ensureDialogueModeToggle();
    }

    // ── 私有邏輯 ─────────────────────────────────────────────

    /** 清空並重新填入列表 */
    private async _repopulate(): Promise<void> {
        const sorted = this._sortedList();
        this._renderedRowsByGeneralId.clear();
        const content = this.node.getChildByPath(this._mainPath(CONTENT_REL_PATH));
        if (content) {
            for (const child of [...content.children]) {
                child.removeFromParent();
                child.destroy();
            }
        }
        UCUFLogger.info(LogCategory.DATA, '[GeneralListComposite] repopulate', {
            rowCount: sorted.length,
            listPath: this._mainPath(LIST_REL_PATH),
            sortKey: this._sortKey,
            sortAsc: this._sortAsc,
            filterMode: this._filterMode,
        });
        await this.populateList(this._mainPath(LIST_REL_PATH), sorted, (g: GeneralConfig, row: Node) => {
            const set = (name: string, val: string | number) => {
                const lbl = this._getRowLabel(row, name);
                if (lbl) lbl.string = String(val);
            };
            set('Name',    g.name ?? '—');
            set('Gender',  this._genderZh(g.gender));
            set('Age',     g.age   ?? '—');
            set('Str',     g.str   ?? 0);
            set('Int',     g.int   ?? 0);
            set('Lea',     g.lea   ?? 0);
            set('Pol',     g.pol   ?? 0);
            set('Cha',     g.cha   ?? 0);
            set('Luk',     g.luk   ?? 0);
            set('Troop',   this._bestTroop(g));
            set('Faction', g.faction ?? '—');
            this._renderedRowsByGeneralId.set(g.id, row);

            const button = row.getComponent(Button) ?? row.addComponent(Button);
            button.transition = Button.Transition.NONE;
            button.node.off(Button.EventType.CLICK);
            button.node.on(Button.EventType.CLICK, () => {
                UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralListComposite] row clicked', {
                    generalId: g.id,
                    generalName: g.name,
                    rowName: row.name,
                });
                if (this._npcDialogueDevControls) {
                    void this._selectNpcDialogueGeneral(g);
                    return;
                }
                this.onSelectGeneral?.(g);
            }, this);
        });
        this._syncContentWidth();
        this._updateHeaderLabels();
        this._syncHeaderColumnWidths();
    }

    /** 綁定欄頭排序按鈕 */
    private _bindSortHandlers(): void {
        const headerRow = this.node.getChildByPath(this._mainPath(HEADER_ROW_REL_PATH));
        if (!headerRow) return;

        for (const colNode of headerRow.children) {
            const sortKey = COL_SORT_MAP[colNode.name];
            if (!sortKey) continue;
            const label = colNode.getComponent(Label);
            const baseLabel = label?.string?.replace(/[▲▼]$/, '')?.trim();
            if (baseLabel) {
                this._headerBaseLabels[sortKey] = baseLabel;
            }
            const button = colNode.getComponent(Button) ?? colNode.addComponent(Button);
            button.transition = Button.Transition.NONE;
            button.node.off(Button.EventType.CLICK);
            button.node.on(Button.EventType.CLICK, () => {
                if (this._sortKey === sortKey) {
                    this._sortAsc = !this._sortAsc;
                } else {
                    this._sortKey = sortKey;
                    this._sortAsc = false;
                }
                void this._repopulate();
            }, this);
        }
    }

    /** 清除場景中遺留的舊版 GeneralList 子節點，避免與新 screen 疊在一起。 */
    private _clearLegacySceneChildren(): void {
        for (const child of [...this.node.children]) {
            child.destroy();
        }
    }

    private _syncContentWidth(): void {
        const listNode = this.node.getChildByPath(this._mainPath(LIST_REL_PATH));
        const contentNode = this.node.getChildByPath(this._mainPath(CONTENT_REL_PATH));
        const listTransform = listNode?.getComponent(UITransform);
        const contentTransform = contentNode?.getComponent(UITransform);
        if (!listTransform || !contentTransform) {
            return;
        }
        if (Math.abs(contentTransform.width - listTransform.width) < 0.5) {
            return;
        }
        contentTransform.setContentSize(listTransform.width, contentTransform.height);
        contentNode.getComponent(Layout)?.updateLayout(true);
    }

    /** 更新欄頭文字顯示當前排序方向 */
    private _updateHeaderLabels(): void {
        const headerRow = this.node.getChildByPath(this._mainPath(HEADER_ROW_REL_PATH));
        if (!headerRow) return;

        for (const colNode of headerRow.children) {
            const sortKey = COL_SORT_MAP[colNode.name];
            if (!sortKey) continue;
            const lbl  = colNode.getComponent(Label);
            if (!lbl)  continue;
            const base = this._headerBaseLabels[sortKey] ?? DEFAULT_HEADER_LABELS[sortKey];
            if (this._sortKey === sortKey) {
                lbl.string = `${base}${this._sortAsc ? '▲' : '▼'}`;
            } else {
                lbl.string = base;
            }
        }
    }

    private _syncHeaderColumnWidths(): void {
        const headerRow = this.node.getChildByPath(this._mainPath(HEADER_ROW_REL_PATH));
        const contentNode = this.node.getChildByPath(this._mainPath(CONTENT_REL_PATH));
        const firstRow = contentNode?.children?.[0] ?? null;
        if (!headerRow || !firstRow) return;

        let applied = false;
        for (const headerNode of headerRow.children) {
            const rowNodeName = HEADER_TO_ROW_MAP[headerNode.name];
            if (!rowNodeName) continue;
            const rowNode = firstRow.getChildByName(rowNodeName);
            const headerTransform = headerNode.getComponent(UITransform);
            const rowTransform = rowNode?.getComponent(UITransform);
            if (!headerTransform || !rowTransform || rowTransform.width <= 0) continue;
            if (Math.abs(headerTransform.width - rowTransform.width) < 0.5) continue;
            headerTransform.setContentSize(rowTransform.width, headerTransform.height);
            applied = true;
        }

        if (applied) {
            headerRow.getComponent(Layout)?.updateLayout(true);
        }
    }

    /** 在 ListPanel 頂部建立「對話測試模式」開關按鈕，並維持其狀態同步 */
    private _ensureDialogueModeToggle(): void {
        const listPanel = this.node.getChildByPath(this._mainPath(LIST_PANEL_REL_PATH));
        if (!listPanel) return;

        const TOGGLE_NAME = 'DialogueModeToggle';
        let toggleNode = listPanel.getChildByName(TOGGLE_NAME);
        if (!toggleNode) {
            toggleNode = new Node(TOGGLE_NAME);
            toggleNode.layer = listPanel.layer;
            listPanel.addChild(toggleNode);

            const tf = toggleNode.addComponent(UITransform);
            tf.setContentSize(180, 32);

            const w = toggleNode.addComponent(Widget);
            w.isAlignTop = true;
            w.isAlignRight = true;
            w.top = 4;
            w.right = 8;
            w.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;

            const lbl = toggleNode.addComponent(Label);
            lbl.horizontalAlign = HorizontalTextAlignment.CENTER;
            lbl.verticalAlign = VerticalTextAlignment.CENTER;
            lbl.fontSize = 18;
            lbl.color = new Color(220, 200, 120, 255);

            toggleNode.addComponent(Button).transition = Button.Transition.NONE;
        }

        // 同步標籤文字
        const label = toggleNode.getComponent(Label)!;
        label.string = this._npcDialogueDevControls ? '✦ 對話測試模式 ON' : '☐ 對話測試模式 OFF';
        label.color = this._npcDialogueDevControls
            ? new Color(80, 220, 120, 255)
            : new Color(160, 160, 160, 255);

        // 綁定點擊（先清除舊監聽再重掛）
        toggleNode.off(Button.EventType.CLICK);
        toggleNode.on(Button.EventType.CLICK, () => {
            this._npcDialogueDevControls = !this._npcDialogueDevControls;
            UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralListComposite] dialogue mode toggled', {
                npcDialogueDevControls: this._npcDialogueDevControls,
            });
            // 同步標籤
            label.string = this._npcDialogueDevControls ? '✦ 對話測試模式 ON' : '☐ 對話測試模式 OFF';
            label.color = this._npcDialogueDevControls
                ? new Color(80, 220, 120, 255)
                : new Color(160, 160, 160, 255);
            // 同步 NPC 工具列顯示 + 刷新列表
            this._syncNpcDialogueDevToolbarVisibility();
            void this._repopulate();
        }, this);
    }

    private _syncNpcDialogueDevToolbarVisibility(): void {
        const listPanel = this.node.getChildByPath(this._mainPath(LIST_PANEL_REL_PATH));
        if (!listPanel) {
            return;
        }

        if (!this._npcDialogueDevControls) {
            listPanel.getChildByName(NPC_DIALOGUE_TOOLBAR_NAME)?.destroy();
            listPanel.getChildByName(NPC_DIALOGUE_MENU_NAME)?.destroy();
            this._npcDialogueStatusLabel = null;
            this._npcDialogueKeywordLabel = null;
            this._npcDialogueLocaleLabel = null;
            this._npcDialogueSpeechContextLabel = null;
            this._npcDialogueModelLabel = null;
            this._npcDialogueHintLabel = null;
            this._npcDialogueProviderLabel = null;
            this._npcDialogueProviderTraceLabel = null;
            this._npcDialogueMenuNode = null;
            this._setWidgetTop(HEADER_ROW_REL_PATH, 24);
            this._setWidgetTop(LIST_REL_PATH, 68);
            return;
        }

        this._ensureNpcDialogueDevToolbar(listPanel);
        this._setWidgetTop(HEADER_ROW_REL_PATH, 134);
        this._setWidgetTop(LIST_REL_PATH, 178);
    }

    private _ensureNpcDialogueDevToolbar(listPanel: Node): void {
        let toolbar = listPanel.getChildByName(NPC_DIALOGUE_TOOLBAR_NAME);
        if (!toolbar) {
            toolbar = new Node(NPC_DIALOGUE_TOOLBAR_NAME);
            toolbar.layer = listPanel.layer;
            listPanel.addChild(toolbar);
            toolbar.addComponent(UITransform).setContentSize(1680, 112);
            const toolbarWidget = toolbar.addComponent(Widget);
            toolbarWidget.isAlignTop = toolbarWidget.isAlignLeft = toolbarWidget.isAlignRight = true;
            toolbarWidget.top = 18;
            toolbarWidget.left = 24;
            toolbarWidget.right = 24;

            this._npcDialogueStatusLabel = this._addToolbarLabel(toolbar, 'SelectedGeneralLabel', 250, 28, -720, 28, '選取武將：尚未選取', 19, HorizontalTextAlignment.LEFT);
            this._npcDialogueKeywordLabel = this._addToolbarButton(toolbar, 'KeywordDropdownButton', 300, 34, -450, 28, '關鍵字：尚未載入', () => this._toggleNpcDialogueKeywordMenu());
            this._npcDialogueSpeechContextLabel = this._addToolbarButton(toolbar, 'SpeechContextButton', 190, 34, -205, 28, this._npcDialogueSpeechContextButtonText(), () => this._toggleNpcDialogueSpeechContextMenu());
            this._npcDialogueModelLabel = this._addToolbarButton(toolbar, 'ModelPresetButton', 200, 34, -5, 28, this._npcDialogueModelButtonText(), () => this._toggleNpcDialogueModelMenu());
            this._npcDialogueLocaleLabel = this._addToolbarButton(toolbar, 'LocaleButton', 120, 34, 160, 28, this._npcDialogueLocaleButtonText(), () => this._cycleNpcDialogueLocale());
            this._addToolbarButton(toolbar, 'DialogueTestButton', 130, 34, 290, 28, '對話測試', () => { void this._runNpcDialogueTest(); });
            this._npcDialogueProviderLabel = this._addToolbarLabel(toolbar, 'DialogueProviderLabel', 360, 26, 540, 28, 'Provider：-', 18, HorizontalTextAlignment.LEFT);
            this._npcDialogueHintLabel = this._addToolbarLabel(toolbar, 'DialogueResultLabel', 960, 32, -360, -26, '點擊武將後載入可選關鍵字。', 18, HorizontalTextAlignment.LEFT);
            this._npcDialogueProviderTraceLabel = this._addToolbarLabel(toolbar, 'DialogueProviderTraceLabel', 760, 28, 470, -26, 'Quality：-｜Trace：-', 16, HorizontalTextAlignment.LEFT);
        } else {
            this._npcDialogueStatusLabel = toolbar.getChildByName('SelectedGeneralLabel')?.getComponent(Label) ?? null;
            this._npcDialogueKeywordLabel = toolbar.getChildByName('KeywordDropdownButton')?.getComponent(Label) ?? null;
            this._npcDialogueLocaleLabel = toolbar.getChildByName('LocaleButton')?.getComponent(Label) ?? null;
            this._npcDialogueSpeechContextLabel = toolbar.getChildByName('SpeechContextButton')?.getComponent(Label) ?? null;
            this._npcDialogueModelLabel = toolbar.getChildByName('ModelPresetButton')?.getComponent(Label) ?? null;
            this._npcDialogueHintLabel = toolbar.getChildByName('DialogueResultLabel')?.getComponent(Label) ?? null;
            this._npcDialogueProviderLabel = toolbar.getChildByName('DialogueProviderLabel')?.getComponent(Label) ?? null;
            this._npcDialogueProviderTraceLabel = toolbar.getChildByName('DialogueProviderTraceLabel')?.getComponent(Label) ?? null;
        }
        toolbar.active = true;
        toolbar.setSiblingIndex(listPanel.children.length - 1);
        this._syncNpcDialogueModeLabels();
        this._setNpcDialogueProvider('Provider：-');
        this._setNpcDialogueProviderTrace('Quality：-｜Trace：-');
        this._ensureNpcDialogueKeywordMenu(listPanel);
    }

    private _addToolbarLabel(parent: Node, name: string, width: number, height: number, x: number, y: number, text: string, fontSize: number, align: HorizontalTextAlignment): Label {
        const node = new Node(name);
        node.layer = parent.layer;
        parent.addChild(node);
        node.setPosition(x, y);
        node.addComponent(UITransform).setContentSize(width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = height;
        label.color = new Color(44, 38, 28, 255);
        label.horizontalAlign = align;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        return label;
    }

    private _addToolbarButton(parent: Node, name: string, width: number, height: number, x: number, y: number, text: string, handler: () => void): Label {
        const label = this._addToolbarLabel(parent, name, width, height, x, y, text, 19, HorizontalTextAlignment.CENTER);
        const button = label.node.addComponent(Button);
        button.transition = Button.Transition.NONE;
        button.node.on(Button.EventType.CLICK, handler, this);
        return label;
    }

    private _ensureNpcDialogueKeywordMenu(listPanel: Node): void {
        let menu = listPanel.getChildByName(NPC_DIALOGUE_MENU_NAME);
        if (!menu) {
            menu = new Node(NPC_DIALOGUE_MENU_NAME);
            menu.layer = listPanel.layer;
            listPanel.addChild(menu);
            menu.addComponent(UITransform).setContentSize(560, 320);
            const widget = menu.addComponent(Widget);
            widget.isAlignTop = widget.isAlignLeft = true;
            widget.top = 74;
            widget.left = 560;
        }
        menu.active = false;
        menu.setSiblingIndex(listPanel.children.length - 1);
        this._npcDialogueMenuNode = menu;
    }

    private async _selectNpcDialogueGeneral(general: GeneralConfig): Promise<void> {
        this._npcDialogueSelectedGeneral = general;
        this._npcDialogueKeywords = [];
        this._npcDialogueSelectedKeyword = null;
        this._setNpcDialogueStatus(`選取武將：${general.name ?? general.id}`);
        this._setNpcDialogueKeywordLabel('關鍵字：載入中...');
        this._setNpcDialogueHint(`正在載入 ${general.name ?? general.id} 的關鍵字。`);
        this._setNpcDialogueProvider('Provider：-');
        this._setNpcDialogueProviderTrace('Trace：-');
        this._hideNpcDialogueKeywordMenu();

        try {
            const response = await services().npcDialogue.getKeywordOptions(general.id, ['person', 'item', 'event'], 8);
            this._npcDialogueKeywords = services().npcDialogue.flattenKeywordOptions(response);
            this._npcDialogueSelectedKeyword = this._npcDialogueKeywords[0] ?? null;
            this._setNpcDialogueKeywordLabel(this._npcDialogueSelectedKeyword
                ? `關鍵字：${this._npcDialogueSelectedKeyword.label}`
                : '關鍵字：無可選內容');
            this._setNpcDialogueHint(this._npcDialogueSelectedKeyword
                ? `已載入 ${this._npcDialogueKeywords.length} 個關鍵字，點下拉可切換。`
                : '此武將目前沒有 keyword pack。');
            UCUFLogger.info(LogCategory.DATA, '[GeneralListComposite] npc dialogue keywords loaded', {
                generalId: general.id,
                keywordCount: this._npcDialogueKeywords.length,
            });
        } catch (error) {
            this._setNpcDialogueKeywordLabel('關鍵字：載入失敗');
            this._setNpcDialogueHint('NPC brain 連線失敗，確認 http://127.0.0.1:8765 是否已啟動。');
            services().event.emit('SHOW_TOAST', { message: 'NPC brain 連線失敗', duration: 2.5 });
            UCUFLogger.warn(LogCategory.DATA, '[GeneralListComposite] npc dialogue keyword load failed', { generalId: general.id, error });
        }
    }

    private _toggleNpcDialogueKeywordMenu(): void {
        if (!this._npcDialogueMenuNode) {
            return;
        }
        if (this._npcDialogueMenuNode.active && this._npcDialogueMenuMode === 'keyword') {
            this._hideNpcDialogueKeywordMenu();
            return;
        }
        this._npcDialogueMenuMode = 'keyword';
        this._renderNpcDialogueKeywordMenu();
        this._npcDialogueMenuNode.active = true;
    }

    private _toggleNpcDialogueSpeechContextMenu(): void {
        if (!this._npcDialogueMenuNode) {
            return;
        }
        if (this._npcDialogueMenuNode.active && this._npcDialogueMenuMode === 'speechContext') {
            this._hideNpcDialogueKeywordMenu();
            return;
        }
        this._npcDialogueMenuMode = 'speechContext';
        this._renderNpcDialogueSpeechContextMenu();
        this._npcDialogueMenuNode.active = true;
    }

    private _toggleNpcDialogueModelMenu(): void {
        if (!this._npcDialogueMenuNode) {
            return;
        }
        if (this._npcDialogueMenuNode.active && this._npcDialogueMenuMode === 'model') {
            this._hideNpcDialogueKeywordMenu();
            return;
        }
        this._npcDialogueMenuMode = 'model';
        this._renderNpcDialogueModelMenu();
        this._npcDialogueMenuNode.active = true;
    }

    private _renderNpcDialogueKeywordMenu(): void {
        const menu = this._npcDialogueMenuNode;
        if (!menu) {
            return;
        }
        for (const child of [...menu.children]) {
            child.destroy();
        }
        const visibleKeywords = this._npcDialogueKeywords.slice(0, 10);
        if (visibleKeywords.length === 0) {
            this._addMenuItem(menu, 0, '無可選關鍵字', null);
            return;
        }
        visibleKeywords.forEach((keyword, index) => {
            this._addMenuItem(menu, index, `${this._categoryLabel(keyword.category)}｜${keyword.label}`, keyword);
        });
    }

    private _renderNpcDialogueSpeechContextMenu(): void {
        const menu = this._npcDialogueMenuNode;
        if (!menu) {
            return;
        }
        for (const child of [...menu.children]) {
            child.destroy();
        }
        NPC_DIALOGUE_SPEECH_CONTEXT_OPTIONS.forEach((option, index) => {
            this._addSpeechContextMenuItem(menu, index, option.label, option.value);
        });
    }

    private _renderNpcDialogueModelMenu(): void {
        const menu = this._npcDialogueMenuNode;
        if (!menu) {
            return;
        }
        for (const child of [...menu.children]) {
            child.destroy();
        }
        NPC_DIALOGUE_MODEL_OPTIONS.forEach((option, index) => {
            this._addModelMenuItem(menu, index, option.label, option.value);
        });
    }

    private _addMenuItem(parent: Node, index: number, text: string, keyword: NpcDialogueKeywordSelection | null): void {
        const node = new Node(`KeywordOption_${index}`);
        node.layer = parent.layer;
        parent.addChild(node);
        node.setPosition(0, 132 - index * 30);
        node.addComponent(UITransform).setContentSize(540, 28);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = 17;
        label.lineHeight = 24;
        label.color = new Color(44, 38, 28, 255);
        label.horizontalAlign = HorizontalTextAlignment.LEFT;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        if (keyword) {
            const button = node.addComponent(Button);
            button.transition = Button.Transition.NONE;
            button.node.on(Button.EventType.CLICK, () => {
                this._npcDialogueSelectedKeyword = keyword;
                this._setNpcDialogueKeywordLabel(`關鍵字：${keyword.label}`);
                this._setNpcDialogueHint(`已選：${this._categoryLabel(keyword.category)} / ${keyword.label}`);
                this._hideNpcDialogueKeywordMenu();
            }, this);
        }
    }

    private _addSpeechContextMenuItem(parent: Node, index: number, text: string, mode: NpcDialogueSpeechContextMode): void {
        const node = new Node(`SpeechContextOption_${index}`);
        node.layer = parent.layer;
        parent.addChild(node);
        node.setPosition(0, 132 - index * 30);
        node.addComponent(UITransform).setContentSize(540, 28);
        const label = node.addComponent(Label);
        label.string = `${mode === this._npcDialogueSpeechContextMode ? '✓ ' : ''}${text}`;
        label.fontSize = 17;
        label.lineHeight = 24;
        label.color = new Color(44, 38, 28, 255);
        label.horizontalAlign = HorizontalTextAlignment.LEFT;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        const button = node.addComponent(Button);
        button.transition = Button.Transition.NONE;
        button.node.on(Button.EventType.CLICK, () => {
            this._npcDialogueSpeechContextMode = mode;
            this._syncNpcDialogueModeLabels();
            this._setNpcDialogueHint(`情境已切換：${text}`);
            this._hideNpcDialogueKeywordMenu();
        }, this);
    }

    private _addModelMenuItem(parent: Node, index: number, text: string, preset: NpcDialogueModelPreset): void {
        const node = new Node(`ModelPresetOption_${index}`);
        node.layer = parent.layer;
        parent.addChild(node);
        node.setPosition(0, 132 - index * 30);
        node.addComponent(UITransform).setContentSize(540, 28);
        const label = node.addComponent(Label);
        label.string = `${preset === this._npcDialogueModelPreset ? '✓ ' : ''}${text}`;
        label.fontSize = 17;
        label.lineHeight = 24;
        label.color = new Color(44, 38, 28, 255);
        label.horizontalAlign = HorizontalTextAlignment.LEFT;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        const button = node.addComponent(Button);
        button.transition = Button.Transition.NONE;
        button.node.on(Button.EventType.CLICK, () => {
            this._npcDialogueModelPreset = preset;
            this._syncNpcDialogueModeLabels();
            this._setNpcDialogueHint(`模型已切換：${text}`);
            this._hideNpcDialogueKeywordMenu();
        }, this);
    }

    private async _runNpcDialogueTest(): Promise<void> {
        if (!this._npcDialogueSelectedGeneral || !this._npcDialogueSelectedKeyword) {
            services().event.emit('SHOW_TOAST', { message: '請先點選武將並選擇關鍵字', duration: 2.5 });
            return;
        }
        const requestedSpeechContextMode = this._npcDialogueSpeechContextMode;
        const requestedModelPreset = this._npcDialogueModelPreset;
        this._setNpcDialogueHint('正在產生測試對白...');
        this._setNpcDialogueProvider(`Provider：請求中 / preset：${this._npcDialogueModelPresetLabel(requestedModelPreset)}`);
        this._setNpcDialogueProviderTrace(`Quality：-｜Trace：${requestedSpeechContextMode} / ${requestedModelPreset} / ${this._npcDialogueSelectedKeyword.keywordKey}`);
        try {
            const response = await services().npcDialogue.requestDialogue({
                generalId: this._npcDialogueSelectedGeneral.id,
                selectedKeywordKeys: [this._npcDialogueSelectedKeyword.keywordKey],
                toneMode: 'in-character',
                locale: this._npcDialogueLocale,
                speechContextMode: requestedSpeechContextMode,
                llmModelPreset: requestedModelPreset,
                maxChars: 90,
            });
            this._setNpcDialogueHint(response.text);
            this._setNpcDialogueProvider(this._npcDialogueProviderButtonText(response, requestedModelPreset));
            const presetMismatch = response.llmModelPreset !== requestedModelPreset;
            const presetWarning = presetMismatch ? [`preset-mismatch:${requestedModelPreset}->${response.llmModelPreset ?? 'missing'}`] : [];
            const qualityText = [...presetWarning, ...(response.qualityWarnings ?? [])].join(',') || (response.repairUsed ? 'repaired' : 'pass');
            this._setNpcDialogueProviderTrace(`Quality：${qualityText}｜Trace：${(response.providerTrace ?? []).join(' > ') || '-'}`);
            services().event.emit('SHOW_TOAST', { message: response.text, duration: 4 });
            UCUFLogger.info(LogCategory.DATA, '[GeneralListComposite] npc dialogue response', {
                generalId: response.generalId,
                selectedKeywordKey: this._npcDialogueSelectedKeyword.keywordKey,
                locale: response.locale ?? this._npcDialogueLocale,
                requestedSpeechContextMode,
                speechContextMode: response.speechContextMode ?? null,
                requestedModelPreset,
                llmModelPreset: response.llmModelPreset ?? null,
                evidenceRefs: response.evidenceRefs,
                usedEvidenceRefs: response.usedEvidenceRefs ?? [],
                usedKeywords: response.usedKeywords,
                provider: response.provider ?? null,
                model: response.model ?? null,
                providerTrace: response.providerTrace ?? [],
                qualityWarnings: response.qualityWarnings ?? [],
                presetMismatch,
                repairUsed: response.repairUsed ?? false,
                fallbackUsed: response.fallbackUsed,
            });
        } catch (error) {
            this._setNpcDialogueHint('對話測試失敗，請確認 NPC brain server。');
            this._setNpcDialogueProvider('Provider：request-failed');
            this._setNpcDialogueProviderTrace(`Quality：request-failed｜Trace：${this._npcDialogueErrorPreview(error)}`);
            services().event.emit('SHOW_TOAST', { message: '對話測試失敗', duration: 2.5 });
            UCUFLogger.warn(LogCategory.DATA, '[GeneralListComposite] npc dialogue request failed', { error });
        }
    }

    private _hideNpcDialogueKeywordMenu(): void {
        if (this._npcDialogueMenuNode) {
            this._npcDialogueMenuNode.active = false;
        }
    }

    private _cycleNpcDialogueLocale(): void {
        const currentIndex = NPC_DIALOGUE_LOCALE_OPTIONS.findIndex(option => option.value === this._npcDialogueLocale);
        const nextOption = NPC_DIALOGUE_LOCALE_OPTIONS[(currentIndex + 1) % NPC_DIALOGUE_LOCALE_OPTIONS.length];
        this._npcDialogueLocale = nextOption.value;
        this._syncNpcDialogueModeLabels();
        this._setNpcDialogueHint(`語系已切換：${nextOption.label}`);
    }

    private _syncNpcDialogueModeLabels(): void {
        if (this._npcDialogueLocaleLabel) {
            this._npcDialogueLocaleLabel.string = this._npcDialogueLocaleButtonText();
        }
        if (this._npcDialogueSpeechContextLabel) {
            this._npcDialogueSpeechContextLabel.string = this._npcDialogueSpeechContextButtonText();
        }
        if (this._npcDialogueModelLabel) {
            this._npcDialogueModelLabel.string = this._npcDialogueModelButtonText();
        }
    }

    private _npcDialogueLocaleButtonText(): string {
        const option = NPC_DIALOGUE_LOCALE_OPTIONS.find(item => item.value === this._npcDialogueLocale);
        return `語系：${option?.label ?? this._npcDialogueLocale}`;
    }

    private _npcDialogueSpeechContextButtonText(): string {
        const option = NPC_DIALOGUE_SPEECH_CONTEXT_OPTIONS.find(item => item.value === this._npcDialogueSpeechContextMode);
        return `情境：${option?.label ?? this._npcDialogueSpeechContextMode}`;
    }

    private _npcDialogueModelButtonText(): string {
        const option = NPC_DIALOGUE_MODEL_OPTIONS.find(item => item.value === this._npcDialogueModelPreset);
        return `模型：${option?.label ?? this._npcDialogueModelPreset}`;
    }

    private _npcDialogueModelPresetLabel(preset: NpcDialogueModelPreset | string | null | undefined): string {
        const option = NPC_DIALOGUE_MODEL_OPTIONS.find(item => item.value === preset);
        return option?.label ?? preset ?? 'missing';
    }

    private _npcDialogueProviderButtonText(response: NpcDialogueResponse, requestedPreset: NpcDialogueModelPreset): string {
        const provider = response.provider ?? 'unknown';
        const model = response.model ? `/${response.model}` : '';
        const actualPreset = response.llmModelPreset ?? 'missing';
        const presetText = actualPreset === requestedPreset
            ? this._npcDialogueModelPresetLabel(actualPreset)
            : `${this._npcDialogueModelPresetLabel(requestedPreset)}→${this._npcDialogueModelPresetLabel(actualPreset)}`;
        return `Provider：${provider}${model} / preset：${presetText} / repair：${response.repairUsed ? 'yes' : 'no'}`;
    }

    private _npcDialogueErrorPreview(error: unknown): string {
        const message = error instanceof Error ? error.message : String(error);
        return message.length > 120 ? `${message.slice(0, 117)}...` : message;
    }

    private _setNpcDialogueStatus(text: string): void {
        if (this._npcDialogueStatusLabel) {
            this._npcDialogueStatusLabel.string = text;
        }
    }

    private _setNpcDialogueKeywordLabel(text: string): void {
        if (this._npcDialogueKeywordLabel) {
            this._npcDialogueKeywordLabel.string = text;
        }
    }

    private _setNpcDialogueHint(text: string): void {
        if (this._npcDialogueHintLabel) {
            this._npcDialogueHintLabel.string = text;
        }
    }

    private _setNpcDialogueProvider(text: string): void {
        if (this._npcDialogueProviderLabel) {
            this._npcDialogueProviderLabel.string = text;
        }
    }

    private _setNpcDialogueProviderTrace(text: string): void {
        if (this._npcDialogueProviderTraceLabel) {
            this._npcDialogueProviderTraceLabel.string = text;
        }
    }

    private _setWidgetTop(relativePath: string, top: number): void {
        const node = this.node.getChildByPath(this._mainPath(relativePath));
        const widget = node?.getComponent(Widget);
        if (!widget) {
            return;
        }
        widget.top = top;
        widget.updateAlignment();
    }

    private _categoryLabel(category: string): string {
        switch (category) {
            case 'person': return '人物';
            case 'item': return '物品';
            case 'event': return '事件';
            case 'location': return '地點';
            case 'creature': return '生物';
            default: return category;
        }
    }

    // ── 排序 ─────────────────────────────────────────────────

    private _sortedList(): GeneralConfig[] {
        const list = this._allGenerals.filter((general) => {
            switch (this._filterMode) {
                case 'player':
                    return general.faction === 'player';
                case 'enemy':
                    return general.faction === 'enemy';
                case 'all':
                default:
                    return true;
            }
        });
        if (!this._sortKey) return list;
        const key = this._sortKey;
        const asc = this._sortAsc;

        list.sort((a, b) => {
            let va: unknown;
            let vb: unknown;

            if (key === 'troop') {
                const rankOf = (g: GeneralConfig) => {
                    const grades = Object.values(g.troopAptitude ?? {});
                    return grades.length > 0
                        ? Math.max(...grades.map(gr => APTITUDE_ORDER[gr as string] ?? 0))
                        : 0;
                };
                va = rankOf(a); vb = rankOf(b);
            } else {
                va = (a as unknown as Record<string, unknown>)[key];
                vb = (b as unknown as Record<string, unknown>)[key];
            }

            if (typeof va === 'number' && typeof vb === 'number') {
                return asc ? va - vb : vb - va;
            }
            const sa = String(va ?? '');
            const sb = String(vb ?? '');
            return asc ? sa.localeCompare(sb, 'zh-TW') : sb.localeCompare(sa, 'zh-TW');
        });

        return list;
    }

    // ── 工具 ─────────────────────────────────────────────────

    private _getRowLabel(row: Node, nodeName: string): Label | null {
        return row.getChildByName(nodeName)?.getComponent(Label) ?? null;
    }

    private _resolveMainRoot(): Node | null {
        return this.node.getChildByPath(`__safeArea/${LIST_ROOT_NAME}`)
            ?? this.node.getChildByName(LIST_ROOT_NAME);
    }

    private _mainPath(path: string): string {
        const rootPath = this._resolveMainRoot()?.parent?.name === '__safeArea'
            ? `__safeArea/${LIST_ROOT_NAME}`
            : LIST_ROOT_NAME;
        return `${rootPath}/${path}`;
    }

    private _genderZh(gender: string | undefined): string {
        if (gender === '男' || gender === 'male')   return '男';
        if (gender === '女' || gender === 'female') return '女';
        return '—';
    }

    private _bestTroop(g: GeneralConfig): string {
        const apt = g.troopAptitude;
        if (!apt) return '—';
        const TROOP_ZH: Record<string, string> = {
            CAVALRY:  '騎兵', INFANTRY: '步兵', ARCHER:   '弓兵',
            SIEGE:    '攻城', NAVY:     '水軍', CHARIOT:  '戰車',
            ENGINEER: '工兵',
        };
        let bestKey = '';
        let bestRank = -1;
        for (const [tKey, grade] of Object.entries(apt)) {
            const rank = APTITUDE_ORDER[grade as string] ?? 0;
            if (rank > bestRank) { bestRank = rank; bestKey = tKey; }
        }
        if (!bestKey) return '—';
        const zh    = TROOP_ZH[bestKey] ?? bestKey;
        const grade = apt[bestKey];
        return `${zh} ${grade}`;
    }
}
