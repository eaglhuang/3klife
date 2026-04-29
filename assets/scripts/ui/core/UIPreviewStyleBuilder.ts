// @spec-source → 見 docs/cross-reference-index.md
/**
 * UIPreviewStyleBuilder
 *
 * 負責所有視覺樣式的套用，包括：
 *   - 背景 skin（color-rect / sprite-frame）
 *   - 按鈕 skin（多狀態 sprite）
 *   - Label 樣式套用
 *   - Sprite 類型與 9-slice inset 設定
 *   - Widget 對齊設定
 *
 * 不持有自己的場景狀態，依賴外部傳入的 UISkinResolver 與 fontCache。
 * 可被 UIPreviewBuilder 與 UIPreviewShadowManager 共用。
 *
 * Unity 對照：相當於 UIStyleApplier + UILayoutHelper 的組合
 */
import { Node, Sprite, UITransform, Label, Button, Font, Color, Vec2 } from 'cc';
import { RoundedRectBackground } from '../components/RoundedRectBackground';
import { SolidBackground } from '../components/SolidBackground';
import { GradientBackground, GradientColorStop } from '../components/GradientBackground';
import { ShadowBackground, ShadowLayerDef } from '../components/ShadowBackground';
import { UISkinResolver, ResolvedButtonSkin, ResolvedLabelStyle } from './UISkinResolver';
import type { UILayoutNodeSpec } from './UISpecTypes';
import { UIPreviewDiagnostics } from './UIPreviewDiagnostics';

/** 按鈕視覺狀態（對照 Unity Selectable.SelectionState） */
export type ButtonVisualState = 'normal' | 'pressed' | 'hover' | 'disabled' | 'selected';

export class UIPreviewStyleBuilder {

    constructor(
        private readonly skinResolver: UISkinResolver,
        private readonly fontCache: Map<string, Font | null>,
    ) {}

    // ─── 背景 Skin ────────────────────────────────────────────────────────────

