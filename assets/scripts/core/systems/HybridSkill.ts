// @spec-source → 血統理論系統.md (doc_spec_0011) §混種戰法（Hybrid Skill）
/**
 * HybridSkill — 混種戰法觸發判定（純邏輯，不依賴 cc）
 *
 * 規格：培育第 15~25 回合每回合擲一次，
 *   Hybrid_Trigger_Chance = 0.05 × (父方有戰法因子 ? 1 : 0) × (母方有戰法因子 ? 1 : 0)
 * 父母雙方都要有「不同領域」的綠色戰法因子才有機會。
 *
 * 暫定（規格只寫在註解）：
 *   - 「不同領域」以 domain 字串比對，兩邊 domain 相同或缺值時視為沒有混種來源。
 *   - 只在視窗內擲骰；視窗外與無來源時不消耗亂數，維持既有亂數序列。
 *   - 父母來源取自身上最高等級的綠色（tactic-seed）因子；領域取該因子字典 defaultTags 的第一個，沒有字典時退回因子 id。
 *
 * Unity 對照：像一個 static 觸發器，只回答「這一回合要不要觸發」，不改武將資料；寫入戰法由上層負責。
 */
import type { RandomSource } from './GeneralAging';
import type { FactorDictionary, InheritedFactor } from './FactorInheritance';

export const HYBRID_WINDOW_START_ROUND = 15;
export const HYBRID_WINDOW_END_ROUND = 25;
export const HYBRID_TRIGGER_BASE_CHANCE = 0.05;

/** 父母一方的戰法來源：有綠色戰法因子時給出其領域，沒有則為 undefined */
export type HybridSkillSource = { domain: string } | undefined;

export function isHybridWindowRound(round: number): boolean {
    return round >= HYBRID_WINDOW_START_ROUND && round <= HYBRID_WINDOW_END_ROUND;
}

/** 本回合的混種觸發機率；不在視窗、或父母沒有不同領域的戰法來源時為 0 */
export function hybridTriggerChance(round: number, father: HybridSkillSource, mother: HybridSkillSource): number {
    if (!isHybridWindowRound(round)) return 0;
    if (!father || !mother) return 0;
    if (father.domain === mother.domain) return 0;
    return HYBRID_TRIGGER_BASE_CHANCE;
}

/** 擲骰：機率為 0 時不呼叫 random */
export function rollHybridTrigger(round: number, father: HybridSkillSource, mother: HybridSkillSource, random: RandomSource): boolean {
    const chance = hybridTriggerChance(round, father, mother);
    if (chance <= 0) return false;
    return random() < chance;
}

/**
 * 從一方的繼承因子推導戰法來源：取最高等級的綠色因子（同等級取較前面的），沒有綠色因子則為 undefined。
 * 領域 = 字典 defaultTags[0]；沒有字典或沒有 tag 時用因子 id。
 */
export function hybridSourceFromFactors(factors: readonly InheritedFactor[] | undefined, dictionary?: FactorDictionary): HybridSkillSource {
    if (!factors) return undefined;
    let best: InheritedFactor | undefined;
    for (const factor of factors) {
        if (factor.color !== 'green') continue;
        if (!best || factor.level > best.level) best = factor;
    }
    if (!best) return undefined;
    const tag = dictionary?.get(best.id)?.defaultTags?.[0];
    return { domain: tag ?? best.id };
}

/** 父母雙方的戰法來源；沒有任何一方有來源時回傳 undefined，讓培育會話完全不擲混種 */
export function hybridSourcesFromParents(
    parents: { father?: readonly InheritedFactor[]; mother?: readonly InheritedFactor[] } | undefined,
    dictionary?: FactorDictionary,
): { father?: HybridSkillSource; mother?: HybridSkillSource } | undefined {
    if (!parents) return undefined;
    const father = hybridSourceFromFactors(parents.father, dictionary);
    const mother = hybridSourceFromFactors(parents.mother, dictionary);
    if (!father && !mother) return undefined;
    return { father, mother };
}
