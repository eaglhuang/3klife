/**
 * GradientNativeRaster.test.ts — 漸層底板原生 canvas 化（PROG-2-9802）
 * 用「照 HTML 規格實作的迷你 canvas」跑原生路徑，與逐像素迴圈逐像素比對（平均誤差 ≤2/255）；
 * 無 canvas 環境必須退回逐像素迴圈。
 */
import { Color, Sprite, Texture2D, UITransform } from 'cc';
import { GradientBackground, clearGradientCacheForTest } from '../assets/scripts/ui/components/GradientBackground';
import { buildCanvasStops, rasterizeNativeGradient, resetNativeGradientContextForTest } from '../assets/scripts/ui/components/GradientNativeRaster';
import { TestSuite, assert } from './TestRunner';

interface FakeStop { offset: number; rgba: number[] }

/** 迷你 2D 畫布：只支援縮放＋平移轉換、線性／放射漸層、整張 fillRect；漸層以未預乘 RGBA 內插（HTML 規格） */
function createFakeCanvasContext(): any {
    const ctx: any = {
        canvas: { width: 0, height: 0 },
        transform: [1, 0, 0, 1, 0, 0],
        fill: null,
        calls: [] as string[],
        setTransform(a: number, _b: number, _c: number, d: number, e: number, f: number) { this.transform = [a, 0, 0, d, e, f]; },
        clearRect() { /* 起始即透明 */ },
        createLinearGradient(x0: number, y0: number, x1: number, y1: number) { return makeGradient('linear', [x0, y0, x1, y1]); },
        createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) { return makeGradient('radial', [x0, y0, r0, x1, y1, r1]); },
        fillRect() { ctx.calls.push('fillRect'); ctx.filled = { transform: ctx.transform.slice(), style: ctx.fillStyle }; },
        getImageData(_x: number, _y: number, w: number, h: number) {
            const data = new Uint8ClampedArray(w * h * 4);
            // 真實 canvas 在 fillRect 當下就以當時的轉換光柵化
            const [sx, , , sy, tx, ty] = ctx.filled.transform;
            const g = ctx.filled.style;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const ux = (x + 0.5 - tx) / sx;
                    const uy = (y + 0.5 - ty) / sy;
                    const c = g.colorAt(g.paramAt(ux, uy));
                    const i = (y * w + x) * 4;
                    data[i] = Math.round(c[0]); data[i + 1] = Math.round(c[1]); data[i + 2] = Math.round(c[2]); data[i + 3] = Math.round(c[3] * 255);
                }
            }
            return { data };
        },
    };
    function makeGradient(kind: 'linear' | 'radial', p: number[]) {
        const stops: FakeStop[] = [];
        return {
            addColorStop(offset: number, css: string) {
                const m = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(css)!;
                stops.push({ offset, rgba: [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] });
            },
            paramAt(x: number, y: number) {
                if (kind === 'linear') {
                    const dx = p[2] - p[0]; const dy = p[3] - p[1];
                    return ((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy);
                }
                return Math.hypot(x - p[0], y - p[1]) / p[5];
            },
            colorAt(t: number) {
                t = Math.max(0, Math.min(1, t));
                for (let i = 0; i < stops.length - 1; i++) {
                    const a = stops[i]; const b = stops[i + 1];
                    if (t < a.offset || t > b.offset) continue;
                    const m = b.offset === a.offset ? 0 : (t - a.offset) / (b.offset - a.offset);
                    return a.rgba.map((v, k) => v + (b.rgba[k] - v) * m);
                }
                return stops[stops.length - 1].rgba;
            },
        };
    }
    return ctx;
}

function installCanvas(): { ctx: any; restore: () => void } {
    const ctx = createFakeCanvasContext();
    const g = globalThis as any;
    const prev = g.document;
    g.document = { createElement: () => ({ getContext: () => ctx }) };
    resetNativeGradientContextForTest();
    return { ctx, restore: () => { g.document = prev; resetNativeGradientContextForTest(); } };
}

function prepare(): { uploads: Uint8Array[] } {
    const uploads: Uint8Array[] = [];
    const spriteStatics = Sprite as any;
    spriteStatics.SizeMode = spriteStatics.SizeMode ?? { CUSTOM: 0 };
    spriteStatics.Type = spriteStatics.Type ?? { SIMPLE: 0 };
    const textureStatics = Texture2D as any;
    textureStatics.PixelFormat = textureStatics.PixelFormat ?? { RGBA8888: 0 };
    textureStatics.prototype.reset = () => undefined;
    textureStatics.prototype.uploadData = (data: Uint8Array) => { uploads.push(data); };
    return { uploads };
}

function rasterWith(width: number, height: number, setup: (g: GradientBackground) => void): Uint8Array {
    const { uploads } = prepare();
    clearGradientCacheForTest();
    const sprite = new Sprite();
    sprite.color = new Color(255, 255, 255, 255);
    const transform = { width, height };
    const gradient = new GradientBackground();
    (gradient as any).node = { on: () => undefined, off: () => undefined };
    (gradient as any).getComponent = (type: unknown) => (type === Sprite ? sprite : type === UITransform ? transform : null);
    setup(gradient);
    return uploads[uploads.length - 1];
}

function meanAbsError(a: Uint8Array, b: Uint8Array): number {
    assert.equals(a.length, b.length, '貼圖尺寸相同');
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
    return sum / a.length;
}

/** 同一組參數：先在無 canvas 環境跑逐像素迴圈，再在有 canvas 的環境跑原生路徑，回傳平均絕對誤差 */
function compareNativeVsLoop(setup: (g: GradientBackground) => void, width = 320, height = 200): number {
    const g = globalThis as any;
    const prev = g.document;
    g.document = undefined;
    resetNativeGradientContextForTest();
    let loop: Uint8Array;
    try { loop = rasterWith(width, height, setup); } finally { g.document = prev; resetNativeGradientContextForTest(); }
    const { ctx, restore } = installCanvas();
    try {
        const native = rasterWith(width, height, setup);
        assert.isTrue(ctx.calls.length > 0, '走了原生 canvas 路徑');
        return meanAbsError(native, loop);
    } finally { restore(); }
}

const RED = new Color(255, 0, 0, 255);
const BLUE = new Color(0, 0, 255, 255);

export function createGradientNativeRasterSuite(): TestSuite {
    const suite = new TestSuite('GradientNativeRaster (漸層原生 canvas PROG-2-9802)');

    suite.test('沒有 canvas：回傳 null，GradientBackground 退回逐像素迴圈仍產出貼圖', () => {
        const g = globalThis as any;
        const prev = g.document;
        g.document = undefined;
        resetNativeGradientContextForTest();
        try {
            const out = rasterizeNativeGradient({
                type: 'linear', width: 100, height: 100, textureWidth: 64, textureHeight: 64, angle: 90,
                minProjection: -50, maxProjection: 50, centerX: 0.5, centerY: 0.5, radiusX: 0.5, radiusY: 0.5,
                stops: [{ r: 255, g: 0, b: 0, a: 255, offset: 0 }, { r: 0, g: 0, b: 255, a: 255, offset: 1 }],
            }, () => undefined);
            assert.equals(out, null, '無 canvas 回傳 null');
            const data = rasterWith(333, 111, gr => gr.setLinearGradient(90, [{ color: RED, offset: 0 }, { color: BLUE, offset: 1 }]));
            assert.isTrue(data.length > 0, '逐像素迴圈有產出');
        } finally { g.document = prev; resetNativeGradientContextForTest(); }
    });

    suite.test('工廠丟例外或回傳 null：安靜回傳 null', () => {
        const spec: any = { type: 'linear', width: 10, height: 10, textureWidth: 8, textureHeight: 8, angle: 0, minProjection: -5, maxProjection: 5, stops: [] };
        assert.equals(rasterizeNativeGradient(spec, () => undefined, () => { throw new Error('boom'); }), null);
        assert.equals(rasterizeNativeGradient(spec, () => undefined, () => null), null);
    });

    suite.test('色標：RGB 與透明度都不同的相鄰色標之間補中間色標，其餘不補', () => {
        const sample = (t: number, out: number[]) => { out[0] = 10; out[1] = 20; out[2] = 30; out[3] = Math.round(t * 255); };
        const plain = buildCanvasStops([
            { r: 255, g: 0, b: 0, a: 255, offset: 0 }, { r: 0, g: 0, b: 255, a: 255, offset: 1 },
        ], sample);
        assert.equals(plain.length, 2, '不透明兩色不補');
        const sameRgb = buildCanvasStops([
            { r: 9, g: 9, b: 9, a: 0, offset: 0 }, { r: 9, g: 9, b: 9, a: 255, offset: 1 },
        ], sample);
        assert.equals(sameRgb.length, 2, '同 RGB 只變透明度不補');
        const mixed = buildCanvasStops([
            { r: 255, g: 255, b: 255, a: 255, offset: 0 }, { r: 0, g: 0, b: 0, a: 0, offset: 0.5 }, { r: 0, g: 0, b: 0, a: 0, offset: 1 },
        ], sample);
        assert.isTrue(mixed.length > 3, '預乘內插差異段有補點');
        assert.isTrue(mixed.every((s, i) => i === 0 || s.offset >= mixed[i - 1].offset), '色標 offset 單調');
    });

    suite.test('線性漸層（斜角、三色標）：原生與逐像素平均誤差 ≤2/255', () => {
        const err = compareNativeVsLoop(g => g.setLinearGradient(133, [
            { color: new Color(255, 200, 0, 255), offset: 0 }, { color: new Color(20, 40, 160, 255), offset: 0.4 }, { color: new Color(0, 0, 0, 255), offset: 1 },
        ]));
        assert.isTrue(err <= 2, `平均誤差 ${err.toFixed(3)} 需 ≤2`);
    });

    suite.test('線性漸層（含透明度、圓角、邊框）：平均誤差 ≤2/255', () => {
        const err = compareNativeVsLoop(g => g.setLinearGradient(180, [
            { color: new Color(255, 255, 255, 230), offset: 0 }, { color: new Color(30, 20, 10, 40), offset: 1 },
        ], { cornerRadius: 24, borderWidth: 3, borderColor: new Color(212, 175, 55, 255) }));
        assert.isTrue(err <= 2, `平均誤差 ${err.toFixed(3)} 需 ≤2`);
    });

    suite.test('放射漸層（偏心橢圓）：平均誤差 ≤2/255', () => {
        const err = compareNativeVsLoop(g => g.setRadialGradient([
            { color: new Color(255, 240, 200, 255), offset: 0 }, { color: new Color(60, 30, 10, 255), offset: 0.7 }, { color: new Color(0, 0, 0, 0), offset: 1 },
        ], { center: { x: 0.3, y: 0.6 }, radius: { x: 0.6, y: 0.4 } }));
        assert.isTrue(err <= 2, `平均誤差 ${err.toFixed(3)} 需 ≤2`);
    });

    suite.test('重複漸層不走原生路徑', () => {
        const { ctx, restore } = installCanvas();
        try {
            rasterWith(280, 160, g => g.setLinearGradient(90, [{ color: RED, offset: 0 }, { color: BLUE, offset: 1 }], { repeating: true, repeatSpanPx: 20 }));
            assert.equals(ctx.calls.length, 0, '重複漸層沒有呼叫 canvas');
        } finally { restore(); }
    });

    return suite;
}