    /**
     * 套用背景 skin 到節點（color-rect 或 sprite-frame）。
     * 回傳 true 代表套用成功；false 代表找不到資源（呼叫端可做 fallback）。
     * Unity 對照：Image.color + Image.sprite 的分支邏輯
     */
    async applyBackgroundSkin(node: Node, skinSlot: string): Promise<boolean> {
        const slot = this.skinResolver.getSlot(skinSlot);
        const resolveOpacity = (rawOpacity: unknown): number | null => {
            if (typeof rawOpacity !== 'number' || Number.isNaN(rawOpacity)) {
                return null;
            }
            const opacityValue = rawOpacity <= 1 ? Math.round(rawOpacity * 255) : Math.round(rawOpacity);
            return Math.max(0, Math.min(255, opacityValue));
        };

        if (slot && (slot as any).kind === 'gradient-rect') {
            const solid = node.getComponent(SolidBackground);
            if (solid) {
                solid.enabled = false;
            }
            const shadow = node.getComponent(ShadowBackground);
            if (shadow) {
                shadow.enabled = false;
            }
            const roundedRect = node.getComponent(RoundedRectBackground);
            if (roundedRect) {
                roundedRect.enabled = false;
            }

            const gradient = (slot as any).gradient || {};
            const stops: GradientColorStop[] = Array.isArray(gradient.stops)
                ? gradient.stops.map((stop: any) => ({
                    color: this._resolveGradientColor(stop.color, stop.opacity),
                    offset: typeof stop.offset === 'number' ? stop.offset : 0,
                }))
                : [];
            const background = node.getComponent(GradientBackground) || node.addComponent(GradientBackground);
            background.enabled = true;
            const borderWidthRaw = (slot as any).borderWidth ?? (slot as any).strokeWidth;
            const borderWidth = typeof borderWidthRaw === 'number' && !Number.isNaN(borderWidthRaw)
                ? Math.max(0, borderWidthRaw)
                : 0;
            const cornerRadiusRaw = (slot as any).cornerRadius;
            const cornerRadius = typeof cornerRadiusRaw === 'number' && !Number.isNaN(cornerRadiusRaw)
                ? Math.max(0, cornerRadiusRaw)
                : 0;
            const borderColorKey = (slot as any).borderColor ?? (slot as any).strokeColor;
            background.setLinearGradient(typeof gradient.angle === 'number' ? gradient.angle : 180, stops, {
                cornerRadius,
                borderWidth,
                borderColor: typeof borderColorKey === 'string'
                    ? this.skinResolver.resolveColor(borderColorKey)
                    : new Color(255, 255, 255, 0),
            });
            const alpha = resolveOpacity((slot as any).alpha ?? (slot as any).opacity);
            const sprite = node.getComponent(Sprite);
            if (sprite && alpha !== null) {
                sprite.color = new Color(sprite.color.r, sprite.color.g, sprite.color.b, alpha);
            }
            return true;
        }

        if (slot && (slot as any).kind === 'shadow-set') {
            const solid = node.getComponent(SolidBackground);
            if (solid) {
                solid.enabled = false;
            }
            const roundedRect = node.getComponent(RoundedRectBackground);
            if (roundedRect) {
                roundedRect.enabled = false;
            }
            const gradient = node.getComponent(GradientBackground);
            if (gradient) {
                gradient.enabled = false;
            }

            const shadowLayers: ShadowLayerDef[] = Array.isArray((slot as any).boxShadows)
                ? (slot as any).boxShadows.map((shadow: any) => ({
                    x: typeof shadow.x === 'number' ? shadow.x : 0,
                    y: typeof shadow.y === 'number' ? shadow.y : 0,
                    blur: typeof shadow.blur === 'number' ? shadow.blur : 0,
                    spread: typeof shadow.spread === 'number' ? shadow.spread : 0,
                    color: this._resolveGradientColor(shadow.color || 'rgba(0,0,0,0.35)'),
                    inset: !!shadow.inset,
                }))
                : [];
            const background = node.getComponent(ShadowBackground) || node.addComponent(ShadowBackground);
            background.enabled = true;
            background.setShadows(shadowLayers, (slot as any).padding, (slot as any).cornerRadius);
            const alpha = resolveOpacity((slot as any).alpha ?? (slot as any).opacity);
            const sprite = node.getComponent(Sprite);
            if (sprite && alpha !== null) {
                sprite.color = new Color(sprite.color.r, sprite.color.g, sprite.color.b, alpha);
            }
            return true;
        }

        // 純色背景
        if (slot && (slot.kind === 'color-rect' || (slot as any).kind === 'color')) {
            const resolvedColor = this.skinResolver.resolveColor((slot as any).color);
            const alpha = resolveOpacity((slot as any).alpha ?? (slot as any).opacity);
            // alpha / opacity 直接寫入 SolidBackground 的 color.a，避免 UIOpacity cascade 影響子節點（Labels 等）
            // Unity 對照：Image.color = new Color(r,g,b,a) 只影響自身 renderer，不 cascade
            if (alpha !== null) {
                resolvedColor.a = alpha;
            }
            const borderWidthRaw = (slot as any).borderWidth ?? (slot as any).strokeWidth;
            const borderWidth = typeof borderWidthRaw === 'number' && !Number.isNaN(borderWidthRaw)
                ? Math.max(0, borderWidthRaw)
                : 0;
            const cornerRadiusRaw = (slot as any).cornerRadius;
            const cornerRadius = typeof cornerRadiusRaw === 'number' && !Number.isNaN(cornerRadiusRaw)
                ? Math.max(0, cornerRadiusRaw)
                : 0;
            const borderColorKey = (slot as any).borderColor ?? (slot as any).strokeColor;
            const usesRoundedRect = cornerRadius > 0 || borderWidth > 0 || typeof borderColorKey === 'string';

            if (usesRoundedRect) {
                const sprite = node.getComponent(Sprite);
                if (sprite) {
                    sprite.enabled = false;
                }

                const solid = node.getComponent(SolidBackground);
                if (solid) {
                    solid.enabled = false;
                }

                const roundedRect = node.getComponent(RoundedRectBackground) || node.addComponent(RoundedRectBackground);
                roundedRect.enabled = true;
                roundedRect.fillColor = resolvedColor;
                roundedRect.cornerRadius = cornerRadius;
                roundedRect.borderWidth = borderWidth;
                roundedRect.borderColor = typeof borderColorKey === 'string'
                    ? this.skinResolver.resolveColor(borderColorKey)
                    : new Color(0, 0, 0, 0);
                return true;
            }

            const roundedRect = node.getComponent(RoundedRectBackground);
            if (roundedRect) {
                roundedRect.enabled = false;
            }
            const shadow = node.getComponent(ShadowBackground);
            if (shadow) {
                shadow.enabled = false;
            }

            const sprite = node.getComponent(Sprite);
            if (sprite) {
                sprite.enabled = true;
            }

            const bg = node.getComponent(SolidBackground) || node.addComponent(SolidBackground);
            bg.enabled = true;
            bg.color = resolvedColor;
            return true;
        }

        // 圖片背景
        const frame = await this.skinResolver.getSpriteFrame(skinSlot);
        if (!frame) return false;

        const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;
        const alpha = resolveOpacity((slot as any)?.opacity ?? (slot as any)?.alpha);
        if (alpha !== null) {
            sprite.color = new Color(sprite.color.r, sprite.color.g, sprite.color.b, alpha);
        }
        if (slot?.kind === 'sprite-frame') {
            this.applySpriteSkin(sprite, slot.spriteType, slot.border);
        } else if (slot?.kind === 'button-skin') {
            this.applySpriteSkin(sprite, slot.spriteType, slot.border);
        }
        return true;
    }

