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

/**
 * 漸層貼圖共用快取（PROG-2-9800）：同參數同尺寸的底板只算一次、多個節點共用同一張 SpriteFrame。
 * 量測：每次 _redraw 都在 JS 逐像素算圖（1:1 圓角貼圖最大 1024 邊），開一個畫面連畫十幾次，主執行緒卡 2~4 秒，
 * 且每次新建的 Texture2D 從不釋放。現在：參數沒變不重畫、相同參數共用貼圖、無人使用的貼圖超過預算才依最久未用淘汰。
 */
interface GradientCacheEntry {
    frame: SpriteFrame;
    bytes: number;
    users: number;
    lastUsed: number;
}
const GRADIENT_CACHE_IDLE_BYTES = 48 * 1024 * 1024;
const gradientCache = new Map<string, GradientCacheEntry>();
let gradientCacheClock = 0;

function releaseGradientEntry(key: string | null): void {
    if (!key) return;
    const entry = gradientCache.get(key);
    if (!entry) return;
    entry.users = Math.max(0, entry.users - 1);
    entry.lastUsed = ++gradientCacheClock;
    trimGradientCache();
}

/** 只淘汰「沒有任何節點使用」的貼圖，使用中的永遠保留；超過閒置預算才動手 */
function trimGradientCache(): void {
    let idleBytes = 0;
    for (const entry of gradientCache.values()) {
        if (entry.users === 0) idleBytes += entry.bytes;
    }
    if (idleBytes <= GRADIENT_CACHE_IDLE_BYTES) return;
    const idle = Array.from(gradientCache.entries())
        .filter(([, entry]) => entry.users === 0)
        .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    for (const [key, entry] of idle) {
        if (idleBytes <= GRADIENT_CACHE_IDLE_BYTES) break;
        gradientCache.delete(key);
        idleBytes -= entry.bytes;
        const texture = entry.frame.texture as { destroy?: () => unknown } | null;
        try { entry.frame.destroy?.(); texture?.destroy?.(); } catch { /* 引擎已清掉就算了 */ }
    }
}

