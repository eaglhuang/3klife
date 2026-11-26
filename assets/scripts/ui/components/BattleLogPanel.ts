import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
// @spec-source → 見 docs/cross-reference-index.md
/**
 * @deprecated
 * BattleLogPanel — 右側面板（已廢止，請使用 BattleLogComposite）
 *
 * 職責：
 *   1. 顯示滾動式戰鬥日誌已遷移至 CompositePanel
 *   2. 折疊/展開日誌區已遷移
 *   3. 控制列已遷移
 *
 * 遷移完成時間：2026-04-13 (Wave 2)
 * 預計刪除：2026-05-13 (Wave 2 全部遷移後)
 *
 * Unity 對照：BattleRightPanel，含 BattleLog + 控制列
 */
import { _decorator, Button, Label, Node, ScrollView, tween, UIOpacity, UITransform } from "cc";
import { UIPreviewBuilder } from '../core/UIPreviewBuilder';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { EVENT_NAMES } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';

const { ccclass, property } = _decorator;

@ccclass("BattleLogPanel")
export class BattleLogPanel extends UIPreviewBuilder {

    // ── Inspector 備用綁定（@property 優先；未綁定時由 onReady 自動填入）──
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
    private _logPanelNode: Node | null = null;   // BattleLogPanel 子節點（可折疊區段）
    private _collapsedHeight = 0;
    private _expandedHeight = 410;
    private _initialized = false;
    private _buildCompleted = false;
    private readonly _readyWaiters: Array<(ready: boolean) => void> = [];
    // 控制列狀態
    private _speed    = 1;      // 遊戲速度（1 | 2）
    // 控制列節點引用（供視覺反饋使用）
    private _btnAuto:    Node | null = null;
    private _btnSpeed:   Node | null = null;

    private get _specLoader() { return services().specLoader; }

    // ── 生命週期 ─────────────────────────────────────────────────────────────

    async onLoad(): Promise<void> {
        services().initialize(this.node);
        await this._initialize();
        this.clear();
    }

    private async _initialize(): Promise<void> {
        if (this._initialized) return;
        try {
            const [fullScreen, i18n, tokens] = await Promise.all([
                this._specLoader.loadFullScreen('battle-log-screen'),
                this._specLoader.loadI18n(services().i18n.currentLocale),
                this._specLoader.loadDesignTokens(),
            ]);
            await this.buildScreen(fullScreen.layout, fullScreen.skin, i18n, tokens);
            this._initialized = true;
        } catch (e) {
            UCUFLogger.warn(LogCategory.UI, '[BattleLogPanel] 規格載入失敗，退回白模', e);
            this._initialized = true;
            this._flushReadyWaiters(false);
        }
    }

    // ── 覆寫建構點：透過 binder 自動綁定節點引用 ─────────────────────────────

    protected onReady(binder: UITemplateBinder): void {
        // 日誌捲動區
        if (!this.scrollView) {
            this.scrollView = binder.getScrollView('ScrollView') ?? null!;
        }

        // 日誌 Label（ContentNode → LogLabel）
        if (!this.logLabel) {
            this.logLabel = binder.getLabel('LogLabel') ?? null!;
        }
        this._contentNode = binder.getNode('ContentNode');

        // 可折疊的日誌面板節點
        this._logPanelNode = binder.getNode('BattleLogPanel');
        const tf = this._logPanelNode?.getComponent(UITransform);
        if (tf) {
            this._expandedHeight = tf.height;
        }

        // ── 控制列按鈕（BtnAuto / BtnSpeed / BtnSetting）────────────────────
        this._btnAuto  = binder.getNode('BtnAuto');
        this._btnSpeed = binder.getNode('BtnSpeed');
        this._btnAuto?.on(Button.EventType.CLICK,    this._onAutoClick,    this);
        this._btnSpeed?.on(Button.EventType.CLICK,   this._onSpeedClick,   this);
        this._syncSpeedButton();
        binder.getNode('BtnSetting')?.on(Button.EventType.CLICK, this._onSettingClick, this);

        // BtnCollapse：折疊 / 展開日誌
        binder.getNode('BtnCollapse')?.on(Button.EventType.CLICK, this._onCollapseClick, this);

        UCUFLogger.info(LogCategory.UI, 
            `[BattleLogPanel] 綁定完成 — ` +
            `scrollView:${!!this.scrollView} label:${!!this.logLabel} contentNode:${!!this._contentNode}`
        );

        this._applyCollapsedState(this._collapsed, false);

        this._buildCompleted = true;
        this._flushReadyWaiters(true);
    }

