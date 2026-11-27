// @spec-source → 見 docs/cross-reference-index.md
import { _decorator, BlockInputEvents, Color, Label, Node, Tween, tween, UITransform, UIOpacity, Vec3, Widget } from "cc";
import { TOAST_FADE_SEC, TOAST_RISE_PX, keepBracketsTogether, toastCenterY, toastHoldSec, toastUnitsPerLine } from '../../core/systems/ToastMotion';
import { services } from "../../core/managers/ServiceLoader";
import { UIPreviewBuilder } from "../core/UIPreviewBuilder";
import { SolidBackground } from './SolidBackground';
import { mergeHeldToasts, ToastQueue } from '../core/ToastQueue';

const { ccclass } = _decorator;

export interface ToastOptions {
  color?: Color;
  duration?: number;
  /** 可選識別鍵；搭配 HIDE_TOAST(key) 可只收起指定 toast */
  key?: string;
  /** true 時顯示全螢幕半透明擋板 + 置中文字，需配合 HIDE_TOAST 事件收起 */
  blocking?: boolean;
}

interface QueuedToast {
  message: string;
  duration?: number;
  options?: ToastOptions;
}

@ccclass("ToastMessage")
export class ToastMessage extends UIPreviewBuilder {
  
  private get _specLoader() { return services().specLoader; }
  private hideTween: Tween<UIOpacity> | null = null;
  /** 上浮消失的位移 tween 與 ToastRoot 原位（主戰場UI §4.1，PROG-2-1894） */
  private riseTween: Tween<Node> | null = null;
  private _rootBasePos: Vec3 | null = null;
  /** 設計稿給的原位 y（畫面上方）；彈窗開著時改貼底緣，見 toastCenterY */
  private _designY = 0;
  private _placedAtModal = false;
  private _isBuilt = false;
  private _blockingOverlay: Node | null = null;
  private _activeToastKey: string | null = null;
  private _queue = new ToastQueue<QueuedToast>();
  /** 全螢幕典禮（年末頒獎）期間暫停顯示：提示先存著，典禮收掉後依序播，免得蓋住典禮（PROG-2-10153） */
  private _suppressed = false;
  private _suppressedHeld: QueuedToast[] = [];

  /** 開始／結束暫停；開始時正在顯示的與排隊的先收起並存下，結束時依序補播 */
  public setSuppressed(on: boolean): void {
    if (on === this._suppressed) return;
    this._suppressed = on;
    if (on) {
      this._suppressedHeld = mergeHeldToasts(this._queue.drain(), this._suppressedHeld);
      if (this.hideTween) { this.hideTween.stop(); this.hideTween = null; }
      this._stopRise();
      this.node.active = false;
      return;
    }
    const held = this._suppressedHeld;
    this._suppressedHeld = [];
    for (const toast of held) void this.show(toast.message, toast.duration, toast.options);
  }

  /** 建立（或複用）全螢幕排序擋板 */
  private _ensureBlockingOverlay(): Node {
    if (this._blockingOverlay) return this._blockingOverlay;

    const overlay = new Node('BlockingOverlay');
    overlay.layer = this.node.layer;
    // 全螢幕半透明深色底
    overlay.addComponent(UITransform).setContentSize(1920, 1080);
    overlay.addComponent(SolidBackground).color = new Color(18, 14, 10, 210);
    const w = overlay.addComponent(Widget);
    w.isAlignTop = true;    w.top    = 0;
    w.isAlignBottom = true; w.bottom = 0;
    w.isAlignLeft = true;   w.left   = 0;
    w.isAlignRight = true;  w.right  = 0;

    // 置中提示文字
    const lblNode = new Node('BlockingLabel');
    lblNode.layer = this.node.layer;
    lblNode.addComponent(UITransform).setContentSize(400, 60);
    const lbl = lblNode.addComponent(Label);
    lbl.string = '【 排序中 】';
    lbl.fontSize = 28;
    lbl.color = new Color(255, 220, 80, 255);
    lbl.lineHeight = 40;
    lbl.horizontalAlign = Label.HorizontalAlign.CENTER;
    lbl.verticalAlign   = Label.VerticalAlign.CENTER;
    const lw = lblNode.addComponent(Widget);
    lw.isAlignHorizontalCenter = true; lw.horizontalCenter = 0;
    lw.isAlignVerticalCenter   = true; lw.verticalCenter   = 0;
    lblNode.parent = overlay;

    overlay.active = false;
    this._blockingOverlay = overlay;
    overlay.parent = this.node;  // 掛在 this.node（全螢幕 ToastContainer）下
    return overlay;
  }

  /** 立即收起 toast（含擋板）；由 HIDE_TOAST 事件觸發 */
  public hide(key?: string): void {
    if (key && this._activeToastKey && key !== this._activeToastKey) return;
    if (this._blockingOverlay) this._blockingOverlay.active = false;
    if (this.hideTween) { this.hideTween.stop(); this.hideTween = null; }
    this._stopRise();
    this._queue.clear();
    this._activeToastKey = null;
    this.node.active = false;
  }

  start(): void {
    this.node.active = false;
    // 監聽全域事件以便讓 SyncManager 等非 UI 腳本可以發送提示
    services().event.onBind('SHOW_TOAST', (payload: { message: string, duration?: number, blocking?: boolean, key?: string }) => {
      void this.show(payload.message, payload.duration, { blocking: payload.blocking, key: payload.key });
    }, this);
    services().event.onBind('TOAST_SUPPRESS', (payload: { on: boolean }) => this.setSuppressed(!!payload?.on), this);
    services().event.onBind('HIDE_TOAST', (payload?: { key?: string }) => this.hide(payload?.key), this);
  }

