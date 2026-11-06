// @spec-source → 主戰場UI規格書.md §4.5 敵方思考中（doc_ui_0001，PROG-2-1891）
/**
 * EnemyThinkingComposite — 敵方回合「敵軍行動中…」細帶提示
 *
 * 以 `enemy-thinking-screen` 三層 spec 建構；setVisible(true) 後透明度呼吸、句尾點數循環，
 * setVisible(false) 停止動畫並隱藏。不擋點擊（敵方回合本來就不能操作）。
 *
 * Unity 對照：Overlay Canvas 上的 Loading 指示器，用 DOTween 做 CanvasGroup alpha 往返。
 */
import { _decorator, Label, Tween, tween, UIOpacity } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { ENEMY_THINKING_BREATH, enemyThinkingText } from '../../core/systems/EnemyThinkingView';

const { ccclass } = _decorator;

@ccclass('EnemyThinkingComposite')
export class EnemyThinkingComposite extends CompositePanel {
    private _isMounted = false;
    private _visible = false;
    private _label: Label | null = null;
    private _tween: Tween<UIOpacity> | null = null;
    private _elapsedSec = 0;

    protected onDestroy(): void {
        this._stop();
        this.unmount();
        this._isMounted = false;
    }

    public async setVisible(visible: boolean): Promise<void> {
        this._visible = visible;
        if (!visible) {
            this._stop();
            this.node.active = false;
            return;
        }
        if (!this._isMounted) {
            await this.mount('enemy-thinking-screen');
            this._isMounted = true;
            // 掛載等待期間可能已收到隱藏要求
            if (!this._visible) {
                this.node.active = false;
                return;
            }
        }
        if (this.node.parent) this.node.setSiblingIndex(this.node.parent.children.length - 1);
        this.node.active = true;
        this._start();
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._label = binder.getLabel('ThinkingText');
    }

    protected update(dt: number): void {
        if (!this._visible || !this._label) return;
        this._elapsedSec += dt;
        const text = enemyThinkingText(this._elapsedSec);
        if (this._label.string !== text) this._label.string = text;
    }

    private _start(): void {
        this._stop();
        this._elapsedSec = 0;
        if (this._label) this._label.string = enemyThinkingText(0);
        const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
        const { minOpacity, maxOpacity, halfPeriodSec } = ENEMY_THINKING_BREATH;
        opacity.opacity = maxOpacity;
        this._tween = tween(opacity)
            .to(halfPeriodSec, { opacity: minOpacity })
            .to(halfPeriodSec, { opacity: maxOpacity })
            .union()
            .repeatForever()
            .start();
    }

    private _stop(): void {
        this._tween?.stop();
        this._tween = null;
    }
}
