// @spec-source → 因子爆發系統.md (doc_spec_0010) §F §K、血統理論系統.md (doc_spec_0011) §F §L、MVP遊戲驗證規格書.md (doc_spec_0045) §F
/**
 * FactorInheritance — 子嗣從 14 人祖譜繼承因子（純邏輯，不依賴 cc）
 *
 * 規格重點：
 * - 進池機率：G1（父母）100%、G2（祖父母）50%、G3（曾祖父母）25%
 * - 星等依「來源世代」決定：G1 ★3(80%)/★4(20%)、G2 ★2(70%)/★3(30%)、G3 ★1(90%)/★2(10%)
 * - 六色（藍/粉/綠/紫/白/紅）預設全部參與繼承（決策 Q1=B，2026-10-11）；enabledColors 可縮減，供測試與灰度開關
 * - 同一因子從多位祖先進池時取最高星等
 * - 子嗣出生時所有因子都是鎖定狀態（灰色鎖頭），由開獎 / 覺醒流程解鎖
 *
 * Unity 對照：像一個 static class GeneticsUtility，吃一份 ScriptableObject 字典與注入的
 * System.Random，回傳 List<GeneData>，不碰任何 MonoBehaviour。
 */
import type { GeneralGeneConfig } from '../models/GeneralUnit';
import type { RandomSource } from './GeneralAging';

export type FactorColor = 'blue' | 'pink' | 'green' | 'purple' | 'white' | 'red';

export const ALL_FACTOR_COLORS: readonly FactorColor[] = ['blue', 'pink', 'green', 'purple', 'white', 'red'];
/** 新手期揭露的三色（因子爆發系統 §K）；僅作揭露順序參考，不再限制繼承 */
export const EARLY_REVEAL_FACTOR_COLORS: readonly FactorColor[] = ['blue', 'pink', 'green'];

/** 繼承時預設啟用的色系：MVP 採完整六色（決策 Q1=B） */
export const DEFAULT_ENABLED_FACTOR_COLORS: readonly FactorColor[] = ALL_FACTOR_COLORS;

/** 子嗣最多保留幾個因子；規格未定，暫比照人物頁 5 格 */
export const DEFAULT_MAX_INHERITED_FACTORS = 5;

/** 各世代進入因子池的機率 */
export const FACTOR_POOL_RATE: Record<1 | 2 | 3, number> = { 1: 1, 2: 0.5, 3: 0.25 };

/**
 * 運氣系統 §繼承成功率修正（PROG-2-0510，PM 暫定採乘法）：
 * Rate = Base × (1 + ParentAvgLUK / 100)，封頂 1；LUK 缺省、負數或非有限值視為 0。
 */
export function inheritanceLukRate(baseRate: number, parentAvgLuk: number): number {
    const luk = Number.isFinite(parentAvgLuk) ? Math.max(0, parentAvgLuk) : 0;
    return Math.min(1, baseRate * (1 + luk / 100));
}

/** 各世代的星等分布：[低星, 高星, 抽到高星的機率] */
export const FACTOR_STAR_DISTRIBUTION: Record<1 | 2 | 3, { low: number; high: number; highRate: number }> = {
    1: { low: 3, high: 4, highRate: 0.2 },
    2: { low: 2, high: 3, highRate: 0.3 },
    3: { low: 1, high: 2, highRate: 0.1 },
};

/** 因子覺醒門檻（因子爆發系統 §F「因子覺醒觸發」） */
export const FACTOR_DISCOVERY_LEVEL: Record<FactorColor, number> = {
    blue: 1,
    pink: 1,
    green: 20,
    white: 20,
    purple: 45,
    red: 45,
};

/**
 * 依「用途」決定色系（因子爆發系統 §F 六色定義）。
 * gene-dictionary.json 目前的 color 欄位與正式色譜不一致（沒有粉色、騎兵適性標成藍色），
 * 所以有 category 時以這張表為準，沒有才退回 color 欄位。
 */
const CATEGORY_COLOR: Record<string, FactorColor | null> = {
    attribute: 'blue',
    leadership: 'blue',
    governance: 'blue',
    'weapon-proficiency': 'blue',
    aptitude: 'pink',
    mobility: 'pink',
    terrain: 'pink',
    'tactic-seed': 'green',
    personality: 'white',
    talent: 'white',
    fortune: 'purple',
    physique: 'red',
    hidden: null,
};

/** generals.json 舊資料的中文 type 對色系 */
const LEGACY_TYPE_COLOR: Record<string, FactorColor> = {
    戰鬥: 'blue',
    統率: 'blue',
    謀略: 'blue',
    內政: 'blue',
    武裝: 'blue',
    兵種: 'pink',
    地形: 'pink',
    戰法: 'green',
    人格: 'white',
    特質: 'white',
    天命: 'purple',
    體魄: 'red',
};

const COLOR_ALIASES: Record<string, FactorColor> = {
    blue: 'blue', 藍: 'blue', 藍色: 'blue',
    pink: 'pink', 粉: 'pink', 粉色: 'pink',
    green: 'green', 綠: 'green', 綠色: 'green',
    purple: 'purple', 紫: 'purple', 紫色: 'purple',
    white: 'white', 白: 'white', 白色: 'white',
    red: 'red', 紅: 'red', 紅色: 'red',
};

