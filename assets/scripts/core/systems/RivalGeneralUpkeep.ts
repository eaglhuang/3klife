// @spec-source → 治理模式他國AI系統.md (doc_spec_0020) E-7 AI 武將經營：結緣、退役、死亡、俘虜（PROG-2-1477）
/**
 * RivalGeneralUpkeep — 他國 AI 每季的武將經營判定：可否結緣、誰可退役、誰已死亡、俘虜招降或釋放（純邏輯，不依賴 cc）
 *
 * 規格：
 * - 結緣：有可配對組合且糧草 > 2000。
 * - 退役：年齡 ≥ 65 且狀態 ACTIVE 才列入候選。
 * - 死亡：年齡 > 壽命上限或體力 ≤ 0；死亡時 30% 流入傭兵市場。
 * - 俘虜：忠誠 < 30 時 50% 招降；否則超過 4 季未招降就釋放。
 *
 * 暫定（可逆）：
 * - 擲骰只在條件成立時消耗。
 *
 * 與 PrisonerOfWar.ts 的分工：那邊是玩家四選一處置；這裡只管他國 AI 的自動決策。
 *
 * Unity 對照：像每季 Tick 裡的一組 Predicate，資料由 AI 國家模型提供，結果交給呼叫端寫回。
 */

export const AI_GENERAL_UPKEEP_RULES = Object.freeze({
    bondingMinFood: 2000,
    retireMinAge: 65,
    mercenaryMarketChance: 0.3,
    prisonerRecruitMaxLoyalty: 30,
    prisonerRecruitChance: 0.5,
    prisonerReleaseAfterSeasons: 4,
});

export type AiGeneralStatus = 'ACTIVE' | 'RETIRED' | 'DEAD';

/** E-7：有可配對組合且糧草充足才結緣 */
export function canAiStartBonding(eligiblePairCount: number, food: number): boolean {
    return eligiblePairCount > 0 && food > AI_GENERAL_UPKEEP_RULES.bondingMinFood;
}

/** E-7：退役候選（實際是否退役由呼叫端的 shouldRetire 決定） */
export function isRetirementCandidate(age: number, status: AiGeneralStatus): boolean {
    return age >= AI_GENERAL_UPKEEP_RULES.retireMinAge && status === 'ACTIVE';
}

/** E-7：年齡超過壽命上限或體力耗盡即死亡 */
export function isGeneralDead(age: number, lifespanMax: number, vitality: number): boolean {
    return age > lifespanMax || vitality <= 0;
}

/** E-7：死亡結算時是否流入傭兵市場；random 回傳 0~1 */
export function shouldReleaseToMercenaryMarket(random: () => number): boolean {
    return random() < AI_GENERAL_UPKEEP_RULES.mercenaryMarketChance;
}

export type AiPrisonerDecision = 'RECRUIT' | 'RELEASE' | 'HOLD';

/** E-7：俘虜每季處理；random 只在忠誠低於門檻時消耗 */
export function aiPrisonerDecision(loyalty: number, captiveSeasons: number, random: () => number): AiPrisonerDecision {
    const r = AI_GENERAL_UPKEEP_RULES;
    if (loyalty < r.prisonerRecruitMaxLoyalty && random() < r.prisonerRecruitChance) return 'RECRUIT';
    if (captiveSeasons > r.prisonerReleaseAfterSeasons) return 'RELEASE';
    return 'HOLD';
}
