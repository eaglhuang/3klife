// @spec-source → 見 docs/cross-reference-index.md
import { _decorator, Component, Node, Sprite, Color, tween, UIOpacity, Tween, Vec3 } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { EVENT_NETWORK_OFFLINE, EVENT_NETWORK_ONLINE } from '../../core/systems/NetworkService';
import { EVENT_SYNCING, EVENT_SYNC_COMPLETE, EVENT_OFFLINE_REMINDER } from '../../core/systems/SyncManager';
import { networkIndicatorView, NetworkIndicatorEvent } from '../core/NetworkIndicatorState';

const { ccclass, requireComponent } = _decorator;

/**
 * 網路狀態指示器 (視覺化元件)
 * 掛載於包含 UI_2D 的節點，自帶 Sprite 用於顯示斷線或同步狀態。
 * 支援漸入漸隱效果與轉圈圈動畫，不打斷玩家在單機模式下的沉浸感。
 * 各事件的外觀見 NetworkIndicatorState（PROG-2-1881）。
 */
@ccclass('NetworkStatusIndicator')
// 兩個需求必須寫成陣列；分開寫兩個 @requireComponent 後者會蓋掉前者，UIOpacity 不會自動補上（PROG-2-1881）
@requireComponent([Sprite, UIOpacity])
export class NetworkStatusIndicator extends Component {
    private sprite: Sprite | null = null;
    private uiOpacity: UIOpacity | null = null;
    private spinTween: Tween<Node> | null = null;
    /** 固定參照，才能在新事件進來時取消上一次排定的自動淡出 */
    private readonly autoHide = (): void => this.hideIcon();

    protected onLoad(): void {
        this.sprite = this.getComponent(Sprite);
        this.uiOpacity = this.getComponent(UIOpacity);

        // 預設為全透明隱藏狀態，平時不干擾畫面
        if (this.uiOpacity) this.uiOpacity.opacity = 0;
    }

    protected start(): void {
        const ev = services().event;
        // 使用 EventSystem 的 onBind 來將監聽器的生命週期綁死在這個 Component 上
        ev.onBind(EVENT_NETWORK_OFFLINE, this.onOffline, this);
        ev.onBind(EVENT_NETWORK_ONLINE, this.onOnline, this);
        ev.onBind(EVENT_SYNCING, this.onSyncing, this);
        ev.onBind(EVENT_SYNC_COMPLETE, this.onSyncComplete, this);
        ev.onBind(EVENT_OFFLINE_REMINDER, this.onOfflineReminder, this);

        // 若 UI 啟動瞬間剛好是沒網路的狀態，補償觸發一次 UI
        if (!services().network.isOnline) {
            this.onOffline();
        }
    }

    private onOffline(): void {
        this.apply('offline');
    }

    private onOnline(): void {
        this.apply('online');
    }

    private onSyncing(): void {
        this.apply('syncing');
    }

    private onSyncComplete(): void {
        this.apply('sync-complete');
    }

    private onOfflineReminder(payload: { message: string }): void {
        // 當收到週期性提醒時，閃爍一下圖示並發送 Toast
        this.apply('reminder');
        services().event.emit('SHOW_TOAST', { message: payload.message, duration: 3.0 });
    }

    /**
     * 套用事件外觀。任何新事件都先取消上一次排定的自動淡出：
     * 例如恢復連線後 1 秒內開始同步或再次斷線，不可把黃燈／紅燈收掉。
     */
    private apply(event: NetworkIndicatorEvent): void {
        const view = networkIndicatorView(event);
        this.unschedule(this.autoHide);
        if (view.color && this.sprite) {
            const [r, g, b] = view.color;
            this.sprite.color = new Color(r, g, b, 255);
        }
        if (view.spin === true) this.startSpin();
        else if (view.spin === false) this.stopSpin();
        if (view.visible === true) this.showIcon();
        if (view.pulse) this.pulse();
        if (view.hideAfterSec !== null) this.scheduleOnce(this.autoHide, view.hideAfterSec);
    }

    /* 以下為動畫效果副程式 */

    private pulse(): void {
        tween(this.node)
            .to(0.1, { scale: new Vec3(1.2, 1.2, 1.2) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .to(0.1, { scale: new Vec3(1.2, 1.2, 1.2) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /** 先停掉進行中的淡入／淡出，避免中途來的新狀態被忽略、圖示卡在半透明 */
    private fadeTo(opacity: number, duration: number): void {
        if (!this.uiOpacity) return;
        Tween.stopAllByTarget(this.uiOpacity);
        if (this.uiOpacity.opacity === opacity) return;
        tween(this.uiOpacity).to(duration, { opacity }).start();
    }

    private showIcon(): void {
        this.fadeTo(255, 0.3);
    }

    private hideIcon(): void {
        this.fadeTo(0, 0.5);
    }

    private startSpin(): void {
        this.stopSpin();
        this.spinTween = tween(this.node)
            .by(1.0, { angle: -360 })
            .repeatForever()
            .start();
    }

    private stopSpin(): void {
        if (this.spinTween) {
            this.spinTween.stop();
            this.spinTween = null;
            this.node.angle = 0; // 重置旋轉角度
        }
    }
}
