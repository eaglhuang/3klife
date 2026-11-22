// @spec-source: docs/cross-reference-index.md
/**
 * GradientNativeRaster — 用瀏覽器原生 canvas 漸層產生底板色（PROG-2-9802）
 * 量測：GradientBackground 逐像素迴圈（每像素算投影、內插、四捨五入）在開場與重載時仍約 180–200ms；
 * canvas 的 createLinearGradient／createRadialGradient 由原生程式碼填色，主執行緒只剩讀回像素。
 * 本檔不依賴 cc，沒有 canvas（非網頁環境、單元測試）時回傳 null，呼叫端退回逐像素迴圈。
 */

export interface NativeGradientStop {
    r: number;
    g: number;
    b: number;
    a: number;
    offset: number;
}

export interface NativeGradientSpec {
    type: 'linear' | 'radial';
    /** UI 邏輯尺寸（角度、投影、橢圓半徑都以此計） */
    width: number;
    height: number;
    /** 貼圖像素尺寸（可小於 UI 尺寸） */
    textureWidth: number;
    textureHeight: number;
    /** 線性：CSS 角度（度） */
    angle: number;
    /** 線性：四角在漸層方向上的投影範圍，與逐像素版相同 */
    minProjection: number;
    maxProjection: number;
    /** 放射：圓心與半徑（皆為 0~1 比例） */
    centerX: number;
    centerY: number;
    radiusX: number;
    radiusY: number;
    stops: NativeGradientStop[];
}

/** 內插空間差異補償：canvas 以未預乘透明度內插，CSS 與逐像素版以預乘內插，每段拆成這麼多小段逼近 */
const PREMULTIPLY_SUBDIVISIONS = 16;

type Canvas2D = {
    canvas: { width: number; height: number };
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
    createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradientLike;
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradientLike;
    clearRect(x: number, y: number, w: number, h: number): void;
    fillRect(x: number, y: number, w: number, h: number): void;
    getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray };
    fillStyle: unknown;
};
interface CanvasGradientLike { addColorStop(offset: number, color: string): void }

export type NativeContextFactory = (width: number, height: number) => Canvas2D | null;

let sharedContext: Canvas2D | null = null;
let sharedUnavailable = false;

/** 預設工廠：優先 OffscreenCanvas，其次 document 的 canvas；兩者都沒有回傳 null。共用同一張畫布避免反覆配置 */
const defaultFactory: NativeContextFactory = (width, height) => {
    if (sharedUnavailable) return null;
    try {
        if (!sharedContext) {
            const g = globalThis as any;
            let canvas: any = null;
            if (typeof g.document?.createElement === 'function') {
                canvas = g.document.createElement('canvas');
            } else if (typeof g.OffscreenCanvas === 'function') {
                canvas = new g.OffscreenCanvas(width, height);
            }
            const ctx = canvas?.getContext?.('2d', { willReadFrequently: true }) as Canvas2D | null | undefined;
            if (!ctx) {
                sharedUnavailable = true;
                return null;
            }
            sharedContext = ctx;
        }
        sharedContext.canvas.width = width;
        sharedContext.canvas.height = height;
        return sharedContext;
    } catch {
        sharedUnavailable = true;
        return null;
    }
};

function cssColor(r: number, g: number, b: number, a: number): string {
    return `rgba(${r},${g},${b},${(a / 255).toFixed(5)})`;
}

/**
 * 把色標轉成 canvas 色標。RGB 與透明度都不同的相鄰色標之間，用 sample（預乘內插結果）補中間色標，
 * 讓 canvas 的未預乘內插逼近 CSS 預乘內插。sample(t, out) 需與逐像素版一致。
 */
export function buildCanvasStops(
    stops: NativeGradientStop[],
    sample: (t: number, out: number[]) => void,
): Array<{ offset: number; color: string }> {
    const result: Array<{ offset: number; color: string }> = [];
    const tmp = [0, 0, 0, 0];
    for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        if (i > 0) {
            const prev = stops[i - 1];
            const needsSubdivide = prev.a !== stop.a
                && (prev.r !== stop.r || prev.g !== stop.g || prev.b !== stop.b)
                && stop.offset > prev.offset;
            if (needsSubdivide) {
                for (let k = 1; k < PREMULTIPLY_SUBDIVISIONS; k++) {
                    const t = prev.offset + (stop.offset - prev.offset) * (k / PREMULTIPLY_SUBDIVISIONS);
                    sample(t, tmp);
                    result.push({ offset: t, color: cssColor(tmp[0], tmp[1], tmp[2], tmp[3]) });
                }
            }
        }
        result.push({ offset: stop.offset, color: cssColor(stop.r, stop.g, stop.b, stop.a) });
    }
    return result;
}

/**
 * 以原生 canvas 填出漸層色（未套圓角、邊框、整體透明度），回傳 RGBA 一維陣列；沒有 canvas 或失敗回傳 null。
 * 重複漸層由呼叫端決定不走這條路。
 */
export function rasterizeNativeGradient(
    spec: NativeGradientSpec,
    sample: (t: number, out: number[]) => void,
    factory: NativeContextFactory = defaultFactory,
): Uint8ClampedArray | null {
    const { textureWidth, textureHeight, width, height } = spec;
    if (!(textureWidth > 0 && textureHeight > 0 && width > 0 && height > 0)) return null;
    const range = spec.maxProjection - spec.minProjection;
    if (spec.type === 'linear' && !(range > 0.001)) return null;
    let ctx: Canvas2D | null = null;
    try {
        ctx = factory(textureWidth, textureHeight);
        if (!ctx) return null;
        // 以 UI 座標作畫，貼圖縮放交給畫布轉換；像素中心取樣與逐像素版 (pixel+0.5)/size 相同
        ctx.setTransform(textureWidth / width, 0, 0, textureHeight / height, 0, 0);
        ctx.clearRect(0, 0, width, height);
        let gradient: CanvasGradientLike;
        if (spec.type === 'linear') {
            const rad = (spec.angle * Math.PI) / 180;
            const dirX = Math.sin(rad);
            const dirY = -Math.cos(rad);
            const cx = width * 0.5;
            const cy = height * 0.5;
            gradient = ctx.createLinearGradient(
                cx + dirX * spec.minProjection, cy + dirY * spec.minProjection,
                cx + dirX * spec.maxProjection, cy + dirY * spec.maxProjection,
            );
        } else {
            // 橢圓：單位圓經轉換拉伸成橢圓
            const rx = Math.max(0.0001, spec.radiusX) * width;
            const ry = Math.max(0.0001, spec.radiusY) * height;
            ctx.setTransform(
                (textureWidth / width) * rx, 0, 0, (textureHeight / height) * ry,
                spec.centerX * textureWidth, spec.centerY * textureHeight,
            );
            gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        }
        for (const stop of buildCanvasStops(spec.stops, sample)) {
            gradient.addColorStop(Math.max(0, Math.min(1, stop.offset)), stop.color);
        }
        ctx.fillStyle = gradient;
        if (spec.type === 'linear') {
            ctx.fillRect(0, 0, width, height);
        } else {
            // 放射座標系的單位圓：填一個足夠大的矩形（含畫布外延伸色）
            const reach = 1e4;
            ctx.fillRect(-reach, -reach, reach * 2, reach * 2);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const image = ctx.getImageData(0, 0, textureWidth, textureHeight);
        return image.data;
    } catch {
        return null;
    }
}

/** 單元測試用：清掉共用畫布與「不可用」旗標，讓下一次重新偵測 canvas */
export function resetNativeGradientContextForTest(): void {
    sharedContext = null;
    sharedUnavailable = false;
}
