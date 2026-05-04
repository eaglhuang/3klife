import { UCUFLogger, LogCategory } from '../core/UCUFLogger';
// @spec-source → 見 docs/cross-reference-index.md
import { _decorator, Node, Button } from 'cc';
import { UIPreviewBuilder } from '../core/UIPreviewBuilder';
import { UISpecLoader } from '../core/UISpecLoader';
import { services } from '../../core/managers/ServiceLoader';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { applyUIScreenRuntimeState } from '../core/UIScreenRuntimeStateRegistry';
import type { UILayoutNodeSpec, UIScreenSpec, TabRoute } from '../core/UISpecTypes';

const { ccclass, property } = _decorator;

interface PreviewLazySlotEntry {
    spec: UILayoutNodeSpec;
    node: Node;
    parentW: number;
    parentH: number;
    currentFragmentId?: string;
}

interface PreviewInteractionAction {
    id?: string;
    trigger?: string;
    event?: string;
    type?: string;
    target?: string;
    smoke?: { expectActiveTab?: string };
}

interface PreviewInteractionSidecar {
    screenId?: string;
    actions?: PreviewInteractionAction[];
}

interface PreviewTabRoutingSidecar {
    tabs?: Array<{
        id?: string;
        key?: string;
        mount?: string;
        slotId?: string;
        buttonNode?: string;
        fragment?: string;
    }>;
}

interface PreviewInteractionSmokeResult {
    actionId: string;
    trigger: string;
    target: string;
    status: 'bound' | 'missing-trigger' | 'missing-route' | 'unsupported';
    slotId?: string;
    fragment?: string;
}

/**
 * UIScreenPreviewHost — 供 Editor / QA 使用的 screen-driven 預覽掛載點。
 *
 * Unity 對照：相當於一個專門 Instantiate UI Prefab Variant 的 PreviewBootstrap，
 * 讓 QA 驗的是 JSON 契約建出的最終畫面，而不是 legacy 手刻版本。
 */
@ccclass('UIScreenPreviewHost')
export class UIScreenPreviewHost extends UIPreviewBuilder {
    @property({ tooltip: '預覽時使用的語系檔，預設 zh-TW。' })
    public locale = 'zh-TW';

    private get _specLoader() { return services().specLoader; }
    private _currentScreenId = '';
    private _isLoading = false;
    private _binder: UITemplateBinder | null = null;
    private readonly _lazySlots = new Map<string, PreviewLazySlotEntry>();
    private readonly _sidecarInteractionHooks: Array<{ node: Node; callback: () => void }> = [];
    private _interactionSmokeResults: PreviewInteractionSmokeResult[] = [];
    private _interactionActionsBound = 0;

    public get binder(): UITemplateBinder | null {
        return this._binder;
    }

    public get interactionRuntimeReport(): { status: 'pass' | 'not-run' | 'blocker'; actionsBound: number; smokeResults: PreviewInteractionSmokeResult[] } {
        const blockerCount = this._interactionSmokeResults.filter(result => result.status !== 'bound').length;
        return {
            status: this._interactionSmokeResults.length === 0 ? 'not-run' : blockerCount === 0 ? 'pass' : 'blocker',
            actionsBound: this._interactionActionsBound,
            smokeResults: this._interactionSmokeResults.slice(),
        };
    }

    /**
     * 供 Preview route 動態切換 lazySlot 內容。
     * Unity 對照：Editor preview 下手動切換同一個 ContentHost 的 SubView prefab。
     */
    public async switchLazySlot(slotId: string, fragmentId: string): Promise<boolean> {
        const entry = this._lazySlots.get(slotId);
        if (!entry) {
            UCUFLogger.warn(LogCategory.UI, `[UIScreenPreviewHost] switchLazySlot: 找不到 slotId=${slotId}`);
            UCUFLogger.warn(LogCategory.UI, `[UIScreenPreviewHost] 已知 slotId 清單: ${JSON.stringify([...this._lazySlots.keys()])}`);
            return false;
        }

        await this._switchPreviewSlot(entry, fragmentId);
        return true;
    }

