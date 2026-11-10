// @spec-source → 戰法場景規格書.md (doc_spec_0039) §E 垂直能量條；關卡設計系統.md (doc_spec_0049) §D-4 軍師 HUD；PROG-2-1851
/**
 * StrategistHudComposite — 戰場的智謀能量條與軍師摘要條
 *
 * 畫面規格：ui-spec/screens/strategist-hud-screen.json。
 * 顯示內容由 StrategistHudView 算好，這裡只負責 mount、套內容與滿格粒子；沒有按鈕，不擋戰場點擊。
 *
 * Unity 對照：常駐 HUD 的 Controller，資料由 Presenter 算好，這裡只 label.text = 與調 RectTransform 高度。
 */
import { _decorator, Color, Graphics, Node, tween, UIOpacity, UITransform, Label, v3, Vec3, Widget } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import type { UITemplateBinder } from '../core/UITemplateBinder';
import type { StrategistHudView } from '../../battle/shared/StrategistHudView';
import type { IStrategistHudLike } from '../../shared/interfaces/IBattleUIComponents';

const { ccclass } = _decorator;

const SCREEN_ID = 'strategist-hud-screen';
const SPARK_COUNT = 16;
const SPARK_RADIUS = 5;
const SPARK_DISTANCE = 90;
const SPARK_DURATION = 0.75;
/** 與 ui-design-tokens 的 accentGoldCta 同色 */
const SPARK_COLOR = new Color(255, 215, 0, 255);

@ccclass('StrategistHudComposite')
export class StrategistHudComposite extends CompositePanel implements IStrategistHudLike {
    private _templateBinder: UITemplateBinder | null = null;
    private _view: StrategistHudView | null = null;
    private _mounting = false;

    public async ensureMounted(): Promise<void> {
        if (this._mounting) return;
        this._mounting = true;
        await this.mount(SCREEN_ID);
    }

    public setView(view: StrategistHudView): void {
        this._view = view;
        this._applyView();
    }

    /** 智謀滿格：從能量條頂端往外噴金色粒子（規格 §E） */
    public playSurge(): void {
        const track = this._templateBinder?.getNode('wisdomTrack');
        const trackSize = track?.getComponent(UITransform);
        if (!track || !trackSize) return;
        const origin = v3(0, trackSize.height * (1 - trackSize.anchorY), 0);
        for (let i = 0; i < SPARK_COUNT; i += 1) {
            this._spawnSpark(track, origin, (Math.PI * 2 * i) / SPARK_COUNT);
        }
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._templateBinder = binder;
        this._applyView();
    }

    private _applyView(): void {
        const binder = this._templateBinder;
        const view = this._view;
        if (!binder || !view) return;
        binder.setTexts({ summaryText: view.summaryText, wisdomText: view.wisdomText });
        binder.setActives({ summaryBand: view.summaryText.length > 0 });
        const summary = binder.getLabel('summaryText');
        const content = binder.getNode('summaryContent')?.getComponent(UITransform);
        if (summary && content) {
            summary.overflow = Label.Overflow.RESIZE_HEIGHT;
            summary.enableWrapText = true;
            summary.node.getComponent(UITransform)?.setAnchorPoint(0.5,1);
            summary.node.setPosition(0,0,0);
            summary.updateRenderData(true);
            content.setContentSize(content.width,Math.max(72,summary.node.getComponent(UITransform)?.height ?? 72));
        }
        const fill = binder.getNode('wisdomFill');
        const fillSize = fill?.getComponent(UITransform);
        const trackSize = fill?.parent?.getComponent(UITransform);
        if (!fill || !fillSize || !trackSize) return;
        fillSize.setContentSize(trackSize.width * view.wisdomRatio, trackSize.height);
        fill.getComponent(Widget)?.updateAlignment();
    }

    private _spawnSpark(parent: Node, origin: Vec3, angle: number): void {
        const spark = new Node('WisdomSpark');
        spark.layer = parent.layer;
        spark.parent = parent;
        spark.setPosition(origin);
        spark.addComponent(UITransform).setContentSize(SPARK_RADIUS * 2, SPARK_RADIUS * 2);
        const graphics = spark.addComponent(Graphics);
        graphics.fillColor = SPARK_COLOR;
        graphics.circle(0, 0, SPARK_RADIUS);
        graphics.fill();
        const opacity = spark.addComponent(UIOpacity);
        const target = v3(origin.x + Math.cos(angle) * SPARK_DISTANCE, origin.y + Math.sin(angle) * SPARK_DISTANCE, 0);
        tween(spark).to(SPARK_DURATION, { position: target }, { easing: 'quadOut' }).call(() => spark.destroy()).start();
        tween(opacity).to(SPARK_DURATION, { opacity: 0 }, { easing: 'quadIn' }).start();
    }
}
