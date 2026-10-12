// @spec-source → 兵種（虎符）系統.md §虎符拔除與忠誠度（PROG-2-0203，WBS TRP-09）
/**
 * TigerTallyLoyalty — 虎符拔除 / 裝上對武將忠誠度的影響，與反洗機制（純邏輯，不依賴 cc）
 *
 * 規則（規格）：
 *   - 拔除虎符降忠誠（UR −25、SSR −20、SR −12、R −5）；裝上虎符加忠誠（UR +8、SSR +5、SR +3、R +1）。
 *   - 同一武將每季只能做 1 次虎符變更（拔除、裝上、轉交都算）。
 *   - 連續 2 季對同一武將做變更，第 2 次起拔除的降低量 ×1.5；裝上不受倍率影響。
 *   - 轉蛋名將忠誠鎖定 100，拔除不影響。
 *   - 忠誠夾在 0~100。
 *
 * 規格未寫的，這裡的暫定做法（記入待辦暫定設計）：
 *   - 「每季只能 1 次」視為硬限制：同季第二次回傳 SEASON_LIMIT，不改忠誠。
 *   - 「第 2 次」：連續第 2 季及之後的拔除都 ×1.5（與規格偽代碼 consecutiveSeasons >= 2 一致）。
 *   - 轉蛋名將的變更不計入每季次數。
 *
 * Unity 對照：像 ScriptableObject 的查表數值加上一個小型狀態機，數值表寫在上面，流程由呼叫端決定。
 */
import type { TigerTallyQuality } from '../models/TigerTallyCard';

export type TallyLoyaltyAction = 'equip' | 'unequip';

/** 拔除虎符的忠誠降低（負值） */
export const TALLY_REMOVE_LOYALTY_PENALTY: Readonly<Record<TigerTallyQuality, number>> = {
    UR: -25,
    SSR: -20,
    SR: -12,
    R: -5,
};

/** 裝上虎符的忠誠提升（正值，較少，避免拔插循環） */
export const TALLY_EQUIP_LOYALTY_BONUS: Readonly<Record<TigerTallyQuality, number>> = {
    UR: 8,
    SSR: 5,
    SR: 3,
    R: 1,
};

export const TALLY_LOYALTY_LOCK_VALUE = 100;
export const TALLY_CONSECUTIVE_PENALTY_MULT = 1.5;

export interface TallyLoyaltyState {
    loyalty: number;
    /** 轉蛋名將：忠誠鎖定 100 */
    isGachaHero: boolean;
    /** 最近一次變更所在的季（例如 2026Q4 → 20264；由呼叫端決定編碼，只比相等與相鄰） */
    lastChangeSeason: number | null;
    /** 目前連續有變更的季數（含最近一季） */
    consecutiveSeasons: number;
}

export type TallyLoyaltyResult =
    | { ok: true; state: TallyLoyaltyState; delta: number; multiplier: number }
    | { ok: false; reason: 'SEASON_LIMIT'; state: TallyLoyaltyState };

function clampLoyalty(value: number): number {
    return Math.min(100, Math.max(0, value));
}

export function createTallyLoyaltyState(loyalty: number, isGachaHero = false): TallyLoyaltyState {
    return {
        loyalty: isGachaHero ? TALLY_LOYALTY_LOCK_VALUE : clampLoyalty(loyalty),
        isGachaHero,
        lastChangeSeason: null,
        consecutiveSeasons: 0,
    };
}

/**
 * 套用一次虎符變更。season 為單調遞增的季編碼（每季 +1 即可，例如 年*4+季）。
 * 轉蛋名將直接回傳鎖定 100，不計次數、不影響連續季數。
 */
export function applyTallyLoyaltyChange(
    state: TallyLoyaltyState,
    action: TallyLoyaltyAction,
    quality: TigerTallyQuality,
    season: number,
): TallyLoyaltyResult {
    if (state.isGachaHero) {
        return { ok: true, state: { ...state, loyalty: TALLY_LOYALTY_LOCK_VALUE }, delta: 0, multiplier: 1 };
    }

    if (state.lastChangeSeason === season) {
        return { ok: false, reason: 'SEASON_LIMIT', state };
    }

    const consecutiveSeasons = state.lastChangeSeason === season - 1 ? state.consecutiveSeasons + 1 : 1;
    // 倍率只作用在拔除（降忠誠）；裝上是加忠誠，不受倍率影響
    const multiplier = action === 'unequip' && consecutiveSeasons >= 2 ? TALLY_CONSECUTIVE_PENALTY_MULT : 1;

    const rawDelta = action === 'unequip'
        ? Math.floor(TALLY_REMOVE_LOYALTY_PENALTY[quality] * multiplier)
        : TALLY_EQUIP_LOYALTY_BONUS[quality];
    const loyalty = clampLoyalty(state.loyalty + rawDelta);

    return {
        ok: true,
        state: { ...state, loyalty, lastChangeSeason: season, consecutiveSeasons },
        delta: loyalty - state.loyalty,
        multiplier,
    };
}
