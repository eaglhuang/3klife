// @spec-source → AI武將強度系統.md (doc_data_0002) §E-9 Phase 4~5：國家軍力指數、弱勢國家偏防守（PROG-2-1706）
/**
 * RivalMilitaryIndex — 他國軍力指數與弱勢守勢判定（純邏輯，不依賴 cc）
 *
 * 規格：軍力指數 = 旗下武將總戰力加總；低於全體平均 × 0.7 的國家偏向防守。
 * 暫定（勢力目前沒有逐將戰力模型）：軍力指數先用兵力；「偏防守」= 本季進攻機率乘上倍率。
 *
 * Unity 對照：像 LateUpdate 裡先統計全體平均，再逐一判斷誰落後、調整 AI 行為權重。
 */

/** 弱勢門檻：低於平均的比例（規格 0.7） */
export const WEAK_NATION_RATIO = 0.7;
/** 弱勢國家的進攻機率倍率（暫定，規格只寫「偏防守」） */
export const DEFENSIVE_ATTACK_MULTIPLIER = 0.5;

/** 軍力指數（暫以兵力代表） */
export function militaryIndexOf(nation: { readonly troops: number }): number {
    return Math.max(0, nation.troops);
}

/** 全體平均軍力指數；沒有國家時為 0 */
export function averageMilitaryIndex(nations: readonly { readonly troops: number }[]): number {
    if (nations.length === 0) return 0;
    return nations.reduce((sum, n) => sum + militaryIndexOf(n), 0) / nations.length;
}

/** 是否為弱勢國家（低於平均 × 0.7） */
export function isWeakNation(index: number, average: number): boolean {
    return average > 0 && index < average * WEAK_NATION_RATIO;
}

/** 依強弱調整後的進攻機率 */
export function adjustedAttackChance(baseChance: number, weak: boolean): number {
    return weak ? baseChance * DEFENSIVE_ATTACK_MULTIPLIER : baseChance;
}
