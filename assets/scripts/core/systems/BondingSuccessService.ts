// @spec-source → 1825 統一規格定案；PROG-2-10026
/**
 * BondingSuccessService — 結緣透明加法公式、誠意累積與紅娘叩門保底
 *
 * 1. 透明加法公式（UI 分項顯示）：
 *    P = clamp(0.25 + (K - 0.8) * 0.45 + F / 200 + Sincerity + Matchmaker, 0.15, 0.95)
 * 2. 誠意累積：每次提親被拒 +12%（上限 +36%），成功後歸零。
 * 3. 紅娘叩門保底：第 1 年第 3 季無配偶時觸發，成功率固定 80%，不扣好感、不進冷卻、每存檔 1 次。
 */

export interface BondingProbabilityInput {
    /** 相性 K (0.8 ~ 1.4) */
    readonly compatibilityK: number;
    /** 雙邊好感度 (-100 ~ 100) */
    readonly friendship: number;
    /** 累計被拒次數 (每次 +0.12, 上限 +0.36) */
    readonly rejectCount: number;
    /** 媒人加權 (例如 0 / 0.08 / 0.15) */
    readonly matchmakerBonus?: number;
}

export interface BondingProbabilityBreakdown {
    readonly base: number;
    readonly compatibilityBonus: number;
    readonly friendshipBonus: number;
    readonly sincerityBonus: number;
    readonly matchmakerBonus: number;
    readonly total: number;
}

export const BONDING_BASE_RATE = 0.25;
export const BONDING_SINCERITY_STEP = 0.12;
export const BONDING_SINCERITY_MAX = 0.36;
export const BONDING_MIN_RATE = 0.15;
export const BONDING_MAX_RATE = 0.95;
export const MATCHMAKER_FALLBACK_RATE = 0.8;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function calculateBondingProbability(input: BondingProbabilityInput): BondingProbabilityBreakdown {
    const k = clamp(Number.isFinite(input.compatibilityK) ? input.compatibilityK : 1.0, 0.8, 1.4);
    const f = clamp(Number.isFinite(input.friendship) ? input.friendship : 0, -100, 100);
    const rejects = Math.max(0, Math.floor(input.rejectCount || 0));
    const matchmakerBonus = Math.max(0, Number.isFinite(input.matchmakerBonus) ? (input.matchmakerBonus as number) : 0);

    const compatibilityBonus = Number(((k - 0.8) * 0.45).toFixed(4));
    const friendshipBonus = Number((f / 200).toFixed(4));
    const sincerityBonus = Number(Math.min(BONDING_SINCERITY_MAX, rejects * BONDING_SINCERITY_STEP).toFixed(4));

    const rawTotal = BONDING_BASE_RATE + compatibilityBonus + friendshipBonus + sincerityBonus + matchmakerBonus;
    const total = Number(clamp(rawTotal, BONDING_MIN_RATE, BONDING_MAX_RATE).toFixed(4));

    return {
        base: BONDING_BASE_RATE,
        compatibilityBonus,
        friendshipBonus,
        sincerityBonus,
        matchmakerBonus,
        total,
    };
}

export function shouldTriggerMatchmakerFallback(params: {
    readonly totalSeasonsElapsed: number;
    readonly hasSpouse: boolean;
    readonly alreadyTriggered: boolean;
}): boolean {
    return params.totalSeasonsElapsed >= 2 && !params.hasSpouse && !params.alreadyTriggered;
}
