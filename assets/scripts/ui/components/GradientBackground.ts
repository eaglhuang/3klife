// @spec-source: docs/cross-reference-index.md
import { _decorator, Color, Component, Node, Rect, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';

const { ccclass, executeInEditMode, requireComponent } = _decorator;

export interface GradientColorStop {
    color: Color;
    offset: number;
}

export interface GradientBackgroundShapeOptions {
    cornerRadius?: number;
    /** 四角不同時：[左上, 右上, 右下, 左下] */
    cornerRadii?: number[];
    borderWidth?: number;
    /** 各邊不同時的邊框寬度；未給則四邊皆用 borderWidth */
    borderSides?: { top: number; right: number; bottom: number; left: number };
    borderColor?: Color;
    repeating?: boolean;
    repeatSpanPx?: number;
    repeatSpanRatio?: number;
}

export interface GradientBackgroundRadialOptions extends GradientBackgroundShapeOptions {
    center?: { x?: number; y?: number };
    radius?: { x?: number; y?: number };
}

type GradientBackgroundType = 'linear' | 'radial';

const EDGE_TEXTURE_MAX_SIDE = 1024;

@ccclass('GradientBackground')
@requireComponent(UITransform)
@executeInEditMode
export class GradientBackground extends Component {
    private _gradientType: GradientBackgroundType = 'linear';
    private _angle = 180;
    private _repeating = false;
    private _repeatSpanPx = 0;
    private _repeatSpanRatio = 0;
    private _radialCenterX = 0.5;
    private _radialCenterY = 0.5;
    private _radialRadiusX = 0.5;
    private _radialRadiusY = 0.5;
    private _stops: GradientColorStop[] = [
        { color: new Color(255, 255, 255, 255), offset: 0 },
        { color: new Color(255, 255, 255, 255), offset: 1 },
    ];
    private _cornerRadius = 0;
    private _borderWidth = 0;
    private _borderColor = new Color(255, 255, 255, 0);
    private _cornerRadii: number[] | null = null;
    private _borderSides: { top: number; right: number; bottom: number; left: number } | null = null;
    private _tintColor = new Color(255, 255, 255, 255);
    private _sprite: Sprite | null = null;

    onLoad(): void {
        this._sprite = this.getComponent(Sprite) || this.addComponent(Sprite);
        this.node.on(Node.EventType.SIZE_CHANGED, this._redraw, this);
        this._redraw();
    }

    onEnable(): void {
        this._redraw();
    }

    onDestroy(): void {
        this.node.off(Node.EventType.SIZE_CHANGED, this._redraw, this);
    }

    public setLinearGradient(angle: number, stops: GradientColorStop[], shape?: GradientBackgroundShapeOptions): void {
        this._gradientType = 'linear';
        this._angle = Number.isFinite(angle) ? angle : 180;
        this._repeating = shape?.repeating === true;
        this._repeatSpanPx = Math.max(0, Number(shape?.repeatSpanPx) || 0);
        this._repeatSpanRatio = Math.max(0, Number(shape?.repeatSpanRatio) || 0);
        this._stops = this._normalizeStops(stops);
        this._applyShape(shape);
        this._redraw();
    }

    public setRadialGradient(stops: GradientColorStop[], shape?: GradientBackgroundRadialOptions): void {
        this._gradientType = 'radial';
        this._repeating = shape?.repeating === true;
        this._repeatSpanPx = Math.max(0, Number(shape?.repeatSpanPx) || 0);
        this._repeatSpanRatio = Math.max(0, Number(shape?.repeatSpanRatio) || 0);
        this._stops = this._normalizeStops(stops);
        this._radialCenterX = this._resolveFiniteNumber(shape?.center?.x, 0.5);
        this._radialCenterY = this._resolveFiniteNumber(shape?.center?.y, 0.5);
        this._radialRadiusX = Math.max(0.0001, this._resolveFiniteNumber(shape?.radius?.x, 0.5));
        this._radialRadiusY = Math.max(0.0001, this._resolveFiniteNumber(shape?.radius?.y, 0.5));
        this._applyShape(shape);
        this._redraw();
    }

    private _applyShape(shape?: GradientBackgroundShapeOptions): void {
        this._cornerRadius = Math.max(0, Number(shape?.cornerRadius) || 0);
        this._borderWidth = Math.max(0, Number(shape?.borderWidth) || 0);
        this._borderColor = shape?.borderColor || new Color(255, 255, 255, 0);
        const radii = shape?.cornerRadii;
        this._cornerRadii = Array.isArray(radii) && radii.length === 4
            ? radii.map(value => Math.max(0, Number(value) || 0))
            : null;
        const sides = shape?.borderSides;
        this._borderSides = sides
            ? {
                top: Math.max(0, Number(sides.top) || 0),
                right: Math.max(0, Number(sides.right) || 0),
                bottom: Math.max(0, Number(sides.bottom) || 0),
                left: Math.max(0, Number(sides.left) || 0),
            }
            : null;
    }

    /** 只換外框色，其餘形狀不變（PROG-2-1697：適分頁依評等換框） */
    public setBorderColor(color: Color): void {
        this._borderColor = new Color(color.r, color.g, color.b, color.a);
        this._redraw();
    }

    public setTintColor(color?: Color | null): void {
        this._tintColor = color
            ? new Color(color.r, color.g, color.b, color.a)
            : new Color(255, 255, 255, 255);
        if (this._sprite) {
            this._sprite.color = new Color(
                this._tintColor.r,
                this._tintColor.g,
                this._tintColor.b,
                this._tintColor.a,
            );
        }
    }

    private _resolveFiniteNumber(value: unknown, fallback: number): number {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }

    private _normalizeStops(stops: GradientColorStop[]): GradientColorStop[] {
        const normalized = (stops || [])
            .filter(stop => stop && stop.color)
            .map(stop => ({
                color: stop.color,
                offset: Math.max(0, Math.min(1, Number.isFinite(stop.offset) ? stop.offset : 0)),
            }))
            .sort((a, b) => a.offset - b.offset);

        if (normalized.length === 0) {
            return [
                { color: new Color(255, 255, 255, 255), offset: 0 },
                { color: new Color(255, 255, 255, 255), offset: 1 },
            ];
        }
        if (normalized.length === 1) {
            return [
                { color: normalized[0].color, offset: 0 },
                { color: normalized[0].color, offset: 1 },
            ];
        }
        if (normalized[0].offset > 0) {
            normalized.unshift({ color: normalized[0].color, offset: 0 });
        }
        if (normalized[normalized.length - 1].offset < 1) {
            normalized.push({ color: normalized[normalized.length - 1].color, offset: 1 });
        }
        return normalized;
    }

    private _redraw(): void {
        const sprite = this._sprite || this.getComponent(Sprite) || this.addComponent(Sprite);
        this._sprite = sprite;

        const transform = this.getComponent(UITransform);
        const width = Math.max(1, transform?.width || 1);
        const height = Math.max(1, transform?.height || 1);
        // 有圓角或邊框時邊緣需逐像素反鋸齒，貼圖改 1:1；純漸層可低解析度放大。
        const hasEdge = this._cornerRadius > 0 || this._borderWidth > 0 || !!this._cornerRadii || !!this._borderSides;
        const maxTextureSide = hasEdge
            ? Math.max(2, Math.min(EDGE_TEXTURE_MAX_SIDE, Math.ceil(Math.max(width, height))))
            : Math.max(64, Math.min(256, Math.round(Math.max(width, height) / 6)));
        const aspect = width / height;
        const textureWidth = aspect >= 1 ? maxTextureSide : Math.max(2, Math.round(maxTextureSide * aspect));
        const textureHeight = aspect >= 1 ? Math.max(2, Math.round(maxTextureSide / aspect)) : maxTextureSide;
        const data = new Uint8Array(textureWidth * textureHeight * 4);

        const angleRad = (this._angle * Math.PI) / 180;
        const dirX = Math.sin(angleRad);
        const dirY = -Math.cos(angleRad);
        const corners = [
            [-width * 0.5, -height * 0.5],
            [width * 0.5, -height * 0.5],
            [-width * 0.5, height * 0.5],
            [width * 0.5, height * 0.5],
        ];
        let minProjection = Number.POSITIVE_INFINITY;
        let maxProjection = Number.NEGATIVE_INFINITY;
        for (const corner of corners) {
            const projection = corner[0] * dirX + corner[1] * dirY;
            minProjection = Math.min(minProjection, projection);
            maxProjection = Math.max(maxProjection, projection);
        }

        for (let pixelY = 0; pixelY < textureHeight; pixelY++) {
            for (let pixelX = 0; pixelX < textureWidth; pixelX++) {
                const normalizedX = (pixelX + 0.5) / textureWidth;
                const normalizedY = (pixelY + 0.5) / textureHeight;
                const uiX = normalizedX * width - width * 0.5;
                const uiY = normalizedY * height - height * 0.5;
                const t = this._gradientType === 'radial'
                    ? this._sampleRadialT(normalizedX, normalizedY)
                    : this._sampleLinearT(uiX * dirX + uiY * dirY, minProjection, maxProjection);
                const color = this._samplePixelColor(t, uiX, uiY, width, height);
                const index = (pixelY * textureWidth + pixelX) * 4;
                data[index] = color.r;
                data[index + 1] = color.g;
                data[index + 2] = color.b;
                data[index + 3] = color.a;
            }
        }

        const texture = new Texture2D();
        texture.reset({ width: textureWidth, height: textureHeight, format: Texture2D.PixelFormat.RGBA8888 });
        texture.uploadData(data);
        // 1:1 邊緣貼圖已自行反鋸齒；線性過濾會在未預乘的邊框與半透明填色之間內插出灰白色
        // 測試用 cc 型別樁沒有 Filter 列舉，經 any 取用
        const nearest = (Texture2D as any).Filter?.NEAREST;
        if (hasEdge && nearest !== undefined) texture.setFilters(nearest, nearest);
        (texture as any).loaded = true;

        const frame = new SpriteFrame();
        frame.packable = false;
        frame.rect = new Rect(0, 0, textureWidth, textureHeight);
        frame.texture = texture;

        sprite.enabled = true;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.type = Sprite.Type.SIMPLE;
        sprite.spriteFrame = frame;
        sprite.color = new Color(
            this._tintColor.r,
            this._tintColor.g,
            this._tintColor.b,
            this._tintColor.a,
        );
    }

    private _sampleRadialT(normalizedX: number, normalizedY: number): number {
        const deltaX = normalizedX - this._radialCenterX;
        const deltaY = normalizedY - this._radialCenterY;
        const normalizedDistance = Math.sqrt(
            (deltaX * deltaX) / (this._radialRadiusX * this._radialRadiusX)
            + (deltaY * deltaY) / (this._radialRadiusY * this._radialRadiusY),
        );
        return Math.max(0, Math.min(1, normalizedDistance));
    }

    private _sampleLinearT(projection: number, minProjection: number, maxProjection: number): number {
        const range = Math.max(0.0001, maxProjection - minProjection);
        if (!this._repeating) {
            return Math.max(0, Math.min(1, (projection - minProjection) / range));
        }
        const repeatSpan = this._resolveRepeatSpanPx(range);
        if (repeatSpan <= 0) {
            return Math.max(0, Math.min(1, (projection - minProjection) / range));
        }
        return this._positiveModulo(projection - minProjection, repeatSpan) / repeatSpan;
    }

    private _resolveRepeatSpanPx(range: number): number {
        if (this._repeatSpanPx > 0) {
            return this._repeatSpanPx;
        }
        if (this._repeatSpanRatio > 0) {
            return Math.max(0.0001, range * this._repeatSpanRatio);
        }
        return 0;
    }

    private _positiveModulo(value: number, divisor: number): number {
        if (divisor <= 0) {
            return 0;
        }
        const remainder = value % divisor;
        return remainder < 0 ? remainder + divisor : remainder;
    }

    private _samplePixelColor(t: number, uiX: number, uiY: number, width: number, height: number): Color {
        const halfWidth = width * 0.5;
        const halfHeight = height * 0.5;
        // 角序：左上、右上、右下、左下（uiY 負值為上方）
        const radii = (this._cornerRadii || [this._cornerRadius, this._cornerRadius, this._cornerRadius, this._cornerRadius])
            .map(value => Math.min(value, halfWidth, halfHeight));
        // 以有號距離算邊緣覆蓋率（約 1 像素過渡），取代二值內外判斷避免鋸齒。
        const outerCoverage = this._edgeCoverage(this._roundedRectDistance(uiX, uiY, 0, 0, halfWidth, halfHeight, radii));
        if (outerCoverage <= 0) {
            return new Color(0, 0, 0, 0);
        }

        let color = this._sampleColor(t);
        const fallback = Math.min(this._borderWidth, halfWidth, halfHeight);
        const sides = this._borderSides || { top: fallback, right: fallback, bottom: fallback, left: fallback };
        if ((sides.top || sides.right || sides.bottom || sides.left) && this._borderColor.a > 0) {
            const innerRadii = [
                Math.max(0, radii[0] - Math.max(sides.top, sides.left)),
                Math.max(0, radii[1] - Math.max(sides.top, sides.right)),
                Math.max(0, radii[2] - Math.max(sides.bottom, sides.right)),
                Math.max(0, radii[3] - Math.max(sides.bottom, sides.left)),
            ];
            const innerDistance = this._roundedRectDistance(
                uiX, uiY,
                (sides.left - sides.right) * 0.5,
                (sides.top - sides.bottom) * 0.5,
                Math.max(0, halfWidth - (sides.left + sides.right) * 0.5),
                Math.max(0, halfHeight - (sides.top + sides.bottom) * 0.5),
                innerRadii,
            );
            color = this._mixColor(this._borderColor, color, this._edgeCoverage(innerDistance));
        }
        return outerCoverage >= 1
            ? color
            : new Color(color.r, color.g, color.b, Math.round(color.a * outerCoverage));
    }

    private _roundedRectDistance(
        x: number, y: number, centerX: number, centerY: number,
        halfWidth: number, halfHeight: number, radii: number[],
    ): number {
        if (halfWidth <= 0 || halfHeight <= 0) {
            return Number.POSITIVE_INFINITY;
        }
        const localX = x - centerX;
        const localY = y - centerY;
        const corner = localY < 0 ? (localX < 0 ? 0 : 1) : (localX < 0 ? 3 : 2);
        const r = Math.min(radii[corner], halfWidth, halfHeight);
        const qx = Math.abs(localX) - (halfWidth - r);
        const qy = Math.abs(localY) - (halfHeight - r);
        const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
        return outside + Math.min(Math.max(qx, qy), 0) - r;
    }

    private _edgeCoverage(distance: number): number {
        return Math.max(0, Math.min(1, 0.5 - distance));
    }

    private _mixColor(outer: Color, inner: Color, innerWeight: number): Color {
        if (innerWeight >= 1) return inner;
        if (innerWeight <= 0) return outer;
        // 依透明度加權混色：近乎透明的填色不能把邊框的 RGB 拉向自己
        const wo = outer.a * (1 - innerWeight);
        const wi = inner.a * innerWeight;
        const a = wo + wi;
        if (a <= 0) return new Color(0, 0, 0, 0);
        return new Color(
            Math.round((outer.r * wo + inner.r * wi) / a),
            Math.round((outer.g * wo + inner.g * wi) / a),
            Math.round((outer.b * wo + inner.b * wi) / a),
            Math.round(a),
        );
    }

    private _sampleColor(t: number): Color {
        const stops = this._stops;
        for (let i = 0; i < stops.length - 1; i++) {
            const left = stops[i];
            const right = stops[i + 1];
            if (t < left.offset || t > right.offset) {
                continue;
            }
            const span = Math.max(0.0001, right.offset - left.offset);
            const mix = Math.max(0, Math.min(1, (t - left.offset) / span));
            return new Color(
                Math.round(left.color.r + (right.color.r - left.color.r) * mix),
                Math.round(left.color.g + (right.color.g - left.color.g) * mix),
                Math.round(left.color.b + (right.color.b - left.color.b) * mix),
                Math.round(left.color.a + (right.color.a - left.color.a) * mix),
            );
        }
        return stops[stops.length - 1].color;
    }
}