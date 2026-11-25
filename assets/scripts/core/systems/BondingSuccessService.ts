import bondingConfig from '../../../resources/data/master/bonding-config.json';

export interface BondingProbabilityInput {
    compatibilityK: number;
    favorF: number;
    sincerityBonus: number;
    matchmakerBonus?: number;
}

export interface BondingProbabilityBreakdown {
    base: number;
    compatibility: number;
    favor: number;
    sincerity: number;
    matchmaker: number;
    rawTotal: number;
    finalRate: number;
}

export interface MatchmakerFallbackContext {
    year: number;
    season: number;
    hasPartner: boolean;
    matchmakerFallbackUsed: boolean;
}

export interface BondingProposalState {
    favorF: number;
    rejectCount: number;
    cooldownSeasons: number;
    matchmakerFallbackUsed: boolean;
    hasPartner: boolean;
}

export interface BondingProposalResult {
    success: boolean;
    rateUsed: number;
    breakdown: BondingProbabilityBreakdown | null;
    isMatchmakerFallback: boolean;
    nextState: BondingProposalState;
}

/**
 * 結緣成功率、誠意累積與紅娘叩門保底純邏輯服務（PROG-2-10026）
 * 所有數值皆從 assets/resources/data/master/bonding-config.json 讀取。
 */
export class BondingSuccessService {
    public static getSincerityBonus(rejectCount: number): number {
        const raw = Math.max(0, rejectCount) * bondingConfig.sincerityPerReject;
        return Math.min(bondingConfig.sincerityMax, raw);
    }

    public static calculateBondingProbability(input: BondingProbabilityInput): BondingProbabilityBreakdown {
        const base = bondingConfig.baseRate;
        const compatibility = Math.round((input.compatibilityK - bondingConfig.compatibilityBase) * bondingConfig.compatibilityMultiplier);
        const favor = Math.round(input.favorF / bondingConfig.favorDivisor);
        const sincerity = Math.min(bondingConfig.sincerityMax, Math.max(0, input.sincerityBonus));
        const matchmaker = input.matchmakerBonus ?? 0;

        const rawTotal = base + compatibility + favor + sincerity + matchmaker;
        const finalRate = Math.max(bondingConfig.minRate, Math.min(bondingConfig.maxRate, rawTotal));

        return {
            base,
            compatibility,
            favor,
            sincerity,
            matchmaker,
            rawTotal,
            finalRate,
        };
    }

    /**
     * 紅娘叩門保底判定：僅限第 1 年第 3 季、尚無伴侶、且該存檔尚未觸發過（每存檔至多 1 次）。
     */
    public static shouldTriggerMatchmakerFallback(ctx: MatchmakerFallbackContext): boolean {
        const cfg = bondingConfig.matchmakerFallback;
        return (
            ctx.year === cfg.year &&
            ctx.season === cfg.season &&
            !ctx.hasPartner &&
            !ctx.matchmakerFallbackUsed
        );
    }

    /**
     * 執行一次真實結緣提親流程：
     * - 一般提親被拒：好感 -12、誠意 +12%（上限 +36%）、進入冷卻。
     * - 紅娘叩門保底：固定 80% 成功率，若仍未成親則不扣好感、不進冷卻，並標記已使用（每存檔 1 次）。
     */
    public static attemptBondingProposal(
        state: BondingProposalState,
        params: {
            year: number;
            season: number;
            compatibilityK: number;
            matchmakerBonus?: number;
            rollPercent: number; // 0~100，小於 rateUsed 視為成功
        },
    ): BondingProposalResult {
        const isFallback = this.shouldTriggerMatchmakerFallback({
            year: params.year,
            season: params.season,
            hasPartner: state.hasPartner,
            matchmakerFallbackUsed: state.matchmakerFallbackUsed,
        });

        if (isFallback) {
            const rateUsed = bondingConfig.matchmakerFallback.guaranteedRate;
            const success = params.rollPercent < rateUsed;
            return {
                success,
                rateUsed,
                breakdown: null,
                isMatchmakerFallback: true,
                nextState: {
                    ...state,
                    hasPartner: success ? true : state.hasPartner,
                    matchmakerFallbackUsed: true,
                    // 保底不扣好感、不進冷卻
                    favorF: state.favorF,
                    cooldownSeasons: state.cooldownSeasons,
                },
            };
        }

        const sincerity = this.getSincerityBonus(state.rejectCount);
        const breakdown = this.calculateBondingProbability({
            compatibilityK: params.compatibilityK,
            favorF: state.favorF,
            sincerityBonus: sincerity,
            matchmakerBonus: params.matchmakerBonus,
        });
        const success = params.rollPercent < breakdown.finalRate;

        return {
            success,
            rateUsed: breakdown.finalRate,
            breakdown,
            isMatchmakerFallback: false,
            nextState: success
                ? { ...state, hasPartner: true }
                : {
                    ...state,
                    favorF: state.favorF + bondingConfig.rejectFavorDelta,
                    rejectCount: state.rejectCount + 1,
                    cooldownSeasons: state.cooldownSeasons + 1,
                },
        };
    }
}
