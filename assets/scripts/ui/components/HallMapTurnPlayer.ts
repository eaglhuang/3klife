// @spec-source → UI-2-0123／UI-2-0126（幕府大廳勢力圖：平時縮小、事件聚焦、開 UI 時關閉）
/**
 * HallMapTurnPlayer — 大廳勢力圖的播放元件（薄殼）。
 *
 * 只負責把 HallMapStagePose 算好的姿態 tween 到節點上；要播哪幾站、停多久、放多大，
 * 全部由 planHallMapTurn 與 hall-map-layout.json 決定，這裡不做任何判斷。
 *
 * 節點結構（由大廳 screen 建好後指定）：
 *   viewport（UITransform＋Mask，掛在畫布下）→ content（地圖圖層，中心錨點）
 *   ping（事件標記，掛在畫布下）→ pingGlyph（字章 Label）、pingLabel（標籤 Label）
 *
 * Unity 對照：像一個只播 Timeline 的 PlayableDirector，劇本（steps）由外部系統產生。
 */
import { _decorator, Component, Label, Node, Tween, tween, UITransform, Vec3 } from 'cc';
import type { HallMapLayout, HallMapMode, HallMapTurnStep } from '../../core/systems/HallMapFocusPlanner';
import { hallMapStagePose, HallMapCanvasSize, HallMapStagePose } from '../../core/systems/HallMapStagePose';

const { ccclass, property } = _decorator;

@ccclass('HallMapTurnPlayer')
export class HallMapTurnPlayer extends Component {
    @property(Node) viewport: Node | null = null;
    @property(Node) content: Node | null = null;
    @property(Node) ping: Node | null = null;
    @property(Label) pingGlyph: Label | null = null;
    @property(Label) pingLabel: Label | null = null;

    private _layout: HallMapLayout | null = null;
    private _canvas: HallMapCanvasSize = { width: 1920, height: 1080 };
    private _timers: Array<() => void> = [];

    public configure(layout: HallMapLayout, canvas: HallMapCanvasSize): void {
        this._layout = layout;
        this._canvas = canvas;
    }

    /** 直接切換模式（例如開其他 UI 時 hidden、關掉後 mini），會中斷正在播的序列。 */
    public setMode(mode: HallMapMode, instant = false): void {
        this._cancelTimers();
        this._apply(mode, null, instant);
    }

    /** 播放換季聚焦序列；每一站在 startSec 時切過去。 */
    public playTurn(steps: readonly HallMapTurnStep[]): void {
        this._cancelTimers();
        for (const step of steps) {
            const run = () => {
                this._apply(step.mode, step, false);
            };
            this.scheduleOnce(run, step.startSec);
            this._timers.push(run);
        }
    }

    protected onDestroy(): void {
        this._cancelTimers();
    }

    private _cancelTimers(): void {
        for (const run of this._timers) this.unschedule(run);
        this._timers = [];
    }

    private _apply(mode: HallMapMode, step: HallMapTurnStep | null, instant: boolean): void {
        if (!this._layout) return;
        const pose = hallMapStagePose(mode, step?.focus ?? null, this._layout, this._canvas);
        const sec = instant ? 0 : this._layout.transitionSec;
        this._tweenRect(this.viewport, pose.viewport, sec);
        this._tweenRect(this.content, pose.content, sec);
        if (this.viewport) this.viewport.active = pose.viewport.visible;
        this._applyPing(pose, step);
    }

    private _tweenRect(node: Node | null, r: { x: number; y: number; width: number; height: number }, sec: number): void {
        if (!node) return;
        const ui = node.getComponent(UITransform);
        Tween.stopAllByTarget(node);
        if (sec <= 0) {
            node.setPosition(r.x, r.y, 0);
            ui?.setContentSize(r.width, r.height);
            return;
        }
        tween(node).to(sec, { position: new Vec3(r.x, r.y, 0) }, { easing: 'sineInOut' }).start();
        if (ui) {
            Tween.stopAllByTarget(ui);
            tween(ui).to(sec, { width: r.width, height: r.height }, { easing: 'sineInOut' }).start();
        }
    }

    private _applyPing(pose: HallMapStagePose, step: HallMapTurnStep | null): void {
        if (!this.ping) return;
        this.ping.active = pose.ping.visible;
        if (!pose.ping.visible) return;
        this.ping.setPosition(pose.ping.x, pose.ping.y, 0);
        if (this.pingGlyph) this.pingGlyph.string = step?.event?.glyph ?? '';
        if (this.pingLabel) {
            this.pingLabel.string = step?.event?.label ?? '';
            // 標籤放在標記左邊或右邊，避免超出地圖。
            const x = Math.abs(this.pingLabel.node.position.x);
            this.pingLabel.node.setPosition(pose.ping.labelSide === 'left' ? -x : x, this.pingLabel.node.position.y, 0);
        }
        // 事件章落下：從上方縮小落入，再回原位。
        const glyphNode = this.pingGlyph?.node;
        if (glyphNode) {
            Tween.stopAllByTarget(glyphNode);
            const base = glyphNode.position.clone();
            glyphNode.setPosition(base.x, base.y + 60, 0);
            glyphNode.setScale(0.3, 0.3, 1);
            tween(glyphNode)
                .to(0.5, { position: base, scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        }
    }
}
