// @spec-source → AI武將強度系統.md (doc_data_0002) §E-9 Phase 4~5：國家軍力指數、弱勢國家偏防守（PROG-2-1706）
/**
 * RivalMilitaryIndex — 他國軍力指數與弱勢守勢判定（純邏輯，不依賴 cc）
 *
 * 規格：軍力指數 = 旗下武將總戰力加總；低於全體平均 × 0.7 的國家偏向防守。
 * 全體勢力都有逐將軍力（officerPower，PROG-2-1714）時用逐將軍力；有任一缺漏（舊存檔）就全體改用兵力，維持同一把尺。
 * 暫定：「偏防守」= 本季進攻機率乘上倍率。
 *
 * Unity 對照：像 LateUpdate 裡先統計全體平均，再逐一判斷誰落後、調整 AI 行為權重。
 */

/** 弱勢門檻：低於平均的比例（規格 0.7） */
export const WEAK_NATION_RATIO = 0.7;
/** 弱勢國家的進攻機率倍率（暫定，規格只寫「偏防守」） */
export const DEFENSIVE_ATTACK_MULTIPLIER = 0.5;

export interface MilitaryIndexSource {
    readonly troops: number;
    /** 逐將總戰力加總（E-9 Phase 4）；沒有名冊時缺漏 */
    readonly officerPower?: number;
}

/** 全體勢力都有逐將軍力時才改用逐將軍力 */
export function usesOfficerPower(nations: readonly MilitaryIndexSource[]): boolean {
    return nations.length > 0 && nations.every((n) => typeof n.officerPower === 'number');
}

/** 軍力指數：byOfficers 為真時取逐將軍力，否則以兵力代表 */
export function militaryIndexOf(nation: MilitaryIndexSource, byOfficers = false): number {
    return Math.max(0, byOfficers ? nation.officerPower ?? 0 : nation.troops);
}

/** 全體平均軍力指數；沒有國家時為 0 */
export function averageMilitaryIndex(nations: readonly MilitaryIndexSource[]): number {
    if (nations.length === 0) return 0;
    const byOfficers = usesOfficerPower(nations);
    return nations.reduce((sum, n) => sum + militaryIndexOf(n, byOfficers), 0) / nations.length;
}

/** 是否為弱勢國家（低於平均 × 0.7） */
export function isWeakNation(index: number, average: number): boolean {
    return average > 0 && index < average * WEAK_NATION_RATIO;
}

/** 依強弱調整後的進攻機率 */
export function adjustedAttackChance(baseChance: number, weak: boolean): number {
    return weak ? baseChance * DEFENSIVE_ATTACK_MULTIPLIER : baseChance;
}
