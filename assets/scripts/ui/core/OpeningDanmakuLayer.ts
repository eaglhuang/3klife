// @spec-source → 開場重新包裝規格書（方案 B：AI 武將搶先連線，doc_spec_1346）§4 彈幕層；PROG-2-10149
/**
 * OpeningDanmakuLayer — 把 OpeningDanmakuController 的輸出套到畫面版面的彈幕槽位（cc 層）。
 *
 * 只重用版面檔預先放好的 danmakuSlot0～5 節點，不建立新節點（物件池）：
 * 新彈幕進槽時重播彈出動畫（淡入＋縮放），被玩家點到的槽放大，點擊事件只綁一次。
 * 開場期間由宿主每個 tick 呼叫 tick(deltaMs)；整層可隨時 stop()，節點收起，不留殘影。
 *
 * Unity 對照：像一個 Presenter，Controller 是資料，這裡是把資料寫到固定的 UI Pool 物件上。
 */
import { Node, NodeEventType, tween, Tween, UIOpacity, Vec3 } from 'cc';
import type { DanmakuCue } from '../../core/systems/OpeningDanmaku';
import { applyFlowView } from './NurtureFlowViewApplier';
import { OpeningDanmakuController } from './OpeningDanmakuController';
import type { UITemplateBinder } from './UITemplateBinder';

/** 彈出動畫時間（秒） */
const POP_SEC = 0.28;
/** 被點選後放大倍率 */
const PINNED_SCALE = 1.25;

export class OpeningDanmakuLayer {
    private _controller: OpeningDanmakuController | null = null;
    private readonly _seenSerial: number[] = [];
    private readonly _bound = new WeakSet<Node>();

    constructor(private readonly _binder: UITemplateBinder, private readonly _slotCount: number) {
        for (let i = 0; i < _slotCount; i++) this._seenSerial.push(0);
    }

    public get running(): boolean { return this._controller !== null; }
    /** 已經放出過的彈幕句數（驗收用：確認彈幕真的出現過） */
    public spawnedCount = 0;

    /** 開始播一條彈幕軌；已在播時先收掉舊的。 */
    public start(cues: readonly DanmakuCue[]): void {
        this.stop();
        this._controller = new OpeningDanmakuController(cues, this._slotCount);
        this._seenSerial.fill(0);
        this._bindTouches();
        this.refresh();
    }

    /** 收掉全部彈幕與軌道。 */
    public stop(): void {
        if (!this._controller) return;
        this._controller.clear();
        this.refresh();
        this._controller = null;
    }

    public tick(deltaMs: number): void {
        const controller = this._controller;
        if (!controller) return;
        const born = controller.tick(deltaMs);
        // 時間走過後槽位會自己退場，所以每個 tick 都要重套一次（只有六個槽，成本很小）
        this.refresh();
        if (born > 0) this.spawnedCount += born;
        if (controller.finished) this._controller = null;
    }

    private refresh(): void {
        const controller = this._controller;
        if (!controller) {
            // 收掉：全部槽位關閉
            const actives: Record<string, boolean> = {};
            const texts: Record<string, string> = {};
            for (let i = 0; i < this._slotCount; i++) { actives[`danmakuSlot${i}`] = false; texts[`danmakuText${i}`] = ''; }
            applyFlowView(this._binder, { texts, actives, enabled: {} });
            return;
        }
        applyFlowView(this._binder, controller.getFlowView());
        for (let i = 0; i < this._slotCount; i++) {
            const state = controller.slotState(i);
            const node = this._binder.getNode(`danmakuSlot${i}`);
            if (!node || !state.active) continue;
            if (state.serial !== this._seenSerial[i]) {
                this._seenSerial[i] = state.serial;
                this._pop(node);
            } else if (state.pinned) {
                node.setScale(PINNED_SCALE, PINNED_SCALE, 1);
            }
        }
    }

    private _pop(node: Node): void {
        const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        Tween.stopAllByTarget(node);
        Tween.stopAllByTarget(opacity);
        node.setScale(0.8, 0.8, 1);
        opacity.opacity = 0;
        tween(node).to(POP_SEC, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
        tween(opacity).to(POP_SEC, { opacity: 255 }).start();
    }

    private _bindTouches(): void {
        for (let i = 0; i < this._slotCount; i++) {
            const node = this._binder.getNode(`danmakuSlot${i}`);
            if (!node || this._bound.has(node)) continue;
            this._bound.add(node);
            node.on(NodeEventType.TOUCH_END, () => {
                if (this._controller?.pin(i)) this.refresh();
            });
        }
    }
}
