import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
// @spec-source → 見 docs/cross-reference-index.md (UCUF Wave 2)
/**
 * BattleLogComposite — 右側面板（控制列 + 戰鬥日誌）（CompositePanel 版）
 *
 * UCUF Wave 2 — 將 BattleLogPanel（UIPreviewBuilder）遷移至 CompositePanel 架構。
 *
 * 職責：
 *   1. 顯示滾動式戰鬥日誌
 *   2. BtnCollapse：折疊/展開日誌區（tween 0.3s）
 *   3. Auto/x2/⚙ 控制列位於日誌上方（常駐顯示）
 *
 * 遷移重點：
 *   - buildScreen() → mount('battle-log-screen')
 *   - onReady(binder) → _onAfterBuildReady(binder)
 *   - append() / clear() / waitUntilReady() 公開 API 相同
 *   - 控制列事件發射相同（AutoBattleToggled / BattleSpeedToggled）
 *
 * Unity 對照：BattleRightPanel，含 BattleLog + 控制列
 */
import { _decorator, Button, Label, Node, ScrollView, tween, UIOpacity, UITransform, Widget } from "cc";
import { BattleSettingsComposite } from './BattleSettingsComposite';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { EVENT_NAMES } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';

const { ccclass, property } = _decorator;

/** 日誌文字節點的高度上限（像素）；再高就超過文字貼圖能畫的範圍 */
const BATTLE_LOG_MAX_LABEL_HEIGHT = 1920;

@ccclass("BattleLogComposite")
export class BattleLogComposite extends CompositePanel {

    // ── Inspector 備用綁定（@property 優先；未綁定時由 _onAfterBuildReady 自動填入）──
    @property(Label)
    logLabel: Label = null!;

    @property(ScrollView)
    scrollView: ScrollView = null!;

    @property
    maxLines = 80;

    // ── 私有狀態 ─────────────────────────────────────────────────────────────
    private readonly _lines: string[] = [];
    private _contentNode: Node | null = null;
    private _collapsed = true;
    private _logPanelNode: Node | null = null;
    private _isMounted = false;
    private readonly _readyWaiters: Array<(ready: boolean) => void> = [];
    // 控制列狀態
    private _speed    = 1;      // 遊戲速度（1 | 2）
    private _settings: BattleSettingsComposite | null = null;
    // 控制列節點引用（供視覺反饋使用）
    private _btnAuto:    Node | null = null;
    private _btnSpeed:   Node | null = null;
    private _btnDelegate: Node | null = null;
    private _delegateActive = false;

    // ── 生命週期 ─────────────────────────────────────────────────────────────

    async onLoad(): Promise<void> {
        services().initialize(this.node);
        await this.mount();
    }

    protected onDestroy(): void {
        this.unmount();
        this._isMounted = false;
    }

    // ── 公開 API ──────────────────────────────────────────────────────────────

    /**
     * 掛載並初始化面板。
     * 初次呼叫時掛載 screen；後續呼叫無效（已掛載）。
     */
    public async mount(): Promise<void> {
        if (this._isMounted) return;
        try {
            await super.mount('battle-log-screen');
            this._isMounted = true;
            this.clear();
        } catch (e) {
            UCUFLogger.warn(LogCategory.UI, '[BattleLogComposite] mount 失敗', e);
            this._isMounted = true;
            this._flushReadyWaiters(false);
        }
    }

    /** 清空日誌。Unity 對照：ClearLog() */
    public clear(): void {
        this._lines.length = 0;
        this._flush();
    }

    /**
     * 追加一行文字到日誌末尾。
     * 超出 maxLines 時自動刪除最舊一行。
     * Unity 對照：AppendLine(string text)
     */
    public append(text: string): void {
        if (!text) return;
        this._lines.push(text);
        while (this._lines.length > Math.max(1, this.maxLines)) {
            this._lines.shift();
        }
        this._flush();
    }

    public waitUntilReady(timeoutMs = 5000): Promise<boolean> {
        if (this._isMounted) {
            return Promise.resolve(true);
        }

        return new Promise<boolean>((resolve) => {
            let settled = false;
            const finish = (ready: boolean) => {
                if (settled) return;
                settled = true;
                resolve(ready);
            };

            this._readyWaiters.push(finish);
            this.scheduleOnce(() => finish(this._isMounted), Math.max(0, timeoutMs) / 1000);
        });
    }

