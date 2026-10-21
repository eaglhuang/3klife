// @spec-source → 名士預言系統.md §F 預言生成邏輯（WeightedSample 需要子嗣實際因子分布）、§K 血統模擬器；因子爆發系統.md §K；WBS ORAC-03（PROG-2-1069）
/**
 * ChildFactorExpectation — 父母因子推得子嗣的預期因子分布（純邏輯，不依賴 cc）
 *
 * 名士占卜與結緣預覽共用：不擲骰，直接算出每個因子「進入子嗣因子池」的機率，
 * 再彙總成六色的預期權重，供 WeightedSample 使用。
 *
 * 計算方式（與 FactorInheritance.inheritFactors 同一套規則）：
 *   - 每位祖先、每個因子各自獨立擲一次進池，機率 = inheritanceLukRate(FACTOR_POOL_RATE[世代], 父母平均 LUK)。
 *   - 同一因子來自多位祖先時，至少一位進池即成立：chance = 1 - Π(1 - rate_i)。
 *   - 色系權重 = 各色因子 chance 加總，再正規化成總和 1（沒有因子時全為 0）。
 *
 * 暫定／不含（與實際繼承的差異）：
 *   - 不計星等（星等只影響等級，不影響進池機率）。
 *   - 不計 maxFactors 上限（DEFAULT_MAX_INHERITED_FACTORS 截斷後的實際分布會略偏）。
 *   - 屬性（武力／智力等）分布不在本模組：因子字典與祖譜目前只有色系資料。
 *
 * Unity 對照：像一個 static 的 Query（類似 Probability Calculator），讀祖譜與因子字典算出期望值，
 * 不呼叫 Random，也不改武將資料。
 */
import {
    ALL_FACTOR_COLORS,
    AncestorFactorSource,
    DEFAULT_ENABLED_FACTOR_COLORS,
    FACTOR_POOL_RATE,
    FactorColor,
    FactorDictionary,
    inheritanceLukRate,
    resolveFactorColor,
} from './FactorInheritance';

export interface ExpectedFactorChance {
    factorId: string;
    color: FactorColor;
    /** 進入子嗣因子池的機率（0~1） */
    chance: number;
    /** 提供此因子的祖先 uid（與 inheritFactors 的 sourceUids 同序） */
    sourceUids: string[];
}

export interface ChildFactorExpectation {
    /** 依機率由高到低、同機率依 factorId 排序 */
    factors: ExpectedFactorChance[];
    /** 六色預期權重，總和為 1；沒有可繼承因子時全為 0 */
    colorWeights: Record<FactorColor, number>;
}

export interface ChildFactorExpectationOptions {
    dictionary?: FactorDictionary;
    enabledColors?: readonly FactorColor[];
    /** 父母平均 LUK，缺省為 0 */
    parentAvgLuk?: number;
}

function emptyColorWeights(): Record<FactorColor, number> {
    const weights = {} as Record<FactorColor, number>;
    for (const color of ALL_FACTOR_COLORS) weights[color] = 0;
    return weights;
}

/** 由祖譜來源算出子嗣的預期因子分布。輸入與 inheritFactors 相同，方便兩邊比對。 */
export function expectedChildFactorPool(
    sources: readonly AncestorFactorSource[],
    options: ChildFactorExpectationOptions = {},
): ChildFactorExpectation {
    const enabled = new Set(options.enabledColors ?? DEFAULT_ENABLED_FACTOR_COLORS);
    const luk = options.parentAvgLuk ?? 0;
    // missProb：所有祖先都沒把此因子擲進池的機率（獨立事件相乘）
    const pending = new Map<string, { color: FactorColor; missProb: number; sourceUids: string[] }>();

    for (const source of sources) {
        const seen = new Set<string>();
        for (const factorId of source.factorIds) {
            if (!factorId || seen.has(factorId)) continue;
            seen.add(factorId);

            const gene = source.genes?.find((g) => g.id === factorId);
            const color = resolveFactorColor(factorId, options.dictionary, gene);
            if (!color || !enabled.has(color)) continue;

            const rate = inheritanceLukRate(FACTOR_POOL_RATE[source.generation], luk);
            const entry = pending.get(factorId) ?? { color, missProb: 1, sourceUids: [] };
            entry.missProb *= 1 - rate;
            entry.sourceUids.push(source.uid);
            pending.set(factorId, entry);
        }
    }

    const factors: ExpectedFactorChance[] = Array.from(pending.entries()).map(([factorId, entry]) => ({
        factorId,
        color: entry.color,
        chance: 1 - entry.missProb,
        sourceUids: entry.sourceUids,
    }));
    factors.sort((a, b) => b.chance - a.chance || a.factorId.localeCompare(b.factorId));

    const colorWeights = emptyColorWeights();
    let total = 0;
    for (const factor of factors) {
        colorWeights[factor.color] += factor.chance;
        total += factor.chance;
    }
    if (total > 0) {
        for (const color of ALL_FACTOR_COLORS) colorWeights[color] /= total;
    }
    return { factors, colorWeights };
}
