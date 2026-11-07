// @spec-source → 英靈世家系統 §F-3 名聲值與供養消耗、§I-2 ClanFameCost（SPI-08，PROG-2-1962）
/**
 * ClanFame — 家族名聲值供養消耗與世家效果降階（純邏輯，不依賴 cc）。
 *
 * - 高階世家效果要消耗名聲值才能生效；名聲不足時降到付得起的最高階，英靈卡本身不消失。
 * - 已解鎖階位（ClanScoreTier.settleClanTier）不倒退，降階只影響「本期生效階」。
 * - 叛逃、作惡、低評價結局扣名聲，同時壓低供養倍率。
 *
 * 暫定：各階消耗只有 §I-2 範例 ClanFameCost = 20，預設傳家之寶 0、其餘三階各 20；
 * 各類事件扣多少名聲、供養倍率怎麼隨名聲下降規格未給，由呼叫端傳入。
 * Unity 對照：像維持 Buff 要付的每期魔力；魔力不夠就換成比較便宜的那個 Buff。
 */
import { CLAN_TIER_ORDER, type ClanTier } from './ClanScoreTier';

export const DEFAULT_CLAN_FAME_COST: Readonly<Record<ClanTier, number>> = {
    CLAN_RELIC: 0,
    NOBLE_HOUSE: 20,
    ETERNAL_KIN: 20,
    MARTIAL_DEITY: 20,
};

export interface ClanFameSettlement {
    /** 本期實際生效的世家階。 */
    effectiveTier: ClanTier;
    /** 本期消耗的名聲值。 */
    fameSpent: number;
    fameRemaining: number;
    /** 生效階低於已解鎖階。 */
    downgraded: boolean;
}

function nonNegative(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 0;
}

/** 付得起的最高階（不超過已解鎖階）。 */
export function affordableClanTier(
    unlocked: ClanTier, fame: number, costByTier: Readonly<Record<ClanTier, number>> = DEFAULT_CLAN_FAME_COST,
): ClanTier {
    const available = nonNegative(fame);
    for (let i = CLAN_TIER_ORDER.indexOf(unlocked); i > 0; i--) {
        const tier = CLAN_TIER_ORDER[i];
        if (nonNegative(costByTier[tier]) <= available) return tier;
    }
    return 'CLAN_RELIC';
}

/** 本期供養結算：依名聲決定生效階並扣除該階消耗。 */
export function settleClanFame(
    unlocked: ClanTier, fame: number, costByTier: Readonly<Record<ClanTier, number>> = DEFAULT_CLAN_FAME_COST,
): ClanFameSettlement {
    const available = nonNegative(fame);
    const effectiveTier = affordableClanTier(unlocked, available, costByTier);
    const fameSpent = nonNegative(costByTier[effectiveTier]);
    return {
        effectiveTier,
        fameSpent,
        fameRemaining: available - fameSpent,
        downgraded: effectiveTier !== unlocked,
    };
}

export type ClanFameIncident = 'DEFECTION' | 'MISDEED' | 'POOR_ENDING';

/** 事件扣名聲（扣量由呼叫端依事件類型給），不低於 0。 */
export function applyClanFameIncident(fame: number, penalty: number): number {
    return Math.max(0, nonNegative(fame) - nonNegative(penalty));
}

/** 供養倍率：乘上呼叫端給的折減係數（夾在 0~1）。 */
export function dampenOfferingMultiplier(multiplier: number, factor: number): number {
    const f = Number.isFinite(factor) ? Math.max(0, Math.min(1, factor)) : 0;
    return nonNegative(multiplier) * f;
}
