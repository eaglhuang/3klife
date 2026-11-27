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
import { services } from '../../core/managers/ServiceLoader';
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
/** 智謀膠囊：深漆底／金色填充／銅邊（規格 §3.1，與 battle-button-theme 的 secondary 同色系） */
const CAPSULE_BG = new Color(20, 15, 11, 235);
const CAPSULE_FILL = new Color(214, 168, 62, 255);
const CAPSULE_BORDER = new Color(138, 106, 47, 255);
const CAPSULE_PAD = 3;

@ccclass('StrategistHudComposite')
export class StrategistHudComposite extends CompositePanel implements IStrategistHudLike {
    private _templateBinder: UITemplateBinder | null = null;
    private _view: StrategistHudView | null = null;
    private _mounting = false;
    private _unsubLocale: (() => void) | null = null;
    private _subscribedI18n: unknown = null;

    public async ensureMounted(): Promise<void> {
        if (this._mounting) return;
        this._mounting = true;
        await this.mount(SCREEN_ID);
    }

    public setView(view: StrategistHudView): void {
        this._view = view;
        this._ensureLocaleSubscription();
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

    protected onDestroy(): void {
        this._unsubLocale?.();
        this._unsubLocale = null;
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._templateBinder = binder;
        this._ensureLocaleSubscription();
        this._applyView();
    }

    /**
     * 膠囊左側名稱走 i18n；切語系要跟著重寫（版型 textKey 只在建置當下套一次）。
     * 戰場入口可能在服務初始化前就掛好本面板，那時訂閱的是舊的 i18n 實例，所以以「目前的 i18n 實例」為準補訂閱。
     */
    private _ensureLocaleSubscription(): void {
        const i18n = services().i18n;
        if (this._unsubLocale && this._subscribedI18n === i18n) return;
        this._unsubLocale?.();
        this._subscribedI18n = i18n;
        this._unsubLocale = i18n.onLocaleChanged(() => this._applyView());
    }

    private _applyView(): void {
        const binder = this._templateBinder;
        const view = this._view;
        if (!binder || !view) return;
        // 名稱「智謀」走版型的 textKey（跟語系），這裡只寫數值
        binder.setTexts({ summaryText: view.summaryText, wisdomText: services().i18n.t('battle.hud.wisdom'), wisdomValue: view.wisdomValueText });
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
        this._drawCapsule(fill.parent, trackSize, view.wisdomRatio);
    }

    /**
     * 360×36 智謀膠囊：深漆底＋銅邊，內層金色填充隨比例伸縮。
     * 軌道節點本身是透明貼圖（Graphics 不能與 Sprite 同節點），所以畫在子節點 WisdomCapsule（最底層）。
     */
    private _drawCapsule(track: Node | null | undefined, size: UITransform, ratio: number): void {
        if (!track) return;
        let node = track.getChildByName('WisdomCapsule');
        if (!node) {
            node = new Node('WisdomCapsule');
            node.layer = track.layer;
            node.addComponent(UITransform);
            node.parent = track;
            node.setSiblingIndex(0);
        }
        node.getComponent(UITransform)?.setContentSize(size.width, size.height);
        const g = node.getComponent(Graphics) ?? node.addComponent(Graphics);
        const w = size.width;
        const h = size.height;
        const x = -w * size.anchorX;
        const y = -h * size.anchorY;
        g.clear();
        g.fillColor = CAPSULE_BG;
        g.roundRect(x, y, w, h, h / 2);
        g.fill();
        const innerW = Math.max(0, (w - CAPSULE_PAD * 2) * Math.max(0, Math.min(1, ratio)));
        const innerH = h - CAPSULE_PAD * 2;
        if (innerW >= innerH) {
            g.fillColor = CAPSULE_FILL;
            g.roundRect(x + CAPSULE_PAD, y + CAPSULE_PAD, innerW, innerH, innerH / 2);
            g.fill();
        } else if (innerW > 0) {
            g.fillColor = CAPSULE_FILL;
            g.circle(x + CAPSULE_PAD + innerH / 2, y + h / 2, Math.min(innerW, innerH) / 2);
            g.fill();
        }
        g.lineWidth = 2;
        g.strokeColor = CAPSULE_BORDER;
        g.roundRect(x, y, w, h, h / 2);
        g.stroke();
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