    // ── CompositePanel 鉤子 ───────────────────────────────────

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        // 日誌捲動區
        if (!this.scrollView) {
            this.scrollView = binder.getScrollView('ScrollView') ?? null!;
        }

        // 日誌 Label（ContentNode → LogLabel）
        if (!this.logLabel) {
            this.logLabel = binder.getLabel('LogLabel') ?? null!;
        }
        this._contentNode = binder.getNode('ContentNode');
        // content 是頂端錨點，文字也要頂端對齊；否則上半段會長到遮罩／標題之上。
        const contentTf = this._contentNode?.getComponent(UITransform);
        const labelTf = this.logLabel?.node.getComponent(UITransform);
        if (contentTf && labelTf) {
            labelTf.setAnchorPoint(0.5, 1);
            labelTf.setContentSize(Math.max(1, contentTf.width - 24), labelTf.height);
            this.logLabel.node.setPosition(0, -12, 0);
            this.logLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
            this.logLabel.enableWrapText = true;
        }

        // 可折疊的日誌面板節點
        this._logPanelNode = binder.getNode('BattleLogPanel');

        // ── 控制列按鈕（BtnAuto / BtnSpeed / BtnSetting）────────────────────
        this._btnAuto  = binder.getNode('BtnAuto');
        this._btnSpeed = binder.getNode('BtnSpeed');
        this._btnDelegate = binder.getNode('BtnDelegate');
        this.setDelegateActive(false);
        this._btnDelegate?.on(Button.EventType.CLICK, this._onDelegateClick, this);
        this._btnAuto?.on(Button.EventType.CLICK,    this._onAutoClick,    this);
        this._btnSpeed?.on(Button.EventType.CLICK,   this._onSpeedClick,   this);
        binder.getNode('BtnSetting')?.on(Button.EventType.CLICK, this._onSettingClick, this);

        // BtnCollapse：折疊 / 展開日誌
        binder.getNode('BtnCollapse')?.on(Button.EventType.CLICK, this._onCollapseClick, this);

        UCUFLogger.info(LogCategory.UI, 
            `[BattleLogComposite] 綁定完成 — ` +
            `scrollView:${!!this.scrollView} label:${!!this.logLabel} contentNode:${!!this._contentNode}`
        );

