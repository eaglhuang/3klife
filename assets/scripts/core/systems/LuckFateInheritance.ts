/**
 * LuckFateInheritance — 運氣 =100 的「天命傳承」（LUK-06 效果 3，PROG-2-0878，純邏輯，不依賴 cc）
 *
 * 規格（運氣系統.md「LUK 特殊門檻效果」）：LUK = MAX(100) 時可解鎖「天命傳承」，額外繼承一個曾祖代因子。
 *
 * 暫定：
 * - 曾祖代 = 第 3 世代的祖先來源（與 inheritFactors 的 generation 定義一致）。
 * - 候選：曾祖代身上、色系已啟用、子嗣尚未擁有的因子；從中隨機挑一個。
 * - 星級沿用第 3 世代的星級分布（rollFactorStar），並以因子 maxLevel 封頂。
 * - 「額外」：不計入 maxFactors 名額，可以超過上限。
 * - 沒有候選時不消耗亂數；有候選時消耗兩次（挑選一次、星級一次）。
 *
 * Unity 對照：像掉落結算後多送一件「祖傳寶物」，從祖輩的收藏裡抽一件，不佔背包格。
 */
import {
    type AncestorFactorSource,
    type FactorColor,
    type FactorDictionary,
    type InheritedFactor,
    DEFAULT_ENABLED_FACTOR_COLORS,
    resolveFactorColor,
    rollFactorStar,
} from './FactorInheritance';
import type { RandomSource } from './GeneralAging';

/** 曾祖代的世代編號（與 inheritFactors 的 generation 一致） */
export const FATE_INHERITANCE_GENERATION = 3;

export interface FateInheritanceOptions {
    random: RandomSource;
    dictionary?: FactorDictionary;
    enabledColors?: readonly FactorColor[];
}

/**
 * 額外繼承一個曾祖代因子。回傳新陣列，不修改輸入。
 * 沒有符合條件的候選時原樣回傳，且不消耗亂數。
 */
export function applyFateInheritance(
    factors: InheritedFactor[],
    sources: AncestorFactorSource[],
    options: FateInheritanceOptions,
): InheritedFactor[] {
    const enabled = new Set(options.enabledColors ?? DEFAULT_ENABLED_FACTOR_COLORS);
    const owned = new Set(factors.map((factor) => factor.id));
    const candidates: Array<{ id: string; color: FactorColor; uid: string; maxLevel: number }> = [];
    const seen = new Set<string>();

    for (const source of sources) {
        if (source.generation !== FATE_INHERITANCE_GENERATION) continue;
        for (const factorId of source.factorIds) {
            if (!factorId || owned.has(factorId) || seen.has(factorId)) continue;
            const gene = source.genes?.find((g) => g.id === factorId);
            const color = resolveFactorColor(factorId, options.dictionary, gene);
            if (!color || !enabled.has(color)) continue;
            seen.add(factorId);
            candidates.push({ id: factorId, color, uid: source.uid, maxLevel: options.dictionary?.get(factorId)?.maxLevel ?? 5 });
        }
    }
    if (candidates.length === 0) return factors;

    const picked = candidates[Math.min(candidates.length - 1, Math.floor(options.random() * candidates.length))];
    const level = Math.min(picked.maxLevel, rollFactorStar(FATE_INHERITANCE_GENERATION, options.random));
    return [...factors, { id: picked.id, color: picked.color, level, generation: FATE_INHERITANCE_GENERATION, sourceUids: [picked.uid] }];
}