    /**
     * 診斷鉤子：強制在 host 層直接綁定 tab 點擊 → switchLazySlot，
     * 繞開 LobbyScene 的事件路徑，用於切開
     * 「事件沒進來」vs「事件進來但切換失敗」兩種情況。
     *
     * @param slotId           lazySlot 節點名（如 'CharacterDs3Main_div_6'）
     * @param buttonFragmentMap button 節點名 → fragment resource path 的對照表
     * @returns 成功綁定的按鈕數量
     */
    public installTabSwitchHook(slotId: string, buttonFragmentMap: Record<string, string>): number {
        const binder = this._binder;
        if (!binder) {
            UCUFLogger.error(LogCategory.UI, '[UIScreenPreviewHost-DIAG] installTabSwitchHook: binder 尚未就緒，請在 showScreen() 完成後呼叫');
            return 0;
        }

        const knownSlots = [...this._lazySlots.keys()];
        UCUFLogger.info(LogCategory.UI, `[UIScreenPreviewHost-DIAG] slotId=${slotId}, 已知 lazySlots=${JSON.stringify(knownSlots)}`);

        let boundCount = 0;

        for (const [buttonName, fragmentId] of Object.entries(buttonFragmentMap)) {
            const button = binder.getButton(buttonName);
            if (!button) {
                UCUFLogger.warn(LogCategory.UI, `[UIScreenPreviewHost-DIAG] 找不到 button: ${buttonName}（可能 binder 未包含此節點）`);
                continue;
            }

            // 診斷：確認 Button component 的 interactable 狀態
            UCUFLogger.info(LogCategory.UI, `[UIScreenPreviewHost-DIAG] found button: ${buttonName}, interactable=${button.interactable}, node.active=${button.node.active}`);

            button.node.off('__diagHook__', undefined, this);
            button.node.on(Node.EventType.TOUCH_END, () => {
                UCUFLogger.info(LogCategory.UI, `[UIScreenPreviewHost-DIAG] TOUCH_END → ${buttonName} → fragment=${fragmentId}`);
                void this.switchLazySlot(slotId, fragmentId).then((ok) => {
                    UCUFLogger.info(LogCategory.UI, `[UIScreenPreviewHost-DIAG] switchLazySlot result=${ok}, slotId=${slotId}, fragment=${fragmentId}`);
                });
            }, this);

            boundCount += 1;
        }

        UCUFLogger.info(LogCategory.UI, `[UIScreenPreviewHost-DIAG] installTabSwitchHook 完成：boundCount=${boundCount}/${Object.keys(buttonFragmentMap).length}`);
        return boundCount;
    }

    public async showScreen(screenId: string): Promise<void> {
        if (!screenId) {
            UCUFLogger.warn(LogCategory.UI, '[UIScreenPreviewHost] screenId 為空，略過載入');
            return;
        }

        if (this._isLoading) {
            UCUFLogger.warn(LogCategory.UI, `[UIScreenPreviewHost] 正在載入中，略過重複請求: ${screenId}`);
            return;
        }

        if (this._currentScreenId === screenId && this.node.children.length > 0) {
            UCUFLogger.info(LogCategory.UI, `[UIScreenPreviewHost] screen 已掛載，略過重建: ${screenId}`);
            await this._applyRuntimeState(screenId);
            return;
        }

        this._isLoading = true;
        try {
            this._destroyBuiltChildren();

            const { screen, layout, skin } = await this._specLoader.loadFullScreen(screenId);
            const i18n = await this._specLoader.loadI18n(this.locale);
            const tokens = await this._specLoader.loadDesignTokensForScreen(screenId);

            await this.buildScreen(layout, skin, i18n, tokens);
            await this._loadDefaultFragments(screen);
            await this._installSyncedInteractionSidecars(screenId, screen);
            this._currentScreenId = screenId;
            await this._applyRuntimeState(screenId);

            UCUFLogger.info(LogCategory.UI, `[UIScreenPreviewHost] mounted ${screenId} -> ${screen.uiId}`);
        } catch (error) {
            UCUFLogger.error(LogCategory.UI, `[UIScreenPreviewHost] 載入 screen 失敗: ${screenId}`, error);
            throw error;
        } finally {
            this._isLoading = false;
        }
    }

