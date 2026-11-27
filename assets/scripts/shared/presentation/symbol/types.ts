/**
 * types.ts — 頭上生活符號系統共用型別（WP2，QLIFE-01 第 5 章，doc_spec_1356）
 *
 * 全部是純型別，不依賴 Cocos。座標單位：以「頭高 H」為 1（x 向右、y 向上），
 * 輸出給畫面前才乘上頭的像素尺寸。
 */

/** 11 種動態（QLIFE-01 §5.2） */
export type SymbolMotion =
    | 'floatUp' | 'orbit' | 'pour' | 'pulse' | 'wobble' | 'shoot'
    | 'spark' | 'drift' | 'bounce' | 'swing' | 'flip';

export const SYMBOL_MOTIONS: readonly SymbolMotion[] = [
    'floatUp', 'orbit', 'pour', 'pulse', 'wobble', 'shoot', 'spark', 'drift', 'bounce', 'swing', 'flip',
];

/** 圖集佔位圖形（之後 Codex 圖直接換，格位 id 不變） */
export type PlaceholderShape = 'circle' | 'square' | 'triangle';

/** 一個符號圖層：同一動態的一組子精靈 */
export interface SymbolLayerDef {
    /** 圖集部件 id；陣列時第 i 個元素用 parts[i % length] */
    part: string | string[];
    motion: SymbolMotion;
    /** 元素個數，預設 1 */
    count?: number;
    /** 週期（秒），預設 1 */
    period?: number;
    /** 相位（0～1 週期比例） */
    phase?: number;
    /** 元素大小倍率（1 = 0.5 H），預設 1 */
    size?: number;
    /** 圖層位移（H） */
    offset?: [number, number];
    /** 圖層色（#RRGGBB），沒給就用符號色 */
    tint?: string;
    /** 圖層整體透明度倍率 */
    alpha?: number;
    /** 主圖層（LOD1 只留主圖層）；沒有任何圖層標記時，第一個圖層是主圖層 */
    primary?: boolean;

    // ---- 動態參數（依 motion 取用）----
    rise?: number;
    sway?: number;
    fade?: [number, number];
    grow?: number;
    radius?: number;
    ratio?: number;
    spin?: number;
    angle?: [number, number];
    amp?: number;
    dist?: number;
    pull?: number;
    draw?: number;
    fly?: number;
    burst?: number;
    dir?: [number, number];
    wiggle?: number;
    stagger?: number;
    /** 元素之間橫向間距（H），以中心對稱排開 */
    spread?: number;
}

export type Lod1Mode = 'primary' | 'staticFirst';
export type Lod2Mode = 'static' | 'hide';

/** 符號組定義 */
export interface SymbolDef {
    layers: SymbolLayerDef[];
    tint: string;
    lod1: Lod1Mode;
    lod2: Lod2Mode;
}

/** 活動定義：活動 → 符號組 */
export interface ActivityDef {
    symbol: string;
    /** 附加資料原樣保留，給臉／身體系統讀 */
    bubble?: string | null;
    face?: string;
    bodyClip?: string;
    weaponFromGeneral?: boolean;
    blushByAlcohol?: boolean;
}

/** 圖集部件（格位 id 固定，佔位圖形之後會被美術圖取代） */
export interface AtlasPartDef {
    cell: number;
    shape: PlaceholderShape;
}

export interface QSymbolData {
    schema: string;
    atlas: { cellSize: number; columns: number; parts: Record<string, AtlasPartDef> };
    activities: Record<string, ActivityDef>;
    symbols: Record<string, SymbolDef>;
    /** 兩人互動符號（掛 pairSocket，單一元素） */
    pairs: Record<string, SymbolDef>;
}

/** 單一子精靈在某一刻的狀態（單位 H） */
export interface SpriteState {
    part: string;
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    /** 度，逆時針為正 */
    rot: number;
    alpha: number;
    flipX: boolean;
}

/** LOD：0 完整、1 半速只留主符號、2 靜態、3 不畫（畫面外或預算用盡） */
export type SymbolLod = 0 | 1 | 2 | 3;

/** 本機等級 */
export type SymbolTier = 'low' | 'mid' | 'high';

/** 驅動介面：只要每幀 dt。之後可由 WP1 動畫管理器實作 */
export interface IQSymbolClock {
    subscribe(cb: (dt: number) => void): () => void;
}
