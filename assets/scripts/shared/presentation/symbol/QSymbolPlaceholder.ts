/**
 * QSymbolPlaceholder.ts — 程式產生的純色幾何佔位圖集（圓、方、三角）
 *
 * 圖集 q-symbols.atlas：512×512，每格 64×64（QLIFE-01 §5.1）。格位 id 由 q-symbol-groups.json 的
 * atlas.parts 固定，之後美術的白色單通道圖直接蓋掉對應格位即可，程式不用改。
 * 純函式，不依賴 Cocos（Cocos 端只負責把像素包成 Texture2D）。
 */
import { PlaceholderShape, QSymbolData } from './types';

/** 圖形內縮邊距（像素），避免貼邊被裁 */
const MARGIN = 4;

/** 判斷格內像素 (px,py)（0～size-1）是否落在圖形內 */
export function insideShape(shape: PlaceholderShape, px: number, py: number, size: number): boolean {
    const c = (size - 1) / 2;
    const r = size / 2 - MARGIN;
    const dx = px - c;
    const dy = py - c;
    switch (shape) {
        case 'circle':
            return dx * dx + dy * dy <= r * r;
        case 'square':
            return Math.abs(dx) <= r && Math.abs(dy) <= r;
        case 'triangle': {
            // 尖端朝上：從頂 (y=-r) 到底 (y=+r)，半寬隨 y 線性增加
            if (dy < -r || dy > r) return false;
            const half = ((dy + r) / (2 * r)) * r;
            return Math.abs(dx) <= half;
        }
    }
}

/** 單格 RGBA 像素（白色＋alpha 形狀），給 Sprite.color 上色 */
export function makeCellPixels(shape: PlaceholderShape, size: number): Uint8Array {
    const out = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const o = (y * size + x) * 4;
            out[o] = 255;
            out[o + 1] = 255;
            out[o + 2] = 255;
            out[o + 3] = insideShape(shape, x, y, size) ? 255 : 0;
        }
    }
    return out;
}

/** 格位 → 圖集內像素矩形（左上原點，y 向下） */
export function cellRect(cell: number, cellSize: number, columns: number): { x: number; y: number; w: number; h: number } {
    return { x: (cell % columns) * cellSize, y: Math.floor(cell / columns) * cellSize, w: cellSize, h: cellSize };
}

/** 把所有部件畫進整張圖集的 RGBA 像素 */
export function buildPlaceholderAtlas(data: QSymbolData): { width: number; height: number; pixels: Uint8Array } {
    const { cellSize, columns, parts } = data.atlas;
    const width = cellSize * columns;
    const pixels = new Uint8Array(width * width * 4);
    for (const def of Object.values(parts)) {
        const cell = makeCellPixels(def.shape, cellSize);
        const r = cellRect(def.cell, cellSize, columns);
        for (let y = 0; y < cellSize; y++) {
            const src = y * cellSize * 4;
            const dst = ((r.y + y) * width + r.x) * 4;
            pixels.set(cell.subarray(src, src + cellSize * 4), dst);
        }
    }
    return { width, height: width, pixels };
}
