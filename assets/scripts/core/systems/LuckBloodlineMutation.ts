/**
 * LuckBloodlineMutation — 運氣 ≥95 的「血統變異」（LUK-06 效果 2，PROG-2-0877，純邏輯，不依賴 cc）
 *
 * 規格（運氣系統.md「LUK 特殊門檻效果」）：LUK ≥ 95 時，隨機一個因子突破 ★（上限 ★4）。
 *
 * 暫定：
 * - 突破幅度為 +1 星（規格字面）；上限取 min(★4, 因子自身 maxLevel)。
 * - 不論是否真的升星，只要門檻達成就固定消耗一次亂數，讓亂數順序只取決於門檻，而不是因子星級。
 * - 沒有因子時原樣回傳，同樣不消耗亂數。
 *
 * Unity 對照：像掉落結算後的一次額外 Roll，中了就把其中一件裝備升一階，升到封頂就不再升。
 */
import type { FactorDictionary, InheritedFactor } from './FactorInheritance';

/** 血統變異最高可突破到的星級（規格：上限 ★4） */
export const BLOODLINE_MUTATION_LEVEL_CAP = 4;
/** 單次突破的星數（暫定 +1） */
export const BLOODLINE_MUTATION_STEP = 1;

/**
 * 隨機挑一個因子突破 ★。回傳新陣列，不修改輸入。
 * random 必須回傳 [0, 1)；每次呼叫恰好消耗一次。
 */
export function applyBloodlineMutation(
    factors: InheritedFactor[],
    random: () => number,
    dictionary?: FactorDictionary,
): InheritedFactor[] {
    if (factors.length === 0) return factors;

    const index = Math.min(factors.length - 1, Math.floor(random() * factors.length));
    const target = factors[index];
    const maxLevel = Math.min(BLOODLINE_MUTATION_LEVEL_CAP, dictionary?.get(target.id)?.maxLevel ?? BLOODLINE_MUTATION_LEVEL_CAP);
    const level = Math.min(maxLevel, target.level + BLOODLINE_MUTATION_STEP);
    if (level <= target.level) return factors;

    return factors.map((factor, i) => (i === index ? { ...factor, level } : factor));
}