    private _destroyBuiltChildren(): void {
        this._clearInteractionSidecarHooks();
        this._interactionSmokeResults = [];
        this._interactionActionsBound = 0;
        this._binder = null;
        this._lazySlots.clear();
        const children = [...this.node.children];
        for (const child of children) {
            child.destroy();
        }
    }

    protected onReady(binder: UITemplateBinder): void {
        this._binder = binder;
    }

    protected override _onLazySlotCreated(spec: UILayoutNodeSpec, node: Node, w: number, h: number): void {
        if (!spec.name) {
            throw new Error('[UIScreenPreviewHost] lazySlot 缺少 spec.name，無法載入 defaultFragment');
        }
        this._lazySlots.set(spec.name, { spec, node, parentW: w, parentH: h });
    }

    private async _installSyncedInteractionSidecars(screenId: string, screen: UIScreenSpec): Promise<void> {
        this._clearInteractionSidecarHooks();
        this._interactionSmokeResults = [];
        this._interactionActionsBound = 0;

        const interaction = await this._specLoader.loadScreenSidecar<PreviewInteractionSidecar>(screenId, 'interaction');
        if (!interaction || !Array.isArray(interaction.actions) || interaction.actions.length === 0) {
            return;
        }

        const tabSidecar = await this._specLoader.loadScreenSidecar<PreviewTabRoutingSidecar>(screenId, 'tab-routing');
        const routeMap = this._buildTabRouteMap(screen, tabSidecar);
        for (const action of interaction.actions) {
            this._bindSidecarInteractionAction(action, routeMap);
        }

        UCUFLogger.info(LogCategory.UI, `[UIScreenPreviewHost] interaction sidecar bound ${this._interactionActionsBound}/${interaction.actions.length}`);
    }

    private _buildTabRouteMap(screen: UIScreenSpec, tabSidecar: PreviewTabRoutingSidecar | null): Map<string, TabRoute> {
        const routeMap = new Map<string, TabRoute>();
        const addRoute = (key: string | undefined, route: Partial<TabRoute> | null | undefined): void => {
            if (!key || !route || !route.slotId || !route.fragment) return;
            routeMap.set(this._normalizeRouteKey(key), {
                slotId: route.slotId,
                fragment: route.fragment,
                transition: route.transition,
            });
        };

        for (const [key, route] of Object.entries(screen.tabRouting ?? {})) {
            addRoute(key, route);
        }

        for (const tab of tabSidecar?.tabs ?? []) {
            const slotId = tab.slotId ?? tab.mount;
            addRoute(tab.id ?? tab.key, slotId && tab.fragment ? { slotId, fragment: tab.fragment } : null);
        }

        return routeMap;
    }

