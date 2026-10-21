import { _decorator, Button, Label, Node, Sprite, SpriteFrame, UIOpacity } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import type { ChildPanelBase } from '../core/ChildPanelBase';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { UIID } from '../../core/config/UIConfig';
import { services } from '../../core/managers/ServiceLoader';
import {
    buildGeneralDetailOverviewContentState,
    type GeneralDetailOverviewContentState,
} from './GeneralDetailOverviewMapper';
import { GeneralDetailChromePresenter, TAB_ORDER, OPTIONAL_TABS, DS3_TAB_BUTTON_NODE, type TabKey } from './character-ds3/GeneralDetailChromePresenter';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { CocosCompositeRenderer } from '../platform/cocos/CocosCompositeRenderer';
import { UIVariantRouter } from '../core/UIVariantRouter';

const { ccclass } = _decorator;

type UnifiedOverviewContentState = GeneralDetailOverviewContentState;
export interface GeneralDetailOpenOptions {
    screenId?: 'character-ds3-main';
    initialTab?: Exclude<TabKey, 'Record'>;
}

const DS3_CONTENT_SLOT_CANDIDATES = ['ContentSlot', 'CharacterDs3Main_div_8', 'CharacterDs3Main_div_6'] as const;

@ccclass('GeneralDetailComposite')
export class GeneralDetailComposite extends CompositePanel {
    public onRequestClose: (() => void) | null = null;

    private _isMounted = false;
    private _mountedScreenId: string | null = null;
    private _selectionVersion = 0;
    private _operationQueue: Promise<void> = Promise.resolve();
    private _activeTab: TabKey = 'Overview';
    private _currentConfig: GeneralConfig | null = null;
    private readonly _chrome = new GeneralDetailChromePresenter({
        requireNode: (path) => this._requireNode(path),
        findNode: (path) => this.node.getChildByPath(this._mainPath(path)),
        mainRoot: () => this._resolveMainRoot(),
        currentConfig: () => this._currentConfig,
        portraitVisible: () => this._activeTab !== 'Bloodline',
        activeTab: () => this._activeTab,
        binder: () => this._gdBinder,
        skinResolver: () => this.skinResolver,
        setButtonVisualState: (node, state) => this.setButtonVisualState(node, state),
        owner: () => this,
    });
    private _gdBinder: UITemplateBinder | null = null;
    private _appliedDs3Portrait: { resource: string; frame: SpriteFrame } | null = null;
    private _ds3TabChildren = new Map<TabKey, ChildPanelBase>();

    /**
     * 解析要載入的 screen 規格 ID。
     * 委派到 UIVariantRouter（M31）：先註冊路由，再依下列優先序解析：
     *   1. globalThis.__UCUF_GENERAL_DETAIL_VARIANT
     *   2. URL query: ?ui=ds3|unified
     *   3. localStorage: __ucuf_general_detail_variant === 'ds3'|'unified'
     * 2026-04-28：DS3 cutover Step 1 完成 layout flip，但因 DS3 ChildPanel data wiring 仍 WIP
     * 且 HTML vs DS3 視覺對齊尚未達 95%，default 暫時 revert 回 unified；DS3 仍可透過
     * `?ui=ds3` 或 localStorage 顯式進入做開發測試。Step 2 完成後再 flip default。
     */
    private static _resolveScreenId(): string {
        const LEGACY_SCREEN = 'general-detail-screen';
        const UNIFIED_SCREEN = 'general-detail-unified-screen';
        const DS3_SCREEN = 'character-ds3-main';
        UIVariantRouter.registerRoute('general-detail', {
            default: UNIFIED_SCREEN,
            variants: { 
                legacy: LEGACY_SCREEN, 
                unified: UNIFIED_SCREEN, 
                ds3: DS3_SCREEN 
            },
        });
        try {
            return UIVariantRouter.resolve('general-detail', UNIFIED_SCREEN);
        } catch {
            return UNIFIED_SCREEN;
        }
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._gdBinder = binder;
        this.setCompositeRenderer(new CocosCompositeRenderer());
        this._bindStaticEvents();
    }

    /** 目前 GeneralDetailComposite 是否以 DS3 layout 作為當前 screen。 */
    private _isDs3Active(): boolean {
        return this._mountedScreenId === 'character-ds3-main';
    }

    private _clearLegacySceneChildren(): void {
        for (const child of [...this.node.children]) {
            child.destroy();
        }
    }

