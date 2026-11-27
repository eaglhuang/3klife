/**
 * QSymbolData.ts — q-symbol-groups.json 解析驗證、元素規劃、心情乘色（QLIFE-01 §5.4、§5.6）
 *
 * 純邏輯。加新活動／符號組只改 JSON，這裡只負責檢查引用是否完整。
 */
import { layerCount, partOf } from './QSymbolMotion';
import {
    ActivityDef, AtlasPartDef, PlaceholderShape, QSymbolData, SymbolDef, SymbolLayerDef, SymbolLod, SYMBOL_MOTIONS,
} from './types';

/** 符號元素基準尺寸：1 倍 = 0.5 個頭高 */
export const SYMBOL_BASE_SIZE_H = 0.5;
/** 武器符號的代換佔位名（S02 用） */
export const WEAPON_PART = 'weapon_by_general';
/** 預設武器部件（武將沒指定時） */
export const DEFAULT_WEAPON_PART = 'weapon_sword';

const SHAPES: readonly PlaceholderShape[] = ['circle', 'square', 'triangle'];

function isObj(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normSymbol(id: string, raw: unknown, parts: Record<string, AtlasPartDef>): SymbolDef {
    if (!isObj(raw) || !Array.isArray(raw.layers) || raw.layers.length === 0) {
        throw new Error(`符號組 ${id}：缺 layers`);
    }
    const layers = raw.layers as SymbolLayerDef[];
    layers.forEach((l, idx) => {
        if (!SYMBOL_MOTIONS.includes(l.motion)) throw new Error(`符號組 ${id} 圖層 ${idx}：未知 motion ${String(l.motion)}`);
        const names = Array.isArray(l.part) ? l.part : [l.part];
        if (names.length === 0) throw new Error(`符號組 ${id} 圖層 ${idx}：part 為空`);
        for (const p of names) {
            if (p !== WEAPON_PART && !parts[p]) throw new Error(`符號組 ${id} 圖層 ${idx}：圖集沒有部件 ${p}`);
        }
    });
    const lod1 = raw.lod1 === 'staticFirst' ? 'staticFirst' : 'primary';
    const lod2 = raw.lod2 === 'hide' ? 'hide' : 'static';
    return { layers, tint: typeof raw.tint === 'string' ? raw.tint : '#FFFFFF', lod1, lod2 };
}

/** 解析並驗證 q-symbol-groups.json（壞資料直接丟錯，不靜默吞掉） */
export function parseSymbolData(raw: unknown): QSymbolData {
    if (!isObj(raw)) throw new Error('q-symbol-groups：根必須是物件');
    const atlasRaw = raw.atlas;
    if (!isObj(atlasRaw) || !isObj(atlasRaw.parts)) throw new Error('q-symbol-groups：缺 atlas.parts');
    const cellSize = typeof atlasRaw.cellSize === 'number' ? atlasRaw.cellSize : 64;
    const columns = typeof atlasRaw.columns === 'number' ? atlasRaw.columns : 8;
    const parts: Record<string, AtlasPartDef> = {};
    const usedCells = new Set<number>();
    for (const [name, p] of Object.entries(atlasRaw.parts)) {
        const def = p as AtlasPartDef;
        if (!isObj(def) || typeof def.cell !== 'number' || !SHAPES.includes(def.shape)) {
            throw new Error(`atlas 部件 ${name}：需要 cell 與 shape(circle/square/triangle)`);
        }
        if (def.cell < 0 || def.cell >= columns * columns) throw new Error(`atlas 部件 ${name}：格位超出圖集`);
        if (usedCells.has(def.cell)) throw new Error(`atlas 部件 ${name}：格位 ${def.cell} 重複`);
        usedCells.add(def.cell);
        parts[name] = { cell: def.cell, shape: def.shape };
    }

    const symbols: Record<string, SymbolDef> = {};
    for (const [id, s] of Object.entries(isObj(raw.symbols) ? raw.symbols : {})) symbols[id] = normSymbol(id, s, parts);
    const pairs: Record<string, SymbolDef> = {};
    for (const [id, s] of Object.entries(isObj(raw.pairs) ? raw.pairs : {})) pairs[id] = normSymbol(id, s, parts);

    const activities: Record<string, ActivityDef> = {};
    for (const [id, a] of Object.entries(isObj(raw.activities) ? raw.activities : {})) {
        const act = a as ActivityDef;
        if (!isObj(act) || typeof act.symbol !== 'string' || !symbols[act.symbol]) {
            throw new Error(`活動 ${id}：symbol 指向不存在的符號組`);
        }
        activities[id] = act;
    }
    return { schema: typeof raw.schema === 'string' ? raw.schema : 'q-symbol-groups.v1', atlas: { cellSize, columns, parts }, activities, symbols, pairs };
}

/** 一個要畫的子精靈（圖層序號＋元素序號） */
export interface PlannedElement {
    layerIdx: number;
    i: number;
    n: number;
}

export function primaryLayerIndex(def: SymbolDef): number {
    const idx = def.layers.findIndex((l) => l.primary === true);
    return idx >= 0 ? idx : 0;
}

/**
 * 依 LOD 決定要畫哪些元素（主圖層優先，再依序補其他圖層；超過每符號子精靈上限就截斷）。
 * LOD1：只留主圖層（staticFirst 只留第 1 個）；LOD2：只留第 1 個靜態小圖形（lod2:hide 則不畫）；LOD3：不畫。
 */
export function planElements(def: SymbolDef, maxSub: number, lod: SymbolLod): PlannedElement[] {
    if (lod === 3) return [];
    const pIdx = primaryLayerIndex(def);
    const order: PlannedElement[] = [];
    const pushLayer = (li: number): void => {
        const n = layerCount(def.layers[li]);
        for (let i = 0; i < n; i++) order.push({ layerIdx: li, i, n });
    };
    pushLayer(pIdx);
    if (lod === 2) {
        if (def.lod2 === 'hide') return [];
        return order.slice(0, 1);
    }
    if (lod === 1) {
        return (def.lod1 === 'staticFirst' ? order.slice(0, 1) : order).slice(0, maxSub);
    }
    def.layers.forEach((_l, li) => {
        if (li !== pIdx) pushLayer(li);
    });
    return order.slice(0, maxSub);
}

/** 該 LOD 會用幾個子精靈（預算用） */
export function elementCount(def: SymbolDef, maxSub: number, lod: SymbolLod): number {
    return planElements(def, maxSub, lod).length;
}

/** 解出元素的圖集部件，處理 weaponFromGeneral 代換 */
export function resolvePart(def: SymbolDef, el: PlannedElement, weaponPart: string | undefined): string {
    const part = partOf(def.layers[el.layerIdx], el.i);
    return part === WEAPON_PART ? (weaponPart ?? DEFAULT_WEAPON_PART) : part;
}

// ---------------------------------------------------------------- 顏色與心情

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!m) return [255, 255, 255];
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** 心情等級（QLIFE-01 §5.6）：>+20 開心；−20～+20 平靜；< −20 有怒氣＝不爽、無怒氣＝鬱悶 */
export type MoodBand = 'happy' | 'calm' | 'upset' | 'gloomy';

export function moodBand(mood: number, angry: boolean): MoodBand {
    if (mood > 20) return 'happy';
    if (mood < -20) return angry ? 'upset' : 'gloomy';
    return 'calm';
}

/**
 * 心情乘色（每通道 0～1）。Sprite.color 最大是白色，所以「亮」是相對平靜的 0.92 基準往上到 1；
 * 鬱悶時全部符號 ×0.75 亮度；不爽偏紅。
 */
export function moodMultiplier(mood: number, angry: boolean): Rgb {
    switch (moodBand(mood, angry)) {
        case 'happy': return [1, 1, 0.9];
        case 'upset': return [1, 0.6, 0.55];
        case 'gloomy': return [0.75, 0.75, 0.75];
        default: return [0.92, 0.92, 0.92];
    }
}

/** 最終顏色 = 圖層色 × 心情乘色，取整到 0～255 */
export function mixTint(tintHex: string, mul: Rgb): Rgb {
    const c = hexToRgb(tintHex);
    return [Math.round(c[0] * mul[0]), Math.round(c[1] * mul[1]), Math.round(c[2] * mul[2])];
}