    private _bindSidecarInteractionAction(action: PreviewInteractionAction, routeMap: Map<string, TabRoute>): void {
        const actionId = action.id || `${action.trigger || 'unknown'}.${action.type || 'action'}`;
        const trigger = action.trigger || '';
        const target = action.target || action.smoke?.expectActiveTab || '';

        if (action.type !== 'tabSwitch' && action.type !== 'openPanel' && action.type !== 'closeModal') {
            this._interactionSmokeResults.push({ actionId, trigger, target, status: 'unsupported' });
            return;
        }

        const button = this._binder?.getButton(trigger);
        if (!button) {
            this._interactionSmokeResults.push({
                actionId,
                trigger,
                target,
                status: 'missing-trigger',
            });
            return;
        }

        if (action.type === 'openPanel' || action.type === 'closeModal') {
            const targetNode = target && target !== 'self' ? this._binder?.getNode(target) : button.node;
            if (!targetNode) {
                this._interactionSmokeResults.push({ actionId, trigger, target, status: 'missing-route' });
                return;
            }
            // Plan 4.1：簡單面板開關必須真的在 runtime 綁定，不能只靠 workflow 複製 sidecar 宣稱通過。
            const panelCallback = () => {
                targetNode.active = action.type === 'openPanel';
            };
            button.node.on(Node.EventType.TOUCH_END, panelCallback, this);
            this._sidecarInteractionHooks.push({ node: button.node, callback: panelCallback });
            this._interactionActionsBound += 1;
            this._interactionSmokeResults.push({ actionId, trigger, target, status: 'bound' });
            return;
        }

        const route = this._resolveInteractionRoute(routeMap, target);
        if (!route) {
            this._interactionSmokeResults.push({ actionId, trigger, target, status: 'missing-route' });
            return;
        }

        // Plan 4：sidecar 綁定必須由 runtime 執行，不能只在 workflow 複製 JSON 後宣稱通過。
        const callback = () => {
            void this.switchLazySlot(route.slotId, route.fragment).then((ok) => {
                if (!ok) {
                    UCUFLogger.warn(LogCategory.UI, `[UIScreenPreviewHost] sidecar tabSwitch failed: ${actionId}`);
                }
            });
        };
        button.node.on(Node.EventType.TOUCH_END, callback, this);
        this._sidecarInteractionHooks.push({ node: button.node, callback });
        this._interactionActionsBound += 1;
        this._interactionSmokeResults.push({
            actionId,
            trigger,
            target,
            status: 'bound',
            slotId: route.slotId,
            fragment: route.fragment,
        });
    }

    private _resolveInteractionRoute(routeMap: Map<string, TabRoute>, target: string): TabRoute | undefined {
        const key = this._normalizeRouteKey(target);
        const direct = routeMap.get(key);
        if (direct) {
            return direct;
        }
        const routes = [...routeMap.values()];
        if (/^(?:pool-)?prev(?:ious)?$/.test(key)) {
            return routes[routes.length - 1];
        }
        if (/^(?:pool-)?next$/.test(key)) {
            return routes[0];
        }
        return undefined;
    }

    private _clearInteractionSidecarHooks(): void {
        for (const hook of this._sidecarInteractionHooks) {
            hook.node.off(Node.EventType.TOUCH_END, hook.callback, this);
        }
        this._sidecarInteractionHooks.length = 0;
    }

    private _normalizeRouteKey(value: string | undefined): string {
        return String(value || '')
            .trim()
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .replace(/[^a-z0-9]+/gi, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();
    }

    private async _loadDefaultFragments(screen: UIScreenSpec): Promise<void> {
        const previewFragments = screen.preview?.lazySlotFragments ?? {};
        for (const entry of this._lazySlots.values()) {
            const fragmentId = previewFragments[entry.spec.name] ?? entry.spec.defaultFragment;
            if (!fragmentId) {
                continue;
            }
            await this._switchPreviewSlot(entry, fragmentId);
        }
    }

    private async _switchPreviewSlot(entry: PreviewLazySlotEntry, fragmentId: string): Promise<void> {
        if (entry.currentFragmentId === fragmentId && entry.node.children.length > 0) {
            return;
        }

        for (const child of [...entry.node.children]) {
            child.destroy();
        }

        const fragmentLayout = await this._specLoader.loadLayout(fragmentId);
        await this._buildNode(fragmentLayout.root, entry.node, entry.parentW, entry.parentH);
        this._postBuildPass(entry.node);

        const fragmentRootNode = entry.node.children[entry.node.children.length - 1] ?? null;
        if (this._binder && fragmentRootNode) {
            this._binder.bindLazyFragment(fragmentRootNode, fragmentLayout.root);
        }
        entry.currentFragmentId = fragmentId;
    }

    private async _applyRuntimeState(screenId: string): Promise<void> {
        if (!this._binder) {
            return;
        }

        await applyUIScreenRuntimeState(this._binder, screenId, {
            tags: ['UIScreenPreviewHost'],
        });
    }
}
