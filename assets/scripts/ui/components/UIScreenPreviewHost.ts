// @spec-source → 見 docs/cross-reference-index.md
import { _decorator, Node } from 'cc';
import { UIPreviewBuilder } from '../core/UIPreviewBuilder';
import { UISpecLoader } from '../core/UISpecLoader';
import { services } from '../../core/managers/ServiceLoader';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { applyUIScreenRuntimeState } from '../core/UIScreenRuntimeStateRegistry';
import type { UILayoutNodeSpec, UIScreenSpec } from '../core/UISpecTypes';

const { ccclass, property } = _decorator;

interface PreviewLazySlotEntry {
    spec: UILayoutNodeSpec;
    node: Node;
    parentW: number;
    parentH: number;
    currentFragmentId?: string;
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

    public get binder(): UITemplateBinder | null {
        return this._binder;
    }

    /**
     * 供 Preview route 動態切換 lazySlot 內容。
     * Unity 對照：Editor preview 下手動切換同一個 ContentHost 的 SubView prefab。
     */
    public async switchLazySlot(slotId: string, fragmentId: string): Promise<boolean> {
        const entry = this._lazySlots.get(slotId);
        if (!entry) {
            console.warn(`[UIScreenPreviewHost] switchLazySlot: 找不到 slotId=${slotId}`);
            return false;
        }

        await this._switchPreviewSlot(entry, fragmentId);
        return true;
    }

    public async showScreen(screenId: string): Promise<void> {
        if (!screenId) {
            console.warn('[UIScreenPreviewHost] screenId 為空，略過載入');
            return;
        }

        if (this._isLoading) {
            console.warn(`[UIScreenPreviewHost] 正在載入中，略過重複請求: ${screenId}`);
            return;
        }

        if (this._currentScreenId === screenId && this.node.children.length > 0) {
            console.log(`[UIScreenPreviewHost] screen 已掛載，略過重建: ${screenId}`);
            await this._applyRuntimeState(screenId);
            return;
        }

        this._isLoading = true;
        try {
            this._destroyBuiltChildren();

            const { screen, layout, skin } = await this._specLoader.loadFullScreen(screenId);
            const i18n = await this._specLoader.loadI18n(this.locale);
            const tokens = await this._specLoader.loadDesignTokens();

            await this.buildScreen(layout, skin, i18n, tokens);
            await this._loadDefaultFragments(screen);
            this._currentScreenId = screenId;
            await this._applyRuntimeState(screenId);

            console.log(`[UIScreenPreviewHost] mounted ${screenId} -> ${screen.uiId}`);
        } catch (error) {
            console.error(`[UIScreenPreviewHost] 載入 screen 失敗: ${screenId}`, error);
            throw error;
        } finally {
            this._isLoading = false;
        }
    }

    private _destroyBuiltChildren(): void {
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