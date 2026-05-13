// @spec-source ??閬?docs/cross-reference-index.md
/**
 * UIPreviewStyleBuilder
 *
 * 鞎痊???閬箸見撘?憟嚗??穿?
 *   - ? skin嚗olor-rect / sprite-frame嚗? *   - ?? skin嚗????sprite嚗? *   - Label 璅??憟
 *   - Sprite 憿???9-slice inset 閮剖?
 *   - Widget 撠?閮剖?
 *
 * 銝??撌梁??湔???靘陷憭?喳??UISkinResolver ??fontCache?? * ?航◤ UIPreviewBuilder ??UIPreviewShadowManager ?梁?? *
 * Unity 撠嚗?嗆 UIStyleApplier + UILayoutHelper ???? */
import { Node, Sprite, UITransform, Label, Button, Font, Color, Vec2 } from 'cc';
import { RoundedRectBackground } from '../components/RoundedRectBackground';
import { SolidBackground } from '../components/SolidBackground';
import { GradientBackground, GradientColorStop } from '../components/GradientBackground';
import { ShadowBackground, ShadowLayerDef } from '../components/ShadowBackground';
import { UISkinResolver, ResolvedButtonSkin, ResolvedLabelStyle } from './UISkinResolver';
import type { UILayoutNodeSpec } from './UISpecTypes';
import { UIPreviewDiagnostics } from './UIPreviewDiagnostics';

/** ??閬死???撠 Unity Selectable.SelectionState嚗?*/
export type ButtonVisualState = 'normal' | 'pressed' | 'hover' | 'disabled' | 'selected';

export class UIPreviewStyleBuilder {

    constructor(
        private readonly skinResolver: UISkinResolver,
        private readonly fontCache: Map<string, Font | null>,
    ) {}

    // ??? ? Skin ????????????????????????????????????????????????????????????

    /**
     * 憟? skin ?啁?暺?color-rect ??sprite-frame嚗?     * ? true 隞?”憟??嚗alse 隞?”?曆??啗?皞??澆蝡臬??fallback嚗?     * Unity 撠嚗mage.color + Image.sprite ???舫?頛?     */
    async applyBackgroundSkin(node: Node, skinSlot: string): Promise<boolean> {
        const slot = this.skinResolver.getSlot(skinSlot);
        const slotAny = slot as Record<string, any> | null;
        const resolveOpacity = (rawOpacity: unknown): number | null => {
            if (typeof rawOpacity !== 'number' || Number.isNaN(rawOpacity)) {
                return null;
            }
            const opacityValue = rawOpacity <= 1 ? Math.round(rawOpacity * 255) : Math.round(rawOpacity);
            return Math.max(0, Math.min(255, opacityValue));
        };

        if (slot && slotAny.kind === 'transparent') {
            const sprite = node.getComponent(Sprite);
            if (sprite) {
                sprite.enabled = false;
            }
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
            const gradient = node.getComponent(GradientBackground);
            if (gradient) {
                gradient.enabled = false;
            }
            return true;
        }

        if (slot && slotAny.kind === 'gradient-rect') {
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

            const gradient = slotAny.gradient || {};
            const stops: GradientColorStop[] = Array.isArray(gradient.stops)
                ? gradient.stops.map((stop) => ({
                    color: this._resolveGradientColor(stop.color, stop.opacity),
                    offset: typeof stop.offset === 'number' ? stop.offset : 0,
                }))
                : [];
            const borderWidthRaw = slotAny.borderWidth ?? slotAny.strokeWidth;
            const borderWidth = typeof borderWidthRaw === 'number' && !Number.isNaN(borderWidthRaw)
                ? Math.max(0, borderWidthRaw)
                : 0;
            const cornerRadius = this._resolveCornerRadius(slot);
            const borderColorKey = slotAny.borderColor ?? slotAny.strokeColor;
            const hasRepeatingLayer = Array.isArray(slotAny.backgroundLayers)
                && slotAny.backgroundLayers.some((layer) => layer?.kind === 'gradient' && layer.gradient?.repeating === true);
            const gradientShape = {
                cornerRadius,
                borderWidth,
                borderColor: typeof borderColorKey === 'string'
                    ? this.skinResolver.resolveColor(borderColorKey)
                    : new Color(255, 255, 255, 0),
                repeating: gradient.repeating === true || hasRepeatingLayer,
                repeatSpanPx: typeof gradient.repeatSpanPx === 'number'
                    ? gradient.repeatSpanPx
                    : undefined,
                repeatSpanRatio: typeof gradient.repeatSpanRatio === 'number'
                    ? gradient.repeatSpanRatio
                    : undefined,
            };
            const background = node.getComponent(GradientBackground) || node.addComponent(GradientBackground);
            background.enabled = true;
            if (gradient.type === 'radial') {
                background.setRadialGradient(stops, {
                    ...gradientShape,
                    center: this._resolveGradientPoint(gradient.center, { x: 0.5, y: 0.5 }),
                    radius: this._resolveGradientPoint(gradient.radius, { x: 0.5, y: 0.5 }),
                });
            } else {
                background.setLinearGradient(typeof gradient.angle === 'number' ? gradient.angle : 180, stops, gradientShape);
            }
            const alpha = resolveOpacity(slotAny.alpha ?? slotAny.opacity);
            background.setTintColor(new Color(255, 255, 255, alpha ?? 255));
            return true;
        }

        if (slot && slotAny.kind === 'shadow-set') {
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

            const shadowLayers: ShadowLayerDef[] = Array.isArray(slotAny.boxShadows)
                ? slotAny.boxShadows.map((shadow) => ({
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
            background.setShadows(shadowLayers, slotAny.padding, this._resolveCornerRadius(slot));
            const alpha = resolveOpacity(slotAny.alpha ?? slotAny.opacity);
            background.setTintColor(new Color(255, 255, 255, alpha ?? 255));
            return true;
        }

        // 蝝?
        if (slot && (slot.kind === 'color-rect' || slotAny.kind === 'color')) {
            const resolvedColor = this.skinResolver.resolveColor(slotAny.color);
            const alpha = resolveOpacity(slotAny.alpha ?? slotAny.opacity);
            // alpha / opacity ?湔撖怠 SolidBackground ??color.a嚗??UIOpacity cascade 敶梢摮?暺?Labels 蝑?
            // Unity 撠嚗mage.color = new Color(r,g,b,a) ?芸蔣?輯頨?renderer嚗? cascade
            if (alpha !== null) {
                resolvedColor.a = alpha;
            }
            const borderWidthRaw = slotAny.borderWidth ?? slotAny.strokeWidth;
            const borderWidth = typeof borderWidthRaw === 'number' && !Number.isNaN(borderWidthRaw)
                ? Math.max(0, borderWidthRaw)
                : 0;
            const cornerRadius = this._resolveCornerRadius(slot);
            const borderColorKey = slotAny.borderColor ?? slotAny.strokeColor;
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

        // ???
        const frame = await this.skinResolver.getSpriteFrame(skinSlot);
        if (!frame) return false;

        const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;
        const alpha = resolveOpacity(slotAny?.opacity ?? slotAny?.alpha);
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

    private _resolveGradientPoint(rawPoint: unknown, fallback: { x: number; y: number }): { x: number; y: number } {
        if (!rawPoint || typeof rawPoint !== 'object') {
            return fallback;
        }
        const point = rawPoint as { x?: unknown; y?: unknown };
        return {
            x: typeof point.x === 'number' && Number.isFinite(point.x) ? point.x : fallback.x,
            y: typeof point.y === 'number' && Number.isFinite(point.y) ? point.y : fallback.y,
        };
    }

    private _resolveCornerRadius(slot: unknown): number {
        const slotRecord = slot as Record<string, any> | null;
        const raw = slotRecord?.cornerRadius ?? slotRecord?.radius ?? slotRecord?.border?.radius;
        if (typeof raw === 'number' && !Number.isNaN(raw)) {
            return Math.max(0, raw);
        }
        if (typeof raw === 'string') {
            const parsed = Number(raw.replace(/px$/i, '').trim());
            return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
        }
        if (raw && typeof raw === 'object') {
            const values = ['tl', 'tr', 'br', 'bl']
                .map(key => (raw as Record<string, unknown>)[key])
                .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
            return values.length > 0 ? Math.max(0, ...values) : 0;
        }
        return 0;
    }

    // ??? ?? Skin ????????????????????????????????????????????????????????????

    /**
     * 憟?? skin嚗????sprite嚗蝭暺?     * ? true 隞?”憟????     * Unity 撠嚗utton.SpriteState + SpriteSwapper
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
        // 敹怠?????frame 靘?setButtonVisualState 雿輻
        (button as Button & { _buttonSkinStateMap?: typeof stateMap })._buttonSkinStateMap = stateMap;
        (node as Node & { _buttonSkinStateMap?: typeof stateMap })._buttonSkinStateMap = stateMap;
        return true;
    }

    /**
     * ?箸???frame 閮剖? 9-slice border inset??     * Unity 撠嚗prite.border嚗???sliced 頝嚗?     */
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

    // ??? Sprite 憿? ??????????????????????????????????????????????????????????

    /**
     * 閮剖? Sprite 憿舐內憿?嚗imple / sliced / tiled嚗蒂撖怠 9-slice inset??     * Unity 撠嚗mage.type嚗imple / Sliced / Tiled嚗? Sprite.border
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

    // ??? Label 璅?? ???????????????????????????????????????????????????????????

    /**
     * 憟 LabelStyle ??Label ?辣??     * ??buildScreen ?歇??摮?嚗迨??亙? fontCache ???     * Unity 撠嚗MP_Text ??撅祆扯釵??     */
    applyLabelStyle(label: Label, style: ResolvedLabelStyle): void {
        label.fontSize        = style.fontSize;
        label.lineHeight      = style.lineHeight;
        label.color           = style.color;
        label.spacingX        = style.letterSpacing;
        label.horizontalAlign = style.horizontalAlign;
        label.verticalAlign   = style.verticalAlign;
        // overflow floor嚗??迂 skin 撠?overflow 閮剔 NONE嚗?嚗?
        // 撘瑕?雿?? SHRINK嚗?嚗?蝣箔???瘞訾?皞Ｗ摰孵??        // CLAMP(1)?ESIZE_HEIGHT(3) ?見摰嚗?閮曹蝙?具?        // Unity 撠嚗extMeshPro 瘞賊?? AutoSize 雿摨?
        label.overflow = style.overflow === 0 ? 2 : style.overflow;
        if (style.outlineColor) {
            label.outlineColor = style.outlineColor;
        }
        if (style.outlineWidth !== undefined) {
            label.outlineWidth = style.outlineWidth;
        }
        // R-11: ?? Label shadow嚗onverter ??layout ?挾撌脫? CSS text-shadow
        // 閫????{ color, offsetX, offsetY, blur }嚗迨???runtime wiring
        if (style.shadow) {
            label.enableShadow = true;
            label.shadowColor  = style.shadow.color;
            label.shadowOffset = new Vec2(style.shadow.offsetX, style.shadow.offsetY);
            label.shadowBlur   = style.shadow.blur || 0;
        }
        label.isBold = !!style.isBold;
        label.isItalic = !!style.isItalic;
        if (style.fontPath) {
            const font = this.fontCache.get(style.fontPath);
            if (font) label.font = font;
        }
    }
}