    // ── 公開 API ──────────────────────────────────────────────────────────────

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
        if (this._buildCompleted) {
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
            this.scheduleOnce(() => finish(this._buildCompleted), Math.max(0, timeoutMs) / 1000);
        });
    }

    // ── 私有：日誌刷新 ───────────────────────────────────────────────────────

    private _flush(): void {
        if (!this.logLabel) return;
        this.logLabel.string = this._lines.join('\n');

        // 依內容行數動態調整 ContentNode 高度，再捲至底部
        const contentTf = this._contentNode?.getComponent(UITransform);
        if (contentTf) {
            const lineH = this.logLabel.lineHeight || 18;
            const estimated = Math.max(180, this._lines.length * lineH + 24);
            contentTf.setContentSize(contentTf.width, estimated);
        }
        this.scrollView?.scrollToBottom(0.05);
    }

    // ── 私有：按鈕事件處理 ───────────────────────────────────────────────────

    /**
     * 自動鈕（PROG-2-9707）：每次按下都只通知「被按了」，開啟自動代打或跳過演出由戰場橋接層決定，
     * 外觀由橋接層呼叫 setAutoActive 同步，避免按鈕自己翻狀態與實際不一致。
     */
    private _onAutoClick(): void {
        services().event.emit(EVENT_NAMES.AutoBattleToggled, true);
        UCUFLogger.info(LogCategory.UI, '[BattleLogPanel] AutoBattle pressed');
    }

    /** 自動代打鈕亮暗跟戰場實際狀態走（PROG-2-9707）；由戰場橋接層呼叫 */
    public setAutoActive(active: boolean): void {
        const op = this._btnAuto?.getComponent('cc.UIOpacity') as any;
        if (op) op.opacity = active ? 180 : 255;
    }

    /**
     * 由戰場橋接層指定速度（首戰教學預設 x2，PROG-2-10072）：只同步按鈕外觀與內部狀態，
     * 實際倍率由橋接層自己呼叫 setBattleTimeScale；玩家仍可按速度鈕切回 x1。
     */
    public setSpeed(speed: 1 | 2): void {
        this._speed = speed;
        this._syncSpeedButton();
    }

    /** x2 亮起（opacity 180）；速度鈕可能還沒掛 UIOpacity（首戰一開場就是 x2），亮起時補掛 */
    private _syncSpeedButton(): void {
        const btn = this._btnSpeed;
        if (!btn) return;
        const op = btn.getComponent(UIOpacity) ?? (this._speed === 2 ? btn.addComponent(UIOpacity) : null);
        if (op) op.opacity = this._speed === 2 ? 180 : 255;
    }

    /** 戰鬥速度切換（x1 ↔ x2） */
    private _onSpeedClick(): void {
        this._speed = this._speed === 1 ? 2 : 1;
        this._syncSpeedButton();
        services().event.emit(EVENT_NAMES.BattleSpeedToggled, this._speed);
        UCUFLogger.info(LogCategory.UI, `[BattleLogPanel] BattleSpeed → ${this._speed}x`);
    }

    /** 開啟設定面板 */
    private _onSettingClick(): void {
        services().event.emit(EVENT_NAMES.ShowSettingsRequested);
        UCUFLogger.info(LogCategory.UI, '[BattleLogPanel] ShowSettings requested');
    }

    /**
     * 折疊 / 展開日誌面板。
     * tween 0.3s 動畫改變 BattleLogPanel 子節點的 height。
     * Unity 對照：ToggleLogPanel() 搭配 DOTween
     */
    private _onCollapseClick(): void {
        this._collapsed = !this._collapsed;
        this._applyCollapsedState(this._collapsed, true);
    }

    private _applyCollapsedState(collapsed: boolean, animated: boolean): void {
        const panelNode = this._logPanelNode;
        if (!panelNode) return;

        const tf = panelNode.getComponent(UITransform);
        if (!tf) return;

        const targetH = collapsed ? this._collapsedHeight : this._expandedHeight;

        if (!collapsed) {
            panelNode.active = true;
        }

        if (!animated) {
            tf.height = targetH;
            panelNode.active = !collapsed;
            return;
        }

        tween(tf)
            .to(0.3, { height: targetH } as any, { easing: 'quadOut' })
            .call(() => {
                if (panelNode && collapsed) panelNode.active = false;
            })
            .start();
    }

    private _flushReadyWaiters(ready: boolean): void {
        while (this._readyWaiters.length > 0) {
            const resolve = this._readyWaiters.shift();
            resolve?.(ready);
        }
    }

}