    private _resolveGradientColor(rawColor: unknown, rawOpacity?: unknown): Color {
        const opacity = typeof rawOpacity === 'number' && !Number.isNaN(rawOpacity)
            ? Math.max(0, Math.min(1, rawOpacity))
            : 1;
        if (typeof rawColor !== 'string') {
            return new Color(255, 255, 255, Math.round(255 * opacity));
        }
        const raw = rawColor.trim();
        if (raw.toLowerCase() === 'transparent') {
            return new Color(0, 0, 0, 0);
        }
        const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
        if (rgb) {
            const alpha = rgb[4] != null ? Math.max(0, Math.min(1, Number(rgb[4]))) : 1;
            return new Color(
                Math.max(0, Math.min(255, Number(rgb[1]) || 0)),
                Math.max(0, Math.min(255, Number(rgb[2]) || 0)),
                Math.max(0, Math.min(255, Number(rgb[3]) || 0)),
                Math.round(255 * alpha * opacity),
            );
        }
        const color = this.skinResolver.resolveColor(raw);
        color.a = Math.round(color.a * opacity);
        return color;
    }

    // ─── 按鈕 Skin ────────────────────────────────────────────────────────────

    /**
     * 套用按鈕 skin（多狀態 sprite）到節點。
     * 回傳 true 代表套用成功。
     * Unity 對照：Button.SpriteState + SpriteSwapper
     */
    async applyButtonSkin(node: Node, slotId: string, button: Button): Promise<boolean> {
        const slot = this.skinResolver.getSlot(slotId);
        if (!slot || slot.kind !== 'button-skin') return false;

        const skin = await this.skinResolver.getButtonSkin(slotId);
        if (!skin?.normal) return false;

        const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
        const stateMap: Record<ButtonVisualState, ResolvedButtonSkin['normal']> = {
            normal:   this.prepareButtonFrame(skin.normal,                    slot.border),
            pressed:  this.prepareButtonFrame(skin.pressed  ?? skin.normal,   slot.border),
            hover:    this.prepareButtonFrame(skin.hover    ?? skin.normal,   slot.border),
            disabled: this.prepareButtonFrame(skin.disabled ?? skin.normal,   slot.border),
            selected: this.prepareButtonFrame(skin.selected ?? skin.normal,   slot.border),
        };

        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = stateMap.normal;
        this.applySpriteSkin(sprite, slot.spriteType, slot.border);

        button.transition    = Button.Transition.SPRITE;
        button.normalSprite  = stateMap.normal;
        button.pressedSprite = stateMap.pressed;
        button.hoverSprite   = stateMap.hover;
        button.disabledSprite = stateMap.disabled;
        // 快取各狀態 frame 供 setButtonVisualState 使用
        (node as any)._buttonSkinStateMap = stateMap;
        return true;
    }

