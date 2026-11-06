// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；回合開始提示改用橫幅（使用者 2026-11-06 裁決，PROG-2-1888）
/**
 * TurnBannerComposite — 戰場回合開始橫幅（橫貫畫面中央的色帶＋大字）
 *
 * 以 `turn-banner-screen` 三層 spec 建構；show() 淡入、停留、淡出後自動隱藏。
 * 與 Toast 不同：橫幅不排隊，新的一則直接蓋掉舊的。
 *
 * Unity 對照：一個掛在 Overlay Canvas 的 Panel，用 DOTween 做 CanvasGroup alpha 淡入淡出。
 */
import { _decorator, Color, Label, Tween, tween, UIOpacity } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';

const { ccclass } = _decorator;

const FADE_IN_SEC = 0.2;
const FADE_OUT_SEC = 0.3;

@ccclass('TurnBannerComposite')
export class TurnBannerComposite extends CompositePanel {
    private _isMounted = false;
    private _label: Label | null = null;
    private _tween: Tween<UIOpacity> | null = null;

    protected onDestroy(): void {
        this._tween?.stop();
        this._tween = null;
        this.unmount();
        this._isMounted = false;
    }

    public async show(text: string, color: Color, durationSec: number): Promise<void> {
        if (!this._isMounted) {
            await this.mount('turn-banner-screen');
            this._isMounted = true;
        }
        if (this._label) {
            this._label.string = text;
            this._label.color = color;
        }

        this.node.active = true;
        const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
        this._tween?.stop();
        opacity.opacity = 0;
        this._tween = tween(opacity)
            .to(FADE_IN_SEC, { opacity: 255 })
            .delay(Math.max(0.3, durationSec - FADE_IN_SEC - FADE_OUT_SEC))
            .to(FADE_OUT_SEC, { opacity: 0 })
            .call(() => {
                this._tween = null;
                this.node.active = false;
            })
            .start();
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._label = binder.getLabel('BannerText');
    }
}
