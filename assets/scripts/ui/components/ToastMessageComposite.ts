// @spec-source → 見 docs/cross-reference-index.md (UCUF Wave 2)
/**
 * ToastMessageComposite — 全域吐司提示系統（Composite 版）
 * Wave 2 migration from ToastMessage - temporary floating notifications
 */
import { _decorator, Color, Label, Tween, tween, UIOpacity } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { ToastQueue } from '../core/ToastQueue';

const { ccclass, property } = _decorator;

export interface ToastOptions {
    text: string;
    duration?: number;
    yOffset?: number;
}

export interface LegacyToastOptions {
    color?: Color;
    duration?: number;
    key?: string;
    blocking?: boolean;
}

/** 排隊中的一句提示；message 供 ToastQueue 判斷重複 */
interface QueuedToast {
    message: string;
    duration: number;
    color?: Color;
}

@ccclass('ToastMessageComposite')
export class ToastMessageComposite extends CompositePanel {
    @property
    defaultDuration = 2.0;

    private _binder: UITemplateBinder | null = null;
    private _isMounted = false;
    private _messageLabel: Label | null = null;
    private _hideTween: Tween<UIOpacity> | null = null;
    /**
     * 連發時排隊依序播，後一句不蓋掉玩家還沒讀的前一句（PROG-2-9341）。
     * 戰場換回合常同時跳兩三句（殘局爆發、軍勢已用盡、敵軍來襲），原本只看得到最後一句。
     * 規則與大廳版 ToastMessage 共用 ToastQueue：前一句已顯示 1.5 秒且沒人排隊時才直接取代，保留點擊的即時回饋。
     */
    private _queue = new ToastQueue<QueuedToast>();

    protected onDestroy(): void {
        if (this._hideTween) {
            this._hideTween.stop();
            this._hideTween = null;
        }
        this.unmount();
        this._isMounted = false;
    }

    public async show(options: ToastOptions): Promise<void>;
    public async show(message: string, duration?: number, options?: LegacyToastOptions): Promise<void>;
    public async show(
        optionsOrMessage: ToastOptions | string,
        duration = this.defaultDuration,
        legacyOptions?: LegacyToastOptions,
    ): Promise<void> {
        const options: ToastOptions = typeof optionsOrMessage === 'string'
            ? {
                text: optionsOrMessage,
                duration: legacyOptions?.duration ?? duration,
            }
            : optionsOrMessage;
        const toast: QueuedToast = {
            message: options.text,
            duration: options.duration ?? this.defaultDuration,
            color: typeof optionsOrMessage === 'string' ? legacyOptions?.color : undefined,
        };

        // 上一句的淡出被外力中斷（節點被關掉）時不會走到播下一句，這裡清掉殘留的排隊，免得之後的提示全卡住
        if (!this._hideTween && !this._presenting) this._queue.clear();
        if (this._queue.offer(toast, Date.now() / 1000)) await this._present(toast);
    }

    /** 正在等版面掛載或正在播的期間為 true */
    private _presenting = false;

    private async _present(toast: QueuedToast): Promise<void> {
        this._presenting = true;
        if (!this._isMounted) {
            await this.mount('toast-message-screen');
            this._isMounted = true;
        }

        if (this._messageLabel) {
            this._messageLabel.string = toast.message;
            if (toast.color) this._messageLabel.color = toast.color;
        }

        this.node.active = true;
        const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);

        if (this._hideTween) {
            this._hideTween.stop();
            this._hideTween = null;
        }

        opacity.opacity = 0;

        this._hideTween = tween(opacity)
            .to(0.15, { opacity: 255 })
            .delay(Math.max(0.5, toast.duration - 0.3))
            .to(0.3, { opacity: 0 })
            .call(() => {
                this._hideTween = null;
                const next = this._queue.next(Date.now() / 1000);
                if (next) {
                    void this._present(next);
                    return;
                }
                this._presenting = false;
                this.node.active = false;
            })
            .start();
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._binder = binder;
        this._messageLabel = binder.getLabel('Message');
    }
}