    /**
     * 為按鈕 frame 設定 9-slice border inset。
     * Unity 對照：Sprite.border（四邊 sliced 距離）
     */
    prepareButtonFrame(
        frame: ResolvedButtonSkin['normal'],
        border?: [number, number, number, number],
    ): ResolvedButtonSkin['normal'] {
        if (!frame) return null;
        if (border) {
            const [top, right, bottom, left] = border;
            frame.insetTop    = top;
            frame.insetRight  = right;
            frame.insetBottom = bottom;
            frame.insetLeft   = left;
        }
        return frame;
    }

    // ─── Sprite 類型 ──────────────────────────────────────────────────────────

    /**
     * 設定 Sprite 顯示類型（simple / sliced / tiled）並寫入 9-slice inset。
     * Unity 對照：Image.type（Simple / Sliced / Tiled）+ Sprite.border
     */
    applySpriteSkin(
        sprite: Sprite,
        spriteType: 'simple' | 'sliced' | 'tiled',
        border?: [number, number, number, number],
    ): void {
        switch (spriteType) {
            case 'sliced': sprite.type = Sprite.Type.SLICED; break;
            case 'tiled':  sprite.type = Sprite.Type.TILED;  break;
            default:       sprite.type = Sprite.Type.SIMPLE; break;
        }

        if (!border || !sprite.spriteFrame) return;

        const [top, right, bottom, left] = border;
        sprite.spriteFrame.insetTop    = top;
        sprite.spriteFrame.insetRight  = right;
        sprite.spriteFrame.insetBottom = bottom;
        sprite.spriteFrame.insetLeft   = left;
    }

    // ─── Label 樣式 ───────────────────────────────────────────────────────────

    /**
     * 套用 LabelStyle 到 Label 元件。
     * 若 buildScreen 時已預載字型，此處直接從 fontCache 取用。
     * Unity 對照：TMP_Text 的各屬性賦值
     */
    applyLabelStyle(label: Label, style: ResolvedLabelStyle): void {
        label.fontSize        = style.fontSize;
        label.lineHeight      = style.lineHeight;
        label.color           = style.color;
        label.horizontalAlign = style.horizontalAlign;
        label.verticalAlign   = style.verticalAlign;
        // overflow floor：不允許 skin 將 overflow 設為 NONE（0），
        // 強制最低保障為 SHRINK（2），確保文字永不溢出容器。
        // CLAMP(1)、RESIZE_HEIGHT(3) 同樣安全，准許使用。
        // Unity 對照：TextMeshPro 永遠啟用 AutoSize 作為底線
        label.overflow = style.overflow === 0 ? 2 : style.overflow;
        if (style.outlineColor) {
            label.outlineColor = style.outlineColor;
        }
        if (style.outlineWidth !== undefined) {
            label.outlineWidth = style.outlineWidth;
        }
        // R-11: 原生 Label shadow，converter 在 layout 階段已把 CSS text-shadow
        // 解析為 { color, offsetX, offsetY, blur }；此處只做 runtime wiring。
        if (style.shadow) {
            label.enableShadow = true;
            label.shadowColor  = style.shadow.color;
            label.shadowOffset = new Vec2(style.shadow.offsetX, style.shadow.offsetY);
            label.shadowBlur   = style.shadow.blur || 0;
        }
        if (style.isBold) label.isBold = true;
        if (style.fontPath) {
            const font = this.fontCache.get(style.fontPath);
            if (font) label.font = font;
        }
    }
}