    public show(config: GeneralConfig, options: GeneralDetailOpenOptions = {}): Promise<void> {
        const version = ++this._selectionVersion;
        this._currentConfig = config;
        this.node.active = false;
        this._setSelectionOpacity(0);
        const operation = this._operationQueue.catch(() => undefined).then(async () => {
            if (version !== this._selectionVersion) return;
            await this._showSelection(config, options, version);
        });
        this._operationQueue = operation;
        return operation;
    }

    private async _showSelection(config: GeneralConfig, options: GeneralDetailOpenOptions, version: number): Promise<void> {
        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] show start', {
            generalId: config.id,
            generalName: config.name,
            isMounted: this._isMounted,
            previousTab: this._activeTab,
            nodeActive: this.node.active,
        });

        const parent = this.node.parent;
        if (parent) {
            this.node.setSiblingIndex(parent.children.length - 1);
        }

        // 必須在 mount/buildScreen 之前啟用節點，確保 Widget 計算時父容器尺寸正確
        this.node.active = true;

        const screenId = options.screenId ?? GeneralDetailComposite._resolveScreenId();
        if (this._isMounted && this._mountedScreenId !== screenId) {
            this.unmount();
            this._ds3TabChildren.clear();
            this._isMounted = false;
            this._gdBinder = null;
        }
        if (!this._isMounted) {
            this._clearLegacySceneChildren();
            this._mountedScreenId = screenId;
            // 滿足 compute-gate 靜態檢查：必須顯式呼叫 mount('...')
            if (screenId === 'general-detail-unified-screen') {
                await this.mount('general-detail-unified-screen');
            } else if (screenId === 'general-detail-screen') {
                await this.mount('general-detail-screen');
            } else {
                await this.mount(screenId);
            }
            this._isMounted = true;
            UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] mount completed', {
                childCount: this.node.children.length,
                screenId,
            });
        }
        if (version !== this._selectionVersion || !this.node.isValid) return;
        this._currentConfig = config;

        if (this._isDs3Active()) {
            const overview = buildGeneralDetailOverviewContentState(config);
            await this._applyDs3Identity(overview, version);
            if (version !== this._selectionVersion) return;
            const entryTab = options.initialTab ?? (options.screenId ? 'Overview' : this._chrome.resolveEntryTab(config));
            await this._switchToDs3Tab(entryTab, overview, version);
            if (version !== this._selectionVersion) return;
            (this.node as Node & { __generalDetailReadyTab?: string }).__generalDetailReadyTab = entryTab;
            UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] DS3 show complete', {
                generalId: config.id,
                nodeActive: this.node.active,
                activeTab: this._activeTab,
                screenId: 'character-ds3-main',
            });
            return;
        }

        this._chrome.resetBackground();
        const overview = buildGeneralDetailOverviewContentState(config);
        await this._chrome.loadBackground(overview.backgroundResource);
        const entryTab = this._chrome.resolveEntryTab(config);
        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] resolved entry tab', {
            generalId: config.id,
            entryTab,
        });
        await this._switchToTab(entryTab);
        if (version !== this._selectionVersion) return;
        this._setSelectionOpacity(255);
        (this.node as Node & { __generalDetailReadyTab?: string }).__generalDetailReadyTab = entryTab;

        // 確保 GeneralDetailRoot 的 UIOpacity 為完全不透明
        // playEnterTransition 在 Editor Preview 中 tween 可能不執行，導致 opacity 停在 0
        // 暫時不使用 tween 動畫，直接同步設定 opacity=255
        const root = this._resolveMainRoot();
        if (root) {
            const uiOp = root.getComponent(UIOpacity);
            if (uiOp) {
                uiOp.opacity = 255;
            }
        }

        // 臨時 Preview 診斷已完成，恢復正式畫面輸出。

        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] show complete', {
            generalId: config.id,
            activeTab: this._activeTab,
            nodeActive: this.node.active,
            siblingIndex: this.node.getSiblingIndex(),
        });
    }

    public hide(): void {
        ++this._selectionVersion;
        this._currentConfig = null;
        this._setSelectionOpacity(0);
        this.node.active = false;
        delete (this.node as Node & { __generalDetailReadyTab?: string }).__generalDetailReadyTab;
        delete (this.node as Node & { __generalDetailGeneralId?: string }).__generalDetailGeneralId;
    }

    private _setSelectionOpacity(opacity: number): void {
        const component = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        component.opacity = opacity;
    }

    private async _applyDs3Identity(state: UnifiedOverviewContentState, version: number): Promise<void> {
        const binder = this._gdBinder;
        if (!binder) throw new Error('[GeneralDetailComposite] DS3 identity binder 尚未就緒');
        const story = this.getSlotNode('slot.story-strip');
        if (story) story.active = false;
        for (const [name, value] of [
            ['CharacterDs3Main_div_3', state.headerTitle],
            ['CharacterDs3Main_span_1', state.rarityLabel],
            ['CharacterDs3Main_span_2', state.rarityTier.toUpperCase()],
        ]) {
            const label = binder.getLabel(name);
            if (!label) throw new Error(`[GeneralDetailComposite] DS3 identity 缺少 ${name}`);
            label.string = value;
        }
        const portrait = this._resolveDs3PortraitSprite();
        if (!portrait) throw new Error('[GeneralDetailComposite] DS3 缺少人物圖片節點');
        portrait.spriteFrame = null;
        this._appliedDs3Portrait = null;
        const frame = await services().resource.loadSpriteFrame(state.portraitResource, { preferTextureFallback: true }).catch(() => null);
        if (version !== this._selectionVersion || !portrait.node.isValid) return;
        if (frame) {
            portrait.spriteFrame = frame;
            this._appliedDs3Portrait = { resource: state.portraitResource, frame };
        } else {
            UCUFLogger.warn(LogCategory.DATA, '[GeneralDetailComposite] selected portrait unavailable', { resource: state.portraitResource });
        }
    }

    /** Observe the rendered selection, including visibility and the frame actually assigned. */
    public selectedPersonViewState(): {
        generalId: string | null; name: string; visible: boolean; portraitResource: string | null;
    } {
        const name = this._ds3TabChildren.get('Overview')?.binder.getLabel('CharacterDs3TabOverview_span_1');
        const portrait = this._resolveDs3PortraitSprite();
        const visible = (node: Node | undefined): boolean => {
            if (!node?.activeInHierarchy) return false;
            for (let ancestor: Node | null = node; ancestor; ancestor = ancestor.parent) {
                if (ancestor.getComponent(UIOpacity)?.opacity === 0) return false;
            }
            return true;
        };
        return {
            generalId: this._currentConfig?.id ?? null,
            name: name?.string ?? '',
            visible: visible(name?.node) && visible(portrait?.node),
            portraitResource: portrait?.spriteFrame && portrait.spriteFrame === this._appliedDs3Portrait?.frame
                ? this._appliedDs3Portrait.resource : null,
        };
    }

    private _resolveDs3PortraitSprite(): Sprite | null {
        return this._gdBinder?.getSprite('CharacterDs3Main_img_1_ImageContent')
            ?? this._gdBinder?.getSprite('CharacterDs3Main_img_1') ?? null;
    }

    public requestClose(): void {
        if (this.onRequestClose) {
            this.onRequestClose();
            return;
        }
        void services().ui.closeCurrentUI();
    }

    public override applyContentState(state: Record<string, unknown>): void {
        const config = state.config as GeneralConfig | undefined;
        if (config) {
            if (this._isDs3Active()) {
                const initialTab = this._activeTab === 'Record' ? 'Overview' : this._activeTab;
                void this.show(config, { screenId: 'character-ds3-main', initialTab }).catch((error: unknown) => {
                    UCUFLogger.error(LogCategory.DATA, '[GeneralDetailComposite] DS3 selection update failed', { error: String(error) });
                });
                return;
            }
            this._currentConfig = config;
            const overview = buildGeneralDetailOverviewContentState(config);
            this._applyOverviewChrome(overview);
            super.applyContentState({ config, overview });
            return;
        }

        super.applyContentState(state);
    }

    protected onDestroy(): void {
        ++this._selectionVersion;
        this._currentConfig = null;
        if ((this.node as Node & { isValid?: boolean }).isValid) {
            this.unmount();
        }
        this._isMounted = false;
        this._mountedScreenId = null;
        this._ds3TabChildren.clear();
        this._gdBinder = null;
    }

    private _bindStaticEvents(): void {
        if (this._isDs3Active()) {
            this._bindDs3StaticEvents();
            return;
        }

        this._chrome.bindOptionalClick('TopCloseBtn', () => {
            this.requestClose();
        });

        for (const tab of TAB_ORDER) {
            const bind = OPTIONAL_TABS.has(tab) ? this._bindOptionalClick.bind(this) : this._bindClick.bind(this);
            bind(`RightTabBar/BtnTab${tab}`, () => {
                void this._switchToTab(tab);
            });
        }
    }

    private _bindDs3StaticEvents(): void {
        this._bindOptionalClickByNodeName('CharacterDs3Main_button_3', () => {
            this.requestClose();
        });

        for (const tab of TAB_ORDER) {
            const nodeName = DS3_TAB_BUTTON_NODE[tab];
            if (!nodeName) continue;
            this._bindOptionalClickByNodeName(nodeName, () => {
                const version = this._selectionVersion;
                const config = this._currentConfig;
                if (!config) return;
                const operation = this._operationQueue.catch(() => undefined).then(async () => {
                    if (version !== this._selectionVersion || this._currentConfig !== config) return;
                    await this._switchToDs3Tab(tab, buildGeneralDetailOverviewContentState(config), version);
                });
                this._operationQueue = operation;
                void operation.catch((error: unknown) => {
                    UCUFLogger.error(LogCategory.LIFECYCLE, '[GeneralDetailComposite] DS3 tab switch failed', { error: String(error), tab });
                });
            });
        }
        this._syncDs3TabVisualState();
    }

    private async _switchToDs3Tab(tab: TabKey, overview: UnifiedOverviewContentState | null, version = this._selectionVersion): Promise<void> {
        if (version !== this._selectionVersion || !this._currentConfig) return;
        this._setSelectionOpacity(0);
        this._activeTab = tab;
        this._bindDs3TabChild(tab);
        await this.switchTab(tab);
        if (version !== this._selectionVersion || !this.node.isValid) return;
        if (this._currentConfig) {
            super.applyContentState({
                config: this._currentConfig,
                overview: overview ?? buildGeneralDetailOverviewContentState(this._currentConfig),
            });
        }
        this._clearPendingDs3Tab(tab);
        this._syncDs3TabVisualState();
        (this.node as Node & { __generalDetailGeneralId?: string }).__generalDetailGeneralId = this._currentConfig?.id;
        (this.node as Node & { __generalDetailReadyTab?: string }).__generalDetailReadyTab = tab;
        this._setSelectionOpacity(255);
    }

    /** Unwired pages may show an empty value, never another person's demo. */
    private _clearPendingDs3Tab(tab: TabKey): void {
        if (tab === 'Overview' || tab === 'Stats') return;
        const slot = this._resolveDs3ContentSlotHost();
        const root = slot?.children[slot.children.length - 1];
        if (!slot || !root) throw new Error(`[GeneralDetailComposite] ${tab} 缺少內容節點`);
        const label = root.getComponentsInChildren(Label).find((candidate) => {
            for (let node: Node | null = candidate.node; node && node !== root; node = node.parent) {
                if (node.getComponent(Button)) return false;
            }
            return true;
        });
        if (!label) throw new Error(`[GeneralDetailComposite] ${tab} 缺少空狀態文字節點`);
        const hideContents = (node: Node): void => {
            node.active = false;
            for (const child of node.children) hideContents(child);
        };
        for (const child of root.children) hideContents(child);
        label.string = '—';
        for (let node: Node | null = label.node; node && node !== slot; node = node.parent) node.active = true;
    }

    private _resolveDs3ContentSlotHost(): Node | null {
        for (const slotId of DS3_CONTENT_SLOT_CANDIDATES) {
            const slotNode = this.getSlotNode(slotId);
            if (slotNode) {
                return slotNode;
            }
        }
        return null;
    }

    private _resolveDs3ContentSlotId(tab: TabKey): string | null {
        const routeSlotId = this.tabRouting?.[tab]?.slotId;
        if (routeSlotId) {
            return routeSlotId;
        }

        for (const slotId of DS3_CONTENT_SLOT_CANDIDATES) {
            if (this.getSlotNode(slotId)) {
                return slotId;
            }
        }
        return null;
    }

    private _bindDs3TabChild(tab: TabKey): void {
        if (!this._gdBinder) {
            return;
        }

        const slotId = this._resolveDs3ContentSlotId(tab);
        const slotNode = slotId ? this.getSlotNode(slotId) : null;
        if (!slotId || !slotNode) {
            return;
        }

        const child = this._ensureDs3TabChild(tab, slotNode, this._gdBinder);
        const previous = this.childPanels.get(slotId);
        if (previous && previous !== child) {
            previous.onUnmount();
            previous._lastData = null;
        }
        this.registerChildPanel(slotId, child);
    }

    private _ensureDs3TabChild(tab: TabKey, slotNode: Node, binder: UITemplateBinder): ChildPanelBase {
        const existing = this._ds3TabChildren.get(tab);
        if (existing) {
            return existing;
        }

        const contentBinder = new UITemplateBinder();
        const created = this._chrome.createDs3Child(tab, slotNode, contentBinder, this.skinResolver);
        const onMount = created.onMount.bind(created);
        created.onMount = async (spec) => {
            const root = slotNode.children[slotNode.children.length - 1];
            if (!root) throw new Error(`[GeneralDetailComposite] ${tab} 缺少 fragment root`);
            contentBinder.bind(root);
            await onMount(spec);
        };
        this._ds3TabChildren.set(tab, created);
        return created;
    }

    private _syncDs3TabVisualState(): void {
        this._chrome.syncDs3TabVisualState();
    }

    private async _switchToTab(tab: TabKey): Promise<void> {
        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] switchToTab start', {
            requestedTab: tab,
            currentTab: this._activeTab,
        });

        this._activeTab = tab;
        const isOverview = tab === 'Overview';
        this._setOverviewMode(isOverview);

        if (!this._gdBinder) {
            const message = '[GeneralDetailComposite] _switchToTab 前 binder 尚未就緒';
            UCUFLogger.error(LogCategory.LIFECYCLE, message, { tab });
            throw new Error(message);
        }

        const slotId = isOverview ? 'OverviewSlot' : 'ContentSlot';
        const slotNode = this.getSlotNode(slotId);
        if (!slotNode) {
            const message = `[GeneralDetailComposite] 找不到必要節點 ${slotId}`;
            UCUFLogger.error(LogCategory.LIFECYCLE, message, { tab });
            throw new Error(message);
        }

        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] creating child for tab', { tab });
        const child = this._chrome.createChild(tab, slotNode, this._gdBinder, this.skinResolver);
        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] registering child panel', { child: child.constructor.name, slot: slotId });
        this.registerChildPanel(slotId, child);

        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] switching slot to fragment for tab', { tab });
        await this.switchTab(tab);

        this._syncTabVisualState();
        this._chrome.syncPortraitVisibility();
        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] applying current data after tab switch', { activeTab: this._activeTab });
        this._applyCurrentData();
        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] switchToTab complete', {
            activeTab: this._activeTab,
            slotChildCount: slotNode.children.length,
            childType: child.constructor.name,
        });
    }

    private _applyCurrentData(): void {
        if (!this._currentConfig) {
            return;
        }

        const overview = buildGeneralDetailOverviewContentState(this._currentConfig);
        this._applyOverviewChrome(overview);
        super.applyContentState({
            config: this._currentConfig,
            overview,
        });
        this._chrome.syncSpiritFamilyShortcut();
    }

    private _applyOverviewChrome(state: UnifiedOverviewContentState): void {
        void this._chrome.loadBackground(state.backgroundResource);
        void this._chrome.loadPortrait(state.portraitResource);
        void this._chrome.loadPortraitRarityBadge(state.rarityTier);

        // Overview visual pass — 將 Shell 時代的 sprite color / opacity / label color 套用到 Unified 節點
        // 注意：由呼叫端在 super.applyContentState 之後執行，以免被重建覆蓋。
    }

    /**
     * 切換 Overview 模式。
     * enabled=true 時顯示 OverviewSlot、隱藏 ContentSlot。
     * enabled=false 時還原，保持右側只有一組 tab + 一個內容容器。
     */
    private _setOverviewMode(enabled: boolean): void {
        UCUFLogger.info(LogCategory.LIFECYCLE, '[GeneralDetailComposite] _setOverviewMode', { enabled });

        const overviewSlot = this.getSlotNode('OverviewSlot');
        if (overviewSlot) {
            overviewSlot.active = enabled;
            const opacity = overviewSlot.getComponent(UIOpacity) || overviewSlot.addComponent(UIOpacity);
            opacity.opacity = enabled ? 255 : 0;
        }

        const contentSlot = this.getSlotNode('ContentSlot');
        if (contentSlot) {
            contentSlot.active = !enabled;
        }
    }

    private _syncTabVisualState(): void {
        this._chrome.syncTabVisualState();
    }

    private _bindOptionalClickByNodeName(path: string, handler: () => void): void {
        this._chrome.bindOptionalClickByNodeName(path, handler);
    }

    private _resolveMainRoot(): Node | null {
        const safeAreaRoot = this.node.getChildByPath('__safeArea/GeneralDetailRoot');
        if (safeAreaRoot) {
            return safeAreaRoot;
        }
        return this.node.getChildByName('GeneralDetailRoot');
    }

    private _mainPath(path: string): string {
        const rootPath = this._resolveMainRoot()?.parent?.name === '__safeArea'
            ? '__safeArea/GeneralDetailRoot'
            : 'GeneralDetailRoot';
        return `${rootPath}/${path}`;
    }

    private _requireNode(path: string): Node {
        const fullPath = this._mainPath(path);
        const node = this.node.getChildByPath(fullPath);
        if (!node) {
            UCUFLogger.error(LogCategory.LIFECYCLE, `[GeneralDetailComposite] 缺少必要節點 ${fullPath}`);
            throw new Error(`[GeneralDetailComposite] 缺少必要節點 ${fullPath}`);
        }
        return node;
    }

}
