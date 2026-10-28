// @spec-source → 治理模式他國AI系統.md (doc_spec_0020) E-3 季度內政結算、E-7 武將招募、F-3 招募品質（PROG-2-1474）
/**
 * RivalGovernance — 他國 AI 每季依武將屬性與勢力性格結算內政產出，以及招募武將的品質擲骰（純邏輯，不依賴 cc）
 *
 * 規格：
 * - 任務產出：農耕 100＋政×2（糧）、商業 50＋魅×3（金）、外交 20＋智＋魅（名聲）、
 *   軍備 80＋武×2（兵）、偵察 30＋智×2（情報）。
 * - 性格效率：MILITARIST 軍備 ×1.2／農耕 ×0.9；DIPLOMAT 外交 ×1.3／軍備 ×0.8；PASSIVE 農耕 ×1.1／軍備 ×0.6。
 * - 糧金兵名聲與玩家共用上限（ResourceCap）。
 * - 每 2 季招募 1 名；品質依名聲分三段機率。
 *
 * 暫定（可逆）：
 * - 招募機率採 E-7 三段；F-3 表與第一段一致。
 * - 情報封頂 100；效率修正乘在每個任務產出後 floor。
 * - 規格未列的性格效率全 ×1.0。
 *
 * Unity 對照：像 ScriptableObject 存產出表＋效率表，季度 Tick 只是查表累加。
 */
import { clampResource } from './ResourceCap';
import type { NationProfile } from './RivalNations';

export type GovernanceTaskType = 'FARMING' | 'COMMERCE' | 'DIPLOMACY' | 'MILITARY' | 'RECON';
export type GovernanceResource = 'food' | 'gold' | 'fame' | 'troops' | 'intel';

export interface GovernanceGeneralStats {
    readonly str: number;
    readonly int: number;
    readonly pol: number;
    readonly cha: number;
}

export interface GovernanceAssignment {
    readonly type: GovernanceTaskType;
    readonly general: GovernanceGeneralStats;
}

export type GovernanceResources = Readonly<Record<GovernanceResource, number>>;

export const GOVERNANCE_TASK_RESOURCE: Readonly<Record<GovernanceTaskType, GovernanceResource>> = Object.freeze({
    FARMING: 'food',
    COMMERCE: 'gold',
    DIPLOMACY: 'fame',
    MILITARY: 'troops',
    RECON: 'intel',
});

export const INTEL_CAP = 100;

const NEUTRAL_EFFICIENCY: Readonly<Record<GovernanceTaskType, number>> = Object.freeze({
    FARMING: 1, COMMERCE: 1, DIPLOMACY: 1, MILITARY: 1, RECON: 1,
});

/** 規格 E-3 性格效率；未列者 ×1.0 */
export const GOVERNANCE_EFFICIENCY: Readonly<Record<NationProfile, Readonly<Record<GovernanceTaskType, number>>>> = Object.freeze({
    MILITARIST: { ...NEUTRAL_EFFICIENCY, MILITARY: 1.2, FARMING: 0.9 },
    DIPLOMAT: { ...NEUTRAL_EFFICIENCY, DIPLOMACY: 1.3, MILITARY: 0.8 },
    PASSIVE: { ...NEUTRAL_EFFICIENCY, FARMING: 1.1, MILITARY: 0.6 },
    GUARDIAN: NEUTRAL_EFFICIENCY,
    WARLORD: NEUTRAL_EFFICIENCY,
    EXPANSIONIST: NEUTRAL_EFFICIENCY,
    CAVALRY_LORD: NEUTRAL_EFFICIENCY,
    RAIDER: NEUTRAL_EFFICIENCY,
});

/** RAI-01：他國國家的內政資源（糧、金、名聲、情報；兵力沿用 NationState.troops） */
export interface NationResources {
    readonly food: number;
    readonly gold: number;
    readonly fame: number;
    readonly intel: number;
}

/** RAI-01 初始資源（暫定）：糧同玩家新局 300；金取 AI 金幣上限 5000；名聲、情報從 0 開始 */
export const AI_STARTING_RESOURCES: Readonly<NationResources> = Object.freeze({
    food: 300, gold: 5000, fame: 0, intel: 0,
});

/** RAI-02：每季代表國家執行內政的主要任務，取 E-2 內政偏好最高的一項 */
export const NATION_PRIMARY_TASK: Readonly<Record<NationProfile, GovernanceTaskType>> = Object.freeze({
    MILITARIST: 'MILITARY',
    DIPLOMAT: 'FARMING',
    GUARDIAN: 'MILITARY',
    WARLORD: 'MILITARY',
    EXPANSIONIST: 'MILITARY',
    PASSIVE: 'FARMING',
    CAVALRY_LORD: 'MILITARY',
    RAIDER: 'MILITARY',
});

/** 暫定：君主武將屬性尚無資料來源（RAI-08 之前），四項一律 60 */
export const RULER_GOVERNANCE_STATS: GovernanceGeneralStats = Object.freeze({ str: 60, int: 60, pol: 60, cha: 60 });

/** 單一任務的基礎產出（未套性格效率） */
export function governanceTaskOutput(type: GovernanceTaskType, g: GovernanceGeneralStats): number {
    switch (type) {
        case 'FARMING': return 100 + g.pol * 2;
        case 'COMMERCE': return 50 + g.cha * 3;
        case 'DIPLOMACY': return 20 + g.int + g.cha;
        case 'MILITARY': return 80 + g.str * 2;
        case 'RECON': return 30 + g.int * 2;
    }
}

/** E-3 季度內政結算；回傳新資源，不改輸入 */
export function aiGovernanceTick(
    resources: GovernanceResources,
    profile: NationProfile,
    assignments: readonly GovernanceAssignment[],
): GovernanceResources {
    const next: Record<GovernanceResource, number> = { ...resources };
    const efficiency = GOVERNANCE_EFFICIENCY[profile];
    for (const task of assignments) {
        const gain = Math.floor(governanceTaskOutput(task.type, task.general) * efficiency[task.type]);
        next[GOVERNANCE_TASK_RESOURCE[task.type]] += gain;
    }
    return {
        food: clampResource('food', next.food),
        gold: clampResource('gold', next.gold),
        troops: clampResource('troops', next.troops),
        fame: clampResource('fame', next.fame),
        intel: Math.min(INTEL_CAP, next.intel),
    };
}

export type RecruitQuality = 'S' | 'A' | 'B' | 'C';

/** E-7：每 2 季招募 1 名 */
export function shouldRecruitThisSeason(season: number): boolean {
    return season % 2 === 0;
}

/** E-7 招募品質機率（依序累加擲骰） */
export function recruitQualityOdds(fame: number): ReadonlyArray<readonly [RecruitQuality, number]> {
    if (fame > 1500) return [['S', 0.1], ['A', 0.3], ['B', 0.6]];
    if (fame > 800) return [['A', 0.2], ['B', 0.7], ['C', 0.1]];
    return [['A', 0.1], ['B', 0.6], ['C', 0.3]];
}

/** random 回傳 0~1，由呼叫端注入 */
export function rollRecruitQuality(fame: number, random: () => number): RecruitQuality {
    const odds = recruitQualityOdds(fame);
    const roll = random();
    let acc = 0;
    for (const [quality, chance] of odds) {
        acc += chance;
        if (roll < acc) return quality;
    }
    return odds[odds.length - 1][0];
}
