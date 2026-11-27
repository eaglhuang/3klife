// @spec-source → 戰場右側 UI 重設計規格 §3.1 統一按鈕語彙；PROG-2-10133（B2）
/**
 * BattleButtonStyle — 戰場按鈕的統一外觀元件（四狀態、Tween、tint、縮字）
 *
 * 掛在任何一個戰場按鈕節點上，就會在它底下建出：
 *   Body（整顆按下時位移／禁用時降透明度）
 *     ├ BtnPlate  Graphics：外發光、下緣厚度、兩段漸層、內上緣高光、外框（顏色全走 BattleButtonTheme）
 *     ├ BtnIcon   Graphics：單色線稿圖示（BattleButtonIcons，顏色隨狀態變）
 *     └ 說明字    沿用版型原有 Label（adopt）或自建，Overflow.SHRINK 縮字
 * 四種狀態：一般／按下（下移 3px、陰影收掉、亮度 ×0.85）／禁用（去飽和＋降透明度，不吃點擊由呼叫端決定）／
 * 啟用中（金邊＋金色圖示＋外發光，給自動／委任／加速這類開關）。
 * 不另外出貼圖：只用 Graphics，手機記憶體零成本；B3 換正式美術時只需換這裡的繪製。
 *
 * Unity 對照：自訂 Selectable 的 ColorTint＋Animator 狀態機；主題＝ScriptableObject。
 */
import { _decorator, Color, Component, Graphics, JsonAsset, Label, Node, resources, tween, Tween, UIOpacity, UITransform, v3, Widget } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { BattleIconId, drawBattleIcon } from './BattleButtonIcons';
import {
    BattleButtonState,
    BattleButtonTheme,
    BattleButtonVariant,
    BattleButtonVisual,
    DEFAULT_BATTLE_BUTTON_THEME,
    mergeBattleButtonTheme,
    pickBattleButtonState,
    resolveBattleButtonVisual,
} from './BattleButtonTheme';

const { ccclass } = _decorator;

/** 主題資料檔（resources 相對路徑，不含副檔名）；沒有或格式不對就用內建預設 */
export const BATTLE_BUTTON_THEME_PATH = 'ui-spec/battle-button-theme';

export interface BattleButtonOptions {
    variant: BattleButtonVariant;
    /** 單色線稿圖示；不給就只有文字 */
    icon?: BattleIconId;
    /** top：圖示在上、說明在下（頂欄功能鈕）；left：圖示在左（結束回合）；corner：小圖示在左上角（計謀、出陣） */
    iconLayout?: 'top' | 'left' | 'corner';
    iconSize?: number;
    /** i18n key；語系切換時自動重寫文字。文字由外部動態組字時不要給 */
    captionKey?: string;
    /** 沿用版型已有的文字節點（會被搬進 Body 並改成縮字） */
    label?: Label | null;
    fontSize?: number;
    bold?: boolean;
    /** 可視底板相對觸控範圍的內縮（觸控範圍吃滿，可視底板較小） */
    insetX?: number;
    insetY?: number;
}

let sharedTheme: BattleButtonTheme = DEFAULT_BATTLE_BUTTON_THEME;
let themeRequest: Promise<void> | null = null;

/** 讀一次主題資料檔並套成共用主題；多顆按鈕共用同一次請求 */
function ensureThemeLoaded(): Promise<void> {
    if (themeRequest) return themeRequest;
    themeRequest = new Promise<void>((resolve) => {
        resources.load(BATTLE_BUTTON_THEME_PATH, JsonAsset, (err, asset) => {
            if (!err && asset) sharedTheme = mergeBattleButtonTheme(DEFAULT_BATTLE_BUTTON_THEME, asset.json);
            resolve();
        });
    });
    return themeRequest;
}

function rgba(c: readonly [number, number, number], a: number): Color {
    return new Color(c[0], c[1], c[2], a);
}

@ccclass('BattleButtonStyle')
export class BattleButtonStyle extends Component {
    private _opts: BattleButtonOptions = { variant: 'secondary' };
    private _body: Node | null = null;
    private _plate: Graphics | null = null;
    private _iconGfx: Graphics | null = null;
    private _label: Label | null = null;
    private _bodyOpacity: UIOpacity | null = null;
    private _flags = { disabled: false, pressed: false, active: false };
    private _unsubLocale: (() => void) | null = null;
    private _lastState: BattleButtonState | null = null;
    private _iconSizeResolved = 30;

    /** 在按鈕節點上掛外觀元件（重複呼叫只會更新選項） */
    public static attach(node: Node, opts: BattleButtonOptions): BattleButtonStyle {
        const style = node.getComponent(BattleButtonStyle) ?? node.addComponent(BattleButtonStyle);
        style.setup(opts);
        return style;
    }

    // ── 公開 API ─────────────────────────────────────────────

