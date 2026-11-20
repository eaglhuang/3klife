// @spec-source → 戰場主將體力條顯示與疲勞衰竭視覺反饋規格書.md (doc_spec_0397) §2-4、武將壽命系統.md (doc_spec_0018)
import { Color, Graphics, Label, Node, Tween, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { vitalityDeltaText, vitalityHudBarView } from '../../core/systems/VitalityBarView';

/**
 * GeneralVitalityStrip — 武將名牌下方的精力細條（PROG-2-9432）
 *
 * 新版 HUD 頂欄沒有主將血條，主將血量顯示在頭上名牌（「將 1692」）；
 * 依規格 §2「血條正下方細條」，精力條就掛在名牌血量列正下方，雙方各一條。
 *
 * - 三段色同名牌旁能量環（>50% 紫、10%~50% 琥珀、<10% 灰），歸零底板灰化；百分比文字由能量環顯示
 * - 精力下降：填色立刻縮短並閃白、淡色殘影停一下再追上、條身縱向脈動、條右端外側跳「-N」上浮淡出
 * - 精力回升：填色長回、跳綠色「+N」
 *
 * 只建一次節點並重用；用 Graphics 重畫，不每次新建節點（手機記憶體優先）。
 *
 * Unity 對照：血條下方一條 Image(fillAmount) + 延遲追趕的 damage trail + 浮動數字。
 */

const TRACK_COLOR = new Color(0, 0, 0, 170);
const TRACK_GRAYED_COLOR = new Color(90, 90, 90, 220);
const GHOST_COLOR = new Color(255, 240, 210, 235);
const FLASH_COLOR = new Color(255, 255, 255, 255);
const DROP_TEXT_COLOR = new Color(255, 120, 90, 255);
const GAIN_TEXT_COLOR = new Color(140, 235, 140, 255);
const GHOST_HOLD_SEC = 0.25;
const GHOST_SHRINK_SEC = 0.45;
const FLASH_SEC = 0.12;
const GROW_SEC = 0.35;
const DELTA_RISE_PX = 30;
const DELTA_SEC = 0.9;
const DELTA_FONT_SIZE = 24;
/** 跳字中心距細條右端的距離 */
const DELTA_X_OUTSIDE = 44;

export interface GeneralVitalityStripOptions {
    /** 條中心在父節點的 y */
    y: number;
    width: number;
    height: number;
}

export class GeneralVitalityStrip {
    private readonly _root: Node;
    private readonly _g: Graphics;
    private readonly _delta: Label;
    private readonly _deltaOpacity: UIOpacity;
    private readonly _w: number;
    private readonly _h: number;
    /** 動畫中的繪製狀態（比例 0~1） */
    private readonly _anim = { fill: 0, ghost: 0 };
    private _current: number | null = null;
    private _color = new Color(180, 120, 255, 255);
    private _flash = false;
    private _grayed = false;

    constructor(parent: Node, opts: GeneralVitalityStripOptions) {
        this._w = opts.width;
        this._h = opts.height;
        this._root = new Node('VitalityStrip');
        this._root.layer = parent.layer;
        parent.addChild(this._root);
        this._root.setPosition(0, opts.y, 0);
        this._root.addComponent(UITransform).setContentSize(opts.width, opts.height);
        this._g = this._root.addComponent(Graphics);

        const deltaNode = new Node('VitalityDelta');
        deltaNode.layer = parent.layer;
        parent.addChild(deltaNode);
        deltaNode.addComponent(UITransform).setContentSize(80, DELTA_FONT_SIZE + 6);
        this._delta = deltaNode.addComponent(Label);
        this._delta.fontSize = DELTA_FONT_SIZE;
        this._delta.lineHeight = DELTA_FONT_SIZE + 4;
        this._delta.isBold = true;
        this._delta.horizontalAlign = Label.HorizontalAlign.CENTER;
        this._delta.enableOutline = true;
        this._delta.outlineColor = new Color(0, 0, 0, 255);
        this._delta.outlineWidth = 3;
        this._deltaOpacity = deltaNode.addComponent(UIOpacity);
        deltaNode.active = false;
    }

    /** 設定精力；與上次不同時演出變化（第一次設定只畫不演） */
    public set(vitality: number, maxVitality: number): void {
        const before = this._current;
        if (before === vitality) return;
        this._current = vitality;
        const view = vitalityHudBarView(vitality, maxVitality);
        const [r, g, b] = view.color;
        this._color = new Color(r, g, b, 255);
        this._grayed = view.grayed;
        const text = before === null ? '' : vitalityDeltaText(before, vitality);
        Tween.stopAllByTarget(this._anim);
        if (!text) {
            this._anim.fill = view.ratio;
            this._anim.ghost = view.ratio;
            this._flash = false;
            this._draw();
            return;
        }
        const redraw = { onUpdate: () => this._draw() };
        if (vitality < before!) {
            this._anim.ghost = Math.max(this._anim.ghost, this._anim.fill);
            this._anim.fill = view.ratio;
            this._flash = true;
            this._draw();
            tween(this._anim)
                .delay(FLASH_SEC)
                .call(() => { this._flash = false; this._draw(); })
                .delay(Math.max(0, GHOST_HOLD_SEC - FLASH_SEC))
                .to(GHOST_SHRINK_SEC, { ghost: view.ratio }, { easing: 'quadIn', ...redraw })
                .start();
            this._pulse();
            this._popDelta(text, DROP_TEXT_COLOR);
        } else {
            this._anim.ghost = 0;
            this._flash = false;
            tween(this._anim)
                .to(GROW_SEC, { fill: view.ratio }, { easing: 'quadOut', ...redraw })
                .call(() => { this._anim.ghost = this._anim.fill; this._draw(); })
                .start();
            this._popDelta(text, GAIN_TEXT_COLOR);
        }
    }

    /** QA／測試讀取目前繪製狀態 */
    public debugState(): { fill: number; ghost: number; flash: boolean; deltaShown: boolean; delta: string; color: number[] } {
        return {
            fill: this._anim.fill,
            ghost: this._anim.ghost,
            flash: this._flash,
            deltaShown: this._delta.node.active,
            delta: this._delta.string,
            color: [this._color.r, this._color.g, this._color.b],
        };
    }

    private _draw(): void {
        const g = this._g;
        const x0 = -this._w / 2;
        const y0 = -this._h / 2;
        g.clear();
        g.fillColor = this._grayed ? TRACK_GRAYED_COLOR : TRACK_COLOR;
        g.rect(x0 - 1, y0 - 1, this._w + 2, this._h + 2);
        g.fill();
        if (this._anim.ghost > this._anim.fill) {
            g.fillColor = GHOST_COLOR;
            g.rect(x0, y0, this._w * this._anim.ghost, this._h);
            g.fill();
        }
        if (this._anim.fill > 0) {
            g.fillColor = this._flash ? FLASH_COLOR : this._color;
            g.rect(x0, y0, this._w * this._anim.fill, this._h);
            g.fill();
        }
    }

    private _pulse(): void {
        Tween.stopAllByTarget(this._root);
        this._root.setScale(1, 1.8, 1);
        tween(this._root).to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' }).start();
    }

    private _popDelta(text: string, color: Color): void {
        const node = this._delta.node;
        Tween.stopAllByTarget(node);
        Tween.stopAllByTarget(this._deltaOpacity);
        this._delta.string = text;
        this._delta.color = color;
        // 跳字放在細條右端外側，不壓到名牌上的血量數字
        node.setPosition(this._w / 2 + DELTA_X_OUTSIDE, this._root.position.y, 0);
        node.active = true;
        this._deltaOpacity.opacity = 255;
        tween(node).by(DELTA_SEC, { position: new Vec3(0, DELTA_RISE_PX, 0) }, { easing: 'quadOut' }).start();
        tween(this._deltaOpacity)
            .delay(DELTA_SEC * 0.5)
            .to(DELTA_SEC * 0.5, { opacity: 0 })
            .call(() => { node.active = false; })
            .start();
    }
}