        this._applyCollapsedState(this._collapsed, false);
        this._flushReadyWaiters(true);
    }

    // ── 私有：日誌刷新 ───────────────────────────────────────────────────────

    private _flush(): void {
        if (!this.logLabel) return;
        this.logLabel.string = this._lines.join('\n');
        this.logLabel.updateRenderData(true);
        // 一則日誌可能含多行又會自動換行，只限制則數不夠：文字高度超過貼圖上限時整塊會被壓縮、
        // 新的行顯示不出來。這裡依實際高度再裁掉最舊的幾則。
        const labelTf = this.logLabel.node.getComponent(UITransform);
        while (labelTf && labelTf.height > BATTLE_LOG_MAX_LABEL_HEIGHT && this._lines.length > 1) {
            this._lines.splice(0, Math.max(1, Math.ceil(this._lines.length * 0.1)));
            this.logLabel.string = this._lines.join('\n');
            this.logLabel.updateRenderData(true);
        }

        const contentTf = this._contentNode?.getComponent(UITransform);
        if (contentTf) {
            const lineH = this.logLabel.lineHeight || 18;
            const renderedHeight = this.logLabel.node.getComponent(UITransform)?.height ?? this._lines.length * lineH;
            const viewportHeight = this.scrollView?.node.getComponent(UITransform)?.height ?? 180;
            const estimated = Math.max(viewportHeight, renderedHeight + 24);
            contentTf.setContentSize(contentTf.width, estimated);
        }
        this.scrollView?.scrollToBottom(0.05);
    }

    /** 委任鈕的亮暗跟控制器實際狀態走（PROG-2-1766）；由戰場橋接層呼叫 */
    public setDelegateActive(active: boolean): void {
        this._delegateActive = active;
        const btn = this._btnDelegate;
        if (!btn) return;
        const op = btn.getComponent(UIOpacity) ?? btn.addComponent(UIOpacity);
        op.opacity = active ? 255 : 130;
    }

    // ── 私有：按鈕事件處理 ───────────────────────────────────────────────────

    /**
     * 自動鈕（PROG-2-9707）：每次按下都只通知「被按了」，開啟自動代打或跳過演出由戰場橋接層決定，
     * 外觀由橋接層呼叫 setAutoActive 同步。
     */
    private _onAutoClick(): void {
        services().event.emit(EVENT_NAMES.AutoBattleToggled, true);
        UCUFLogger.info(LogCategory.UI, '[BattleLogComposite] AutoBattle pressed');
    }

    /** 自動代打鈕亮暗跟戰場實際狀態走（PROG-2-9707）；由戰場橋接層呼叫 */
    public setAutoActive(active: boolean): void {
        const op = this._btnAuto?.getComponent('cc.UIOpacity') as any;
        if (op) op.opacity = active ? 180 : 255;
    }

    private _onDelegateClick(): void {
        services().event.emit(EVENT_NAMES.DelegateToggled, !this._delegateActive);
    }

    private _onSpeedClick(): void {
        this._speed = this._speed === 1 ? 2 : 1;
        const op = this._btnSpeed?.getComponent('cc.UIOpacity') as any;
        if (op) op.opacity = this._speed === 2 ? 180 : 255;
        services().event.emit(EVENT_NAMES.BattleSpeedToggled, this._speed);
        UCUFLogger.info(LogCategory.UI, `[BattleLogComposite] BattleSpeed → ${this._speed}x`);
    }

    private _onSettingClick(): void {
        void this._ensureSettings().show();
        services().event.emit(EVENT_NAMES.ShowSettingsRequested);
        UCUFLogger.info(LogCategory.UI, '[BattleLogComposite] ShowSettings requested');
    }

    /** 設定面板掛在戰報面板的父節點（戰場 UI 根）上，蓋住整個畫面（PROG-2-1890） */
    private _ensureSettings(): BattleSettingsComposite {
        if (this._settings && this._settings.isValid) return this._settings;
        const host = this.node.parent ?? this.node;
        const panelNode = host.getChildByName('BattleSettings') ?? new Node('BattleSettings');
        panelNode.layer = this.node.layer;
        if (!panelNode.parent) panelNode.parent = host;
        const ut = panelNode.getComponent(UITransform) ?? panelNode.addComponent(UITransform);
        ut.setContentSize(1920, 1080);
        const widget = panelNode.getComponent(Widget) ?? panelNode.addComponent(Widget);
        widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
        widget.top = widget.bottom = widget.left = widget.right = 0;
        this._settings = panelNode.getComponent(BattleSettingsComposite) ?? panelNode.addComponent(BattleSettingsComposite);
        return this._settings;
    }

    private _onCollapseClick(): void {
        this._collapsed = !this._collapsed;
        this._applyCollapsedState(this._collapsed, true);
    }

    /**
     * 展開／收合只切換顯示與淡入淡出，不改面板高度。
     * 以前用改高度做動畫：面板錨點在中央，收合狀態下若版面重新對齊，展開時整塊會往上長半個面板高，
     * 蓋到敵方主將與棋盤最右兩行（PROG-2-9389）。
     */
    private _applyCollapsedState(collapsed: boolean, animated: boolean): void {
        const panelNode = this._logPanelNode;
        if (!panelNode) return;
        const op = panelNode.getComponent(UIOpacity) ?? panelNode.addComponent(UIOpacity);
        tween(op).stop();
        if (!animated) {
            op.opacity = collapsed ? 0 : 255;
            panelNode.active = !collapsed;
            return;
        }
        if (!collapsed) {
            panelNode.active = true;
            op.opacity = 0;
            this.scrollView?.scrollToBottom(0);
        }
        tween(op)
            .to(0.2, { opacity: collapsed ? 0 : 255 }, { easing: 'quadOut' })
            .call(() => { if (collapsed && panelNode.isValid) panelNode.active = false; })
            .start();
    }

    private _flushReadyWaiters(ready: boolean): void {
        while (this._readyWaiters.length > 0) {
            const resolve = this._readyWaiters.shift();
            resolve?.(ready);
        }
    }
}