  public async show(message: string, duration?: number, options?: ToastOptions): Promise<void> {
    // blocking 模式：顯示全螢幕擋板 + 置中文字，跳過一般 toast 流程
    if (options?.blocking) {
      this._activeToastKey = options.key ?? null;
      this.node.active = true;
      this._ensureBlockingOverlay().active = true;
      return;
    }

    // 連發時排隊，避免後一句蓋掉玩家還沒讀的前一句
    const toast: QueuedToast = { message, duration, options };
    if (this._suppressed) {
      this._suppressedHeld = mergeHeldToasts(this._suppressedHeld, [toast]);
      return;
    }
    if (this._queue.offer(toast, Date.now() / 1000)) await this._present(toast);
  }

  private async _present({ message, duration, options }: QueuedToast): Promise<void> {
    this._activeToastKey = options?.key ?? null;

    if (!this._isBuilt) {
        // 1. 動態載入三層結構契約與 Design Tokens v2.2
        const layout = await this._specLoader.loadLayout('toast-message-main');
        const skin = await this._specLoader.loadSkin('toast-message-default');
        const i18n = await this._specLoader.loadI18n(services().i18n.currentLocale);
        const tokens = await this._specLoader.loadDesignTokens();
        
        // 2. 透過 UI 建構引擎產生節點樹
        await this.buildScreen(layout, skin, i18n, tokens);
        this._isBuilt = true;
    }

    this.node.active = true;
    // 之後才掛上的全螢幕面板會排在容器上面，顯示時移回最上層
    if (this.node.parent) this.node.setSiblingIndex(this.node.parent.children.length - 1);

    const rootNode = this.node.getChildByName('ToastRoot');
    if (!rootNode) return;

    // 3. 更新動態文字內容
    const lblNode = rootNode.getChildByName('Message');
    if (lblNode) {
        const lbl = lblNode.getComponent(Label);
        if (lbl) {
            lbl.string = keepBracketsTogether(message, this._unitsPerLine(lblNode, lbl));
            if (options?.color) lbl.color = options.color;
        }
    }

    // 4. 動態顯示與自動隱藏 (取代舊版的 node-level tween)
    const opacity = rootNode.getComponent(UIOpacity) ?? rootNode.addComponent(UIOpacity);
    opacity.opacity = 255; // 每次顯示直接重設為不透明，避免快速點擊產生的閃爍

    if (this.hideTween) {
      this.hideTween.stop();
      this.hideTween = null;
    }

    // 停留後同時淡出並上浮（§4.1）；每次顯示先回到原位
    this._stopRise();
    if (!this._rootBasePos) {
      this._rootBasePos = rootNode.position.clone();
      this._designY = this._rootBasePos.y;
    }
    this._placeRoot(rootNode, this._isModalOpen());
    const hold = toastHoldSec(duration);
    // 用相對位移上浮：彈窗途中開啟、提示條改了位置，上浮仍從目前位置起算
    this.riseTween = tween(rootNode)
      .delay(hold)
      .by(TOAST_FADE_SEC, { position: new Vec3(0, TOAST_RISE_PX, 0) })
      .start();

    this.hideTween = tween(opacity)
      .delay(hold)
      .to(TOAST_FADE_SEC, { opacity: 0 })
      .call(() => {
        const next = this._queue.next(Date.now() / 1000);
        if (next) {
          void this._present(next);
          return;
        }
        this._activeToastKey = null;
        this.node.active = false;
      })
      .start();
  }

  /** 提示條出現後才開啟彈窗（例如換季提示剛出、季報就彈出）：下一幀就讓位，不蓋標題 */
  update(): void {
    const root = this.node.getChildByName('ToastRoot');
    if (!this.node.active || !root || !this._rootBasePos) return;
    const modal = this._isModalOpen();
    if (modal === this._placedAtModal) return;
    this._placeRoot(root, modal);
  }

  /** 依有無彈窗把提示條放到上方設計位置或貼底緣；回原位時順便復原被 _stopRise 記住的原位 */
  private _placeRoot(root: Node, modal: boolean): void {
    const containerH = this.node.getComponent(UITransform)?.height ?? 0;
    const rootH = root.getComponent(UITransform)?.height ?? 0;
    const y = toastCenterY(this._designY, modal, containerH, rootH);
    const base = this._rootBasePos ?? root.position.clone();
    this._rootBasePos = new Vec3(base.x, y, base.z);
    this._placedAtModal = modal;
    root.setPosition(this._rootBasePos);
  }

  /**
   * 目前有沒有彈窗蓋在畫面上：UIManager 的彈窗遮罩顯示中，
   * 或同一場景下有掛 BlockInputEvents 的全螢幕 host（學府、季事件等不走 UIManager 的彈窗）開著。
   */
  private _isModalOpen(): boolean {
    if (services().ui.hasBackdropShown()) return true;
    const siblings = this.node.parent?.children ?? [];
    return siblings.some((child) => child !== this.node && child.activeInHierarchy && !!child.getComponent(BlockInputEvents));
  }

  /** 一行大約放得下幾個全形字：Label 寬度 ÷（字級＋字距） */
  private _unitsPerLine(node: Node, lbl: Label): number {
    const width = node.getComponent(UITransform)?.width ?? 0;
    return toastUnitsPerLine(width, lbl.fontSize, lbl.spacingX);
  }

  private _stopRise(): void {
    this.riseTween?.stop();
    this.riseTween = null;
    const root = this._rootBasePos ? this.node.getChildByName('ToastRoot') : null;
    if (root && this._rootBasePos) root.setPosition(this._rootBasePos);
  }
}