/** 本次算圖用的暫存：避免逐像素配置 Color／陣列 */
interface PixelRaster {
    width: number;
    height: number;
    halfWidth: number;
    halfHeight: number;
    outerRadii: number[];
    hasBorder: boolean;
    innerRadii: number[];
    innerCenterX: number;
    innerCenterY: number;
    innerHalfWidth: number;
    innerHalfHeight: number;
    /** 深內部快速通道：|x|、|y| 都在此範圍內的像素距離外緣至少 1 像素、離邊框內緣也至少 1 像素，覆蓋率必為 1，可跳過距離計算 */
    deepX: number;
    deepY: number;
    /** 邊框內緣的深內部範圍（無邊框時不使用） */
    innerDeepX: number;
    innerDeepY: number;
}

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
    /** 目前掛在 sprite 上的快取鍵；參數與尺寸沒變就不重畫 */
    private _cacheKey: string | null = null;
    private readonly _px: number[] = [0, 0, 0, 0];

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
        releaseGradientEntry(this._cacheKey);
        this._cacheKey = null;
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
        const alphaChanged = (color ? color.a : 255) !== this._tintColor.a;
        this._tintColor = color
            ? new Color(color.r, color.g, color.b, color.a)
            : new Color(255, 255, 255, 255);
        if (!this._sprite) return;
        if (alphaChanged) {
            this._redraw();
            return;
        }
        this._sprite.color = new Color(this._tintColor.r, this._tintColor.g, this._tintColor.b, 255);
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
        // 全透明色標借用最近的不透明色標 RGB：預乘內插下它的 RGB 本來就不影響結果，
        // 但貼圖以未預乘格式線性過濾時，透明像素的黑色會滲進邊緣，在漸層透明端畫出一條暗線
        return normalized.map((stop, index) => {
            if (stop.color.a > 0) return stop;
            const near = [...normalized.slice(index + 1), ...normalized.slice(0, index).reverse()]
                .sort((a, b) => Math.abs(a.offset - stop.offset) - Math.abs(b.offset - stop.offset))
                .find(other => other.color.a > 0);
            return near ? { offset: stop.offset, color: new Color(near.color.r, near.color.g, near.color.b, 0) } : stop;
        });
    }

    private _buildCacheKey(width: number, height: number): string {
        const stops = this._stops.map(stop => `${stop.color.r},${stop.color.g},${stop.color.b},${stop.color.a}@${stop.offset}`).join(';');
        const border = this._borderColor;
        const sides = this._borderSides;
        return [
            this._gradientType, width, height, this._angle, this._repeating ? 1 : 0, this._repeatSpanPx, this._repeatSpanRatio,
            this._radialCenterX, this._radialCenterY, this._radialRadiusX, this._radialRadiusY,
            stops, this._cornerRadius, this._borderWidth, `${border.r},${border.g},${border.b},${border.a}`,
            this._cornerRadii ? this._cornerRadii.join(',') : '-',
            sides ? `${sides.top},${sides.right},${sides.bottom},${sides.left}` : '-',
            this._tintColor.a,
        ].join('|');
    }

    private _redraw(): void {
        const sprite = this._sprite || this.getComponent(Sprite) || this.addComponent(Sprite);
        this._sprite = sprite;

        const transform = this.getComponent(UITransform);
        const width = Math.max(1, transform?.width || 1);
        const height = Math.max(1, transform?.height || 1);
        const key = this._buildCacheKey(width, height);
        // 參數與尺寸都沒變，且 sprite 還掛著上次的圖：不必重算（onLoad／onEnable／SIZE_CHANGED／setter 常連續觸發）
        if (key === this._cacheKey && sprite.spriteFrame && gradientCache.get(key)?.frame === sprite.spriteFrame) {
            sprite.enabled = true;
            sprite.color = new Color(this._tintColor.r, this._tintColor.g, this._tintColor.b, 255);
            return;
        }

        let entry = gradientCache.get(key);
        if (!entry) {
            const frame = this._rasterize(width, height);
            entry = { frame, bytes: (frame.rect?.width ?? 0) * (frame.rect?.height ?? 0) * 4, users: 0, lastUsed: 0 };
            gradientCache.set(key, entry);
        }
        // 先佔新的、再放掉舊的：新舊同鍵時使用數不會短暫歸零被淘汰
        entry.users += 1;
        entry.lastUsed = ++gradientCacheClock;
        releaseGradientEntry(this._cacheKey);
        this._cacheKey = key;

        sprite.enabled = true;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.type = Sprite.Type.SIMPLE;
        sprite.spriteFrame = entry.frame;
        sprite.color = new Color(this._tintColor.r, this._tintColor.g, this._tintColor.b, 255);
    }

    private _rasterize(width: number, height: number): SpriteFrame {
        // 有圓角或邊框時邊緣需逐像素反鋸齒，貼圖改 1:1；純漸層可低解析度放大。
        const hasEdge = this._cornerRadius > 0 || this._borderWidth > 0 || !!this._cornerRadii || !!this._borderSides;
        const maxTextureSide = hasEdge
            ? Math.max(2, Math.min(EDGE_TEXTURE_MAX_SIDE, Math.ceil(Math.max(width, height))))
            : Math.max(64, Math.min(256, Math.round(Math.max(width, height) / 6)));
        const aspect = width / height;
        const textureWidth = aspect >= 1 ? maxTextureSide : Math.max(2, Math.round(maxTextureSide * aspect));
        const textureHeight = aspect >= 1 ? Math.max(2, Math.round(maxTextureSide / aspect)) : maxTextureSide;
        const data = new Uint8Array(textureWidth * textureHeight * 4);
        const tintAlpha = this._tintColor.a / 255;

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

        const raster = this._buildRaster(width, height);
        const px = this._px;
        const radial = this._gradientType === 'radial';
        for (let pixelY = 0; pixelY < textureHeight; pixelY++) {
            const normalizedY = (pixelY + 0.5) / textureHeight;
            const uiY = normalizedY * height - height * 0.5;
            for (let pixelX = 0; pixelX < textureWidth; pixelX++) {
                const normalizedX = (pixelX + 0.5) / textureWidth;
                const uiX = normalizedX * width - width * 0.5;
                const t = radial
                    ? this._sampleRadialT(normalizedX, normalizedY)
                    : this._sampleLinearT(uiX * dirX + uiY * dirY, minProjection, maxProjection);
                this._shadePixel(t, uiX, uiY, raster, px);
                const index = (pixelY * textureWidth + pixelX) * 4;
                data[index] = px[0];
                data[index + 1] = px[1];
                data[index + 2] = px[2];
                // 透明度烘進像素：寫進 sprite.color 的話 Cocos 會乘給子節點，文字一起變暗
                data[index + 3] = Math.round(px[3] * tintAlpha);
            }
        }

        const texture = new Texture2D();
        texture.reset({ width: textureWidth, height: textureHeight, format: Texture2D.PixelFormat.RGBA8888 });
        texture.uploadData(data);
        // 1:1 邊緣貼圖已自行反鋸齒；線性過濾會在未預乘的邊框與半透明填色之間內插出灰白色
        // 測試用 cc 型別樁沒有 Filter 列舉，經 any 取用
        const nearest = (Texture2D as any).Filter?.NEAREST;
        if (hasEdge && nearest !== undefined) texture.setFilters(nearest, nearest);
        // 預設包覆是重複：線性過濾時邊緣像素會混到對邊顏色，漸層透明端出現一條暗線（例如邊緣漸暗層的內緣）
        const clamp = (Texture2D as any).WrapMode?.CLAMP_TO_EDGE;
        if (clamp !== undefined) texture.setWrapMode(clamp, clamp);
        (texture as any).loaded = true;

        const frame = new SpriteFrame();
        frame.packable = false;
        frame.rect = new Rect(0, 0, textureWidth, textureHeight);
        frame.texture = texture;
        return frame;
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

    /** 每次算圖只算一次的圓角／邊框幾何，逐像素不再配置陣列 */
    private _buildRaster(width: number, height: number): PixelRaster {
        const halfWidth = width * 0.5;
        const halfHeight = height * 0.5;
        // 角序：左上、右上、右下、左下（uiY 負值為上方）
        const outerRadii = (this._cornerRadii || [this._cornerRadius, this._cornerRadius, this._cornerRadius, this._cornerRadius])
            .map(value => Math.min(value, halfWidth, halfHeight));
        const fallback = Math.min(this._borderWidth, halfWidth, halfHeight);
        const sides = this._borderSides || { top: fallback, right: fallback, bottom: fallback, left: fallback };
        const hasBorder = !!(sides.top || sides.right || sides.bottom || sides.left) && this._borderColor.a > 0;
        const innerRadii = [
            Math.max(0, outerRadii[0] - Math.max(sides.top, sides.left)),
            Math.max(0, outerRadii[1] - Math.max(sides.top, sides.right)),
            Math.max(0, outerRadii[2] - Math.max(sides.bottom, sides.right)),
            Math.max(0, outerRadii[3] - Math.max(sides.bottom, sides.left)),
        ];
        const innerHalfWidth = Math.max(0, halfWidth - (sides.left + sides.right) * 0.5);
        const innerHalfHeight = Math.max(0, halfHeight - (sides.top + sides.bottom) * 0.5);
        const maxOuterRadius = Math.max(...outerRadii);
        const maxInnerRadius = Math.max(...innerRadii);
        return {
            width, height, halfWidth, halfHeight, outerRadii, hasBorder,
            innerRadii,
            innerCenterX: (sides.left - sides.right) * 0.5,
            innerCenterY: (sides.top - sides.bottom) * 0.5,
            innerHalfWidth,
            innerHalfHeight,
            deepX: halfWidth - maxOuterRadius - 1,
            deepY: halfHeight - maxOuterRadius - 1,
            innerDeepX: innerHalfWidth - maxInnerRadius - 1,
            innerDeepY: innerHalfHeight - maxInnerRadius - 1,
        };
    }

    /** 算單一像素顏色寫進 out[r,g,b,a]（不配置物件） */
    private _shadePixel(t: number, uiX: number, uiY: number, raster: PixelRaster, out: number[]): void {
        // 深內部：離外緣與邊框內緣都至少 1 像素的像素覆蓋率必為 1，只需取漸層色（結果與完整計算逐位元相同）
        const absX = uiX < 0 ? -uiX : uiX;
        const absY = uiY < 0 ? -uiY : uiY;
        if (absX <= raster.deepX && absY <= raster.deepY) {
            if (!raster.hasBorder) {
                this._sampleColorInto(t, out);
                return;
            }
            // 邊框內緣中心可能偏移（四邊寬度不同）；內緣半寬為 0 時距離為無限大，不走快速通道
            const inX = uiX - raster.innerCenterX;
            const inY = uiY - raster.innerCenterY;
            if (raster.innerHalfWidth > 0 && raster.innerHalfHeight > 0
                && (inX < 0 ? -inX : inX) <= raster.innerDeepX && (inY < 0 ? -inY : inY) <= raster.innerDeepY) {
                this._sampleColorInto(t, out);
                return;
            }
        }
        // 以有號距離算邊緣覆蓋率（約 1 像素過渡），取代二值內外判斷避免鋸齒。
        const outerCoverage = this._edgeCoverage(this._roundedRectDistance(uiX, uiY, 0, 0, raster.halfWidth, raster.halfHeight, raster.outerRadii));
        if (outerCoverage <= 0) {
            out[0] = 0; out[1] = 0; out[2] = 0; out[3] = 0;
            return;
        }

        this._sampleColorInto(t, out);
        if (raster.hasBorder) {
            const innerDistance = this._roundedRectDistance(
                uiX, uiY, raster.innerCenterX, raster.innerCenterY,
                raster.innerHalfWidth, raster.innerHalfHeight, raster.innerRadii,
            );
            this._mixBorderInto(this._borderColor, out, this._edgeCoverage(innerDistance));
        }
        if (outerCoverage < 1) out[3] = Math.round(out[3] * outerCoverage);
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

    /** 邊框色（外）與填色 out（內）依內側權重混合，結果寫回 out */
    private _mixBorderInto(outer: Color, out: number[], innerWeight: number): void {
        if (innerWeight >= 1) return;
        if (innerWeight <= 0) {
            out[0] = outer.r; out[1] = outer.g; out[2] = outer.b; out[3] = outer.a;
            return;
        }
        // 依透明度加權混色：近乎透明的填色不能把邊框的 RGB 拉向自己
        const wo = outer.a * (1 - innerWeight);
        const wi = out[3] * innerWeight;
        const a = wo + wi;
        if (a <= 0) {
            out[0] = 0; out[1] = 0; out[2] = 0; out[3] = 0;
            return;
        }
        out[0] = Math.round((outer.r * wo + out[0] * wi) / a);
        out[1] = Math.round((outer.g * wo + out[1] * wi) / a);
        out[2] = Math.round((outer.b * wo + out[2] * wi) / a);
        out[3] = Math.round(a);
    }

    private _sampleColorInto(t: number, out: number[]): void {
        const stops = this._stops;
        for (let i = 0; i < stops.length - 1; i++) {
            const left = stops[i];
            const right = stops[i + 1];
            if (t < left.offset || t > right.offset) {
                continue;
            }
            const span = Math.max(0.0001, right.offset - left.offset);
            const mix = Math.max(0, Math.min(1, (t - left.offset) / span));
            // 照 CSS 規範在預乘透明度空間內插：直接內插 RGB 會讓近透明的淺色端把高透明度區染亮
            const lc = left.color;
            const rc = right.color;
            const la = lc.a;
            const ra = rc.a;
            const a = la + (ra - la) * mix;
            if (a <= 0) {
                out[0] = lc.r; out[1] = lc.g; out[2] = lc.b; out[3] = 0;
                return;
            }
            out[0] = Math.round((lc.r * la + (rc.r * ra - lc.r * la) * mix) / a);
            out[1] = Math.round((lc.g * la + (rc.g * ra - lc.g * la) * mix) / a);
            out[2] = Math.round((lc.b * la + (rc.b * ra - lc.b * la) * mix) / a);
            out[3] = Math.round(a);
            return;
        }
        const last = stops[stops.length - 1].color;
        out[0] = last.r; out[1] = last.g; out[2] = last.b; out[3] = last.a;
    }
}
