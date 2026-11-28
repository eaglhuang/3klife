/**
 * QFacePlaceholder.ts — 程式產生的臉部部件佔位圖集（眼、嘴、紅暈、標記）
 *
 * 圖集 512×512，每格 32×32（QFACE-01 §2.2）。格位 id 由 q-face-expressions.json 的 atlas.parts 與
 * partSets 固定（全域格位 = partSet 序 × setStride + 部件格位），之後 Codex 的白色單通道圖直接蓋掉
 * 對應格位即可，程式不用改。純函式，不依賴 Cocos（Cocos 端只負責把像素包成 Texture2D）。
 * 佔位圖全為白色＋alpha 形狀，由 Sprite.color 乘上 eyeColor。
 */
import { PlaceholderShape, QFaceData } from './types';

/** 線寬（像素，以 32 格為基準） */
const LINE = 2.2;

function dist(x: number, y: number, cx: number, cy: number): number {
    return Math.hypot(x - cx, y - cy);
}

/** 沿圓弧的線（角度為數學座標，y 向上；a0～a1 度） */
function onArc(x: number, y: number, cx: number, cy: number, r: number, a0: number, a1: number): boolean {
    if (Math.abs(dist(x, y, cx, cy) - r) > LINE / 2) return false;
    let a = (Math.atan2(-(y - cy), x - cx) * 180) / Math.PI;
    if (a < 0) a += 360;
    return a >= a0 && a <= a1;
}

function onSegment(x: number, y: number, x0: number, y0: number, x1: number, y1: number): boolean {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
    return dist(x, y, x0 + t * dx, y0 + t * dy) <= LINE / 2;
}

/** 判斷格內像素 (px,py)（0～size-1，左上原點）是否落在圖形內。座標先正規化到 32 格再比較 */
export function insideFaceShape(shape: PlaceholderShape, px: number, py: number, size: number): boolean {
    const k = 32 / size;
    const x = (px + 0.5) * k;
    const y = (py + 0.5) * k;
    const c = 16;
    switch (shape) {
        case 'ring':
            return Math.abs(dist(x, y, c, c) - 8) <= LINE / 2;
        case 'ring_side':
            return Math.abs(dist(x, y, c, c) - 8) <= LINE / 2 || dist(x, y, c + 4, c) <= 3;
        case 'disc':
            return dist(x, y, c, c) <= 10;
        case 'bar':
            return Math.abs(y - c) <= LINE / 2 && x >= 6 && x <= 26;
        case 'arc_up':
            // 上拱（笑眼、微笑用：^ 形與 U 形都歸這格，美術再換）
            return onArc(x, y, c, c + 6, 10, 20, 160);
        case 'arc_down':
            return onArc(x, y, c, c - 6, 10, 200, 340);
        case 'slash':
            return onSegment(x, y, 6, 10, 26, 20);
        case 'droop':
            return onSegment(x, y, 6, 20, 26, 12) || dist(x, y, 20, 24) <= 2.5;
        case 'spiral': {
            const r = dist(x, y, c, c);
            let a = Math.atan2(y - c, x - c);
            if (a < 0) a += Math.PI * 2;
            // 阿基米德螺線：r = 2 + 1.6*θ（兩圈）
            for (let turn = 0; turn < 2; turn++) {
                if (Math.abs(r - (1 + 1.1 * (a + turn * Math.PI * 2))) <= LINE / 2) return true;
            }
            return false;
        }
        case 'half':
            return onArc(x, y, c, c, 8, 180, 360) || (Math.abs(y - c) <= LINE / 2 && Math.abs(x - c) <= 8);
        case 'heart': {
            const hx = (x - c) / 9;
            const hy = -(y - c + 1) / 9;
            const v = hx * hx + hy * hy - 1;
            return v * v * v - hx * hx * hy * hy * hy <= 0;
        }
        case 'ellipse_s':
            return ((x - c) / 5) ** 2 + ((y - c) / 3) ** 2 <= 1;
        case 'ellipse_m':
            return ((x - c) / 7) ** 2 + ((y - c) / 5) ** 2 <= 1;
        case 'ellipse_l':
            return ((x - c) / 9) ** 2 + ((y - c) / 8) ** 2 <= 1;
        case 'wave':
            return x >= 5 && x <= 27 && Math.abs(y - (c + 3 * Math.sin(((x - 5) / 22) * Math.PI * 4))) <= LINE / 2;
        case 'drop':
            return dist(x, y, c, 20) <= 5 || (y >= 6 && y <= 20 && Math.abs(x - c) <= ((y - 6) / 14) * 5);
        case 'cross':
            return onSegment(x, y, 8, 8, 24, 24) || onSegment(x, y, 24, 8, 8, 24);
        case 'star': {
            const dx = x - c;
            const dy = y - c;
            const r = Math.hypot(dx, dy);
            const a = Math.atan2(dy, dx) + Math.PI / 2;
            const seg = (Math.PI * 2) / 5;
            const m = Math.abs(((a % seg) + seg) % seg - seg / 2) / (seg / 2);
            return r <= 5 + 7 * m;
        }
    }
}

/** 單格 RGBA 像素（白色＋alpha 形狀） */
export function makeFaceCellPixels(shape: PlaceholderShape, size: number): Uint8Array {
    const out = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const o = (y * size + x) * 4;
            out[o] = 255;
            out[o + 1] = 255;
            out[o + 2] = 255;
            out[o + 3] = insideFaceShape(shape, x, y, size) ? 255 : 0;
        }
    }
    return out;
}

/** 全域格位 → 圖集內像素矩形（左上原點，y 向下） */
export function faceCellRect(cell: number, cellSize: number, columns: number): { x: number; y: number; w: number; h: number } {
    return { x: (cell % columns) * cellSize, y: Math.floor(cell / columns) * cellSize, w: cellSize, h: cellSize };
}

/** 把所有 partSet 的所有部件畫進整張圖集的 RGBA 像素（佔位圖每個 partSet 外觀相同） */
export function buildFacePlaceholderAtlas(data: QFaceData): { width: number; height: number; pixels: Uint8Array } {
    const { cellSize, columns, setStride, partSets, parts } = data.atlas;
    const width = cellSize * columns;
    const pixels = new Uint8Array(width * width * 4);
    const cells = new Map<string, Uint8Array>();
    for (let si = 0; si < partSets.length; si++) {
        for (const def of Object.values(parts)) {
            let cell = cells.get(def.shape);
            if (!cell) {
                cell = makeFaceCellPixels(def.shape, cellSize);
                cells.set(def.shape, cell);
            }
            const r = faceCellRect(si * setStride + def.cell, cellSize, columns);
            for (let y = 0; y < cellSize; y++) {
                const src = y * cellSize * 4;
                const dst = ((r.y + y) * width + r.x) * 4;
                pixels.set(cell.subarray(src, src + cellSize * 4), dst);
            }
        }
    }
    return { width, height: width, pixels };
}