    /** 開關型：啟用中（金邊、金色圖示、外發光） */
    public setActive(active: boolean): void {
        if (this._flags.active === active) return;
        this._flags.active = active;
        this._refresh();
    }

    public isActive(): boolean { return this._flags.active; }

    /** 禁用外觀（去飽和＋降透明度）；是否真的擋點擊由呼叫端決定（計謀天氣禁用仍可點出說明 Toast） */
    public setDisabled(disabled: boolean): void {
        if (this._flags.disabled === disabled) return;
        this._flags.disabled = disabled;
        this._refresh();
    }

    public isDisabled(): boolean { return this._flags.disabled; }

    public setVariant(variant: BattleButtonVariant): void {
        if (this._opts.variant === variant) return;
        this._opts = { ...this._opts, variant };
        this._refresh(true);
    }

    /** 目前狀態（測試與除錯用） */
    public getState(): BattleButtonState { return pickBattleButtonState(this._flags); }

    /** 說明字 Label（沒有說明字時為 null） */
    public getLabel(): Label | null { return this._label; }

    // ── 生命週期 ─────────────────────────────────────────────

    protected onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
        this._unsubLocale?.();
        this._unsubLocale = null;
        if (this._body) Tween.stopAllByTarget(this._body);
    }

    // ── 建構 ─────────────────────────────────────────────────

    private setup(opts: BattleButtonOptions): void {
        this._opts = { ...opts };
        this._buildNodes();
        if (!this._unsubLocale) {
            this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
            this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
            this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
            this._unsubLocale = services().i18n.onLocaleChanged(() => { this._applyCaption(); this._layoutParts(); });
        }
        this._applyCaption();
        this._layoutParts();
        this._refresh(true);
        void ensureThemeLoaded().then(() => { if (this.isValid) this._refresh(true); });
    }

    private _newChild(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        n.parent = parent;
        n.addComponent(UITransform);
        return n;
    }

    private _buildNodes(): void {
        if (!this._body) {
            this._body = this._newChild('BtnBody', this.node);
            this._bodyOpacity = this._body.addComponent(UIOpacity);
            const plateNode = this._newChild('BtnPlate', this._body);
            this._plate = plateNode.addComponent(Graphics);
        }
        const body = this._body;
        // 圖示
        if (this._opts.icon && !this._iconGfx) {
            const iconNode = this._newChild('BtnIcon', body);
            this._iconGfx = iconNode.addComponent(Graphics);
        }
        // 說明字：沿用版型的 Label，或在有 captionKey 時自建
        const adopt = this._opts.label ?? null;
        if (adopt && adopt !== this._label) {
            this._label = adopt;
            adopt.node.setParent(body);
            const widget = adopt.node.getComponent(Widget);
            if (widget) widget.enabled = false;
        } else if (!this._label && this._opts.captionKey) {
            const node = this._newChild('BtnCaption', body);
            this._label = node.addComponent(Label);
            this._label.useSystemFont = true;
            const font = services().i18n.getFont('body');
            if (font) this._label.font = font;
        }
        if (this._label) {
            const label = this._label;
            label.overflow = Label.Overflow.SHRINK;
            label.enableWrapText = false;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.isBold = this._opts.bold === true;
            label.enableOutline = false;
        }
    }

    // ── 版面（可視底板、圖示、說明字位置）────────────────────

    private _geometry(): { px: number; py: number; pw: number; ph: number } {
        const ut = this.node.getComponent(UITransform)!;
        const w = ut.width, h = ut.height;
        const ix = this._opts.insetX ?? 0, iy = this._opts.insetY ?? 0;
        const thick = sharedTheme.thickness;
        return { px: -w / 2 + ix, py: -h / 2 + iy + thick, pw: w - ix * 2, ph: h - iy * 2 - thick };
    }

    private _layoutParts(): void {
        if (!this._body) return;
        const { px, py, pw, ph } = this._geometry();
        const cx = px + pw / 2, cy = py + ph / 2;
        const layout = this._opts.iconLayout ?? (this._opts.icon ? 'top' : undefined);
        const iconSize = this._opts.iconSize ?? (layout === 'corner' ? 16 : layout === 'left' ? 34 : 30);
        const fontSize = this._opts.fontSize ?? 22;
        let iconX = cx, iconY = cy;
        let capX = cx, capY = cy, capW = pw - 8, capH = Math.max(fontSize + 6, ph - 8);
        if (layout === 'top') {
            iconY = cy + ph * 0.2;
            capY = cy - ph * 0.27;
            capH = fontSize + 6;
        } else if (layout === 'left') {
            iconX = px + 12 + iconSize / 2;
            const textLeft = px + 12 + iconSize + 8;
            capX = (textLeft + px + pw - 8) / 2;
            capW = px + pw - 8 - textLeft;
        } else if (layout === 'corner') {
            iconX = px + 8 + iconSize / 2;
            iconY = py + ph - 6 - iconSize / 2;
            // 文字（計謀有兩行）略往下讓出左上角圖示
            capY = cy - 5;
        }
        if (this._iconGfx) this._iconGfx.node.setPosition(iconX, iconY, 0);
        this._iconSizeResolved = iconSize;
        if (this._label) {
            const lt = this._label.node.getComponent(UITransform)!;
            lt.setAnchorPoint(0.5, 0.5);
            lt.setContentSize(Math.max(8, capW), capH);
            this._label.node.setPosition(capX, capY, 0);
            this._label.fontSize = fontSize;
            this._label.lineHeight = Math.round(fontSize * 1.15);
        }
    }

    private _applyCaption(): void {
        const key = this._opts.captionKey;
        if (key && this._label) this._label.string = services().i18n.t(key);
    }

    // ── 狀態與繪製 ───────────────────────────────────────────

    private _onTouchStart(): void {
        this._flags.pressed = true;
        this._refresh();
    }

    private _onTouchEnd(): void {
        this._flags.pressed = false;
        this._refresh();
    }

    private _refresh(force = false): void {
        if (!this._plate || !this._body) return;
        const state = pickBattleButtonState(this._flags);
        if (!force && state === this._lastState) return;
        const previous = this._lastState;
        this._lastState = state;
        const visual = resolveBattleButtonVisual(sharedTheme, this._opts.variant, state);
        this._drawPlate(visual);
        this._drawIcon(visual);
        if (this._label) this._label.color = rgba(visual.text, 255);
        if (this._bodyOpacity) this._bodyOpacity.opacity = Math.round(visual.opacity * 255);
        this._moveBody(visual.bodyOffsetY, previous !== null);
    }

    private _moveBody(offsetY: number, animated: boolean): void {
        const body = this._body!;
        Tween.stopAllByTarget(body);
        if (!animated) { body.setPosition(0, offsetY, 0); return; }
        tween(body).to(sharedTheme.pressTweenSec, { position: v3(0, offsetY, 0) }).start();
    }

    private _drawPlate(v: BattleButtonVisual): void {
        const g = this._plate!;
        const th = sharedTheme;
        const { px, py, pw, ph } = this._geometry();
        const r = Math.min(th.radius, ph / 2, pw / 2);
        g.clear();
        // 啟用中外發光：由內而外三圈漸淡
        if (v.glow) {
            const step = th.glowSpread / 3;
            g.lineWidth = step;
            for (let i = 1; i <= 3; i++) {
                g.strokeColor = rgba(v.glow, Math.round(90 / i));
                const grow = step * (i - 0.5);
                g.roundRect(px - grow, py - grow, pw + grow * 2, ph + grow * 2, r + grow);
                g.stroke();
            }
        }
        // 下緣厚度陰影
        if (v.thickness > 0) {
            g.fillColor = new Color(0, 0, 0, 170);
            g.roundRect(px, py - v.thickness, pw, ph, r);
            g.fill();
        }
        // 兩段漸層：下色打底，中段、上段由下往上疊
        const mid: [number, number, number] = [
            Math.round((v.top[0] + v.bottom[0]) / 2), Math.round((v.top[1] + v.bottom[1]) / 2), Math.round((v.top[2] + v.bottom[2]) / 2)];
        g.fillColor = rgba(v.bottom, 255);
        g.roundRect(px, py, pw, ph, r);
        g.fill();
        g.fillColor = rgba(mid, 255);
        g.roundRect(px, py + ph * 0.3, pw, ph * 0.7, r);
        g.fill();
        g.fillColor = rgba(v.top, 255);
        g.roundRect(px, py + ph * 0.62, pw, ph * 0.38, r);
        g.fill();
        // 內上緣金高光
        g.lineWidth = 1;
        g.strokeColor = rgba(v.highlight, 120);
        g.moveTo(px + r, py + ph - 2.5);
        g.lineTo(px + pw - r, py + ph - 2.5);
        g.stroke();
        // 銅金外框
        const bw = th.borderWidth;
        g.lineWidth = bw;
        g.strokeColor = rgba(v.border, 255);
        g.roundRect(px + bw / 2, py + bw / 2, pw - bw, ph - bw, Math.max(1, r - bw / 2));
        g.stroke();
    }

    private _drawIcon(v: BattleButtonVisual): void {
        const g = this._iconGfx;
        const id = this._opts.icon;
        if (!g || !id) return;
        g.clear();
        g.lineWidth = 2.2;
        g.lineCap = Graphics.LineCap.ROUND;
        g.lineJoin = Graphics.LineJoin.ROUND;
        g.strokeColor = rgba(v.icon, 255);
        drawBattleIcon(g, id, this._iconSizeResolved);
        g.stroke();
    }
}