export interface FactorDefinition {
    id: string;
    displayName?: string;
    color?: string;
    category?: string;
    maxLevel?: number;
    defaultTags?: string[];
    isHidden?: boolean;
}

export type FactorDictionary = Map<string, FactorDefinition>;

/** 把 master/gene-dictionary.json（{ data: [...] }）或陣列轉成字典 */
export function buildFactorDictionary(raw: { data?: FactorDefinition[] } | FactorDefinition[] | null | undefined): FactorDictionary {
    const list = Array.isArray(raw) ? raw : raw?.data ?? [];
    const dictionary: FactorDictionary = new Map();
    for (const def of list) {
        if (def && typeof def.id === 'string') dictionary.set(def.id, def);
    }
    return dictionary;
}

export function normalizeFactorColor(value: string | undefined | null): FactorColor | null {
    if (!value) return null;
    return COLOR_ALIASES[value.trim().toLowerCase()] ?? COLOR_ALIASES[value.trim()] ?? null;
}

/**
 * 決定一個因子的色系；隱藏因子或無法判定時回傳 null（不參與繼承）。
 * 優先序：字典 category → 字典 color → 武將身上 gene.type（中文或英文色名）。
 */
export function resolveFactorColor(factorId: string, dictionary?: FactorDictionary, gene?: GeneralGeneConfig): FactorColor | null {
    const def = dictionary?.get(factorId);
    if (def) {
        if (def.isHidden) return null;
        if (def.category && def.category in CATEGORY_COLOR) return CATEGORY_COLOR[def.category];
        const color = normalizeFactorColor(def.color);
        if (color) return color;
    }
    const type = gene?.type;
    if (type) return LEGACY_TYPE_COLOR[type] ?? normalizeFactorColor(type);
    return null;
}

/** 一位祖先提供的因子來源 */
export interface AncestorFactorSource {
    uid: string;
    generation: 1 | 2 | 3;
    factorIds: string[];
    /** 武將身上的原始 gene（用來判斷舊資料的中文 type） */
    genes?: GeneralGeneConfig[];
}

export interface InheritedFactor {
    id: string;
    color: FactorColor;
    level: number;
    /** 星等來源的世代（同因子多來源時取最高星那一筆） */
    generation: 1 | 2 | 3;
    sourceUids: string[];
}

export interface FactorInheritanceOptions {
    random: RandomSource;
    dictionary?: FactorDictionary;
    enabledColors?: readonly FactorColor[];
    maxFactors?: number;
    /** 父母平均 LUK（PROG-2-0510）；缺省為 0，行為與舊版相同 */
    parentAvgLuk?: number;
}

export function rollFactorStar(generation: 1 | 2 | 3, random: RandomSource): number {
    const dist = FACTOR_STAR_DISTRIBUTION[generation];
    return random() < dist.highRate ? dist.high : dist.low;
}

/**
 * 從祖先來源抽出子嗣的因子。
 * 亂數消耗順序固定：依來源順序、每個因子先擲進池、通過後再擲星等，方便測試注入固定序列。
 */
export function inheritFactors(sources: AncestorFactorSource[], options: FactorInheritanceOptions): InheritedFactor[] {
    const enabled = new Set(options.enabledColors ?? DEFAULT_ENABLED_FACTOR_COLORS);
    const maxFactors = options.maxFactors ?? DEFAULT_MAX_INHERITED_FACTORS;
    const merged = new Map<string, InheritedFactor>();

    for (const source of sources) {
        const seen = new Set<string>();
        for (const factorId of source.factorIds) {
            if (!factorId || seen.has(factorId)) continue;
            seen.add(factorId);

            const gene = source.genes?.find((g) => g.id === factorId);
            const color = resolveFactorColor(factorId, options.dictionary, gene);
            if (!color || !enabled.has(color)) continue;

            const poolRate = inheritanceLukRate(FACTOR_POOL_RATE[source.generation], options.parentAvgLuk ?? 0);
            if (options.random() >= poolRate) continue;

            const maxLevel = options.dictionary?.get(factorId)?.maxLevel ?? 5;
            const level = Math.min(maxLevel, rollFactorStar(source.generation, options.random));
            const existing = merged.get(factorId);
            if (!existing) {
                merged.set(factorId, { id: factorId, color, level, generation: source.generation, sourceUids: [source.uid] });
                continue;
            }
            existing.sourceUids.push(source.uid);
            if (level > existing.level) {
                existing.level = level;
                existing.generation = source.generation;
            }
        }
    }

    // Cocos loose spread treats a Map iterator as one item; explicitly consume it before sorting.
    return Array.from(merged.values())
        .sort((a, b) => b.level - a.level || a.generation - b.generation || a.id.localeCompare(b.id))
        .slice(0, Math.max(0, maxFactors));
}

/** 轉成武將身上的 genes 欄位；出生時一律鎖定 */
export function toGeneConfigs(factors: InheritedFactor[], dictionary?: FactorDictionary): GeneralGeneConfig[] {
    return factors.map((factor) => ({
        id: factor.id,
        type: factor.color,
        level: factor.level,
        displayName: dictionary?.get(factor.id)?.displayName ?? factor.id,
        isLocked: true,
        discoveryLevel: FACTOR_DISCOVERY_LEVEL[factor.color],
    }));
}
