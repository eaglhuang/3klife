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
/**
 * 沒收的忠誠降低倍率（PM 2026-10-13 暫定）：規格寫「大幅下降」，未給數值。
 * 以拔除的降低量乘 2 計；定案後只改這裡並更新待辦文件。
 */
export const TALLY_CONFISCATE_MULT = 2;

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

/** 忠誠 < 30：戰場每回合拒絕執行命令的機率（PROG-2-0204，數值系統 §忠誠度） */
export const LOYALTY_REFUSE_THRESHOLD = 30;
export const LOYALTY_REFUSE_CHANCE_PER_TURN = 0.25;
/** 忠誠 < 10：每季叛變的機率 */
export const LOYALTY_REBELLION_THRESHOLD = 10;
export const LOYALTY_REBELLION_CHANCE_PER_SEASON = 0.05;

/** 本回合是否拒絕命令。rand 可注入（回傳 [0,1)），測試用固定序列 */
export function rollLoyaltyRefusal(loyalty: number, rand: () => number = Math.random): boolean {
    if (loyalty >= LOYALTY_REFUSE_THRESHOLD) return false;
    return rand() < LOYALTY_REFUSE_CHANCE_PER_TURN;
}

/** 本季是否叛變。叛變時是否攜帶虎符出走，規格只寫「可能」，未定機率，這裡不處理 */
export function rollLoyaltyRebellion(loyalty: number, rand: () => number = Math.random): boolean {
    if (loyalty >= LOYALTY_REBELLION_THRESHOLD) return false;
    return rand() < LOYALTY_REBELLION_CHANCE_PER_SEASON;
}

/**
 * 虎符轉交：從 from 卸下、裝到 to。規格寫轉交算在「每季 1 次變更」內，
 * 但沒有寫轉交本身的忠誠數值，所以這裡只記季次，不改忠誠（暫定，記入待辦）。
 * 任一方本季已變更過就整筆拒絕，兩邊都不記。
 */
export type TallyTransferResult =
    | { ok: true; from: TallyLoyaltyState; to: TallyLoyaltyState }
    | { ok: false; reason: 'SEASON_LIMIT'; from: TallyLoyaltyState; to: TallyLoyaltyState };

export function applyTallyTransferSeason(
    from: TallyLoyaltyState,
    to: TallyLoyaltyState,
    season: number,
): TallyTransferResult {
    if (from.lastChangeSeason === season || to.lastChangeSeason === season) {
        return { ok: false, reason: 'SEASON_LIMIT', from, to };
    }
    const bump = (s: TallyLoyaltyState): TallyLoyaltyState => ({
        ...s,
        lastChangeSeason: season,
        consecutiveSeasons: s.lastChangeSeason === season - 1 ? s.consecutiveSeasons + 1 : 1,
    });
    return { ok: true, from: bump(from), to: bump(to) };
}

/**
 * 君主沒收虎符的忠誠降低（TRP-08 / PROG-2-0239）：依品質的拔除降低量 × TALLY_CONFISCATE_MULT。
 * 不受每季一次與連續倍率限制，也不改季數計數；轉蛋名將仍鎖 100。
 */
export function applyTallyConfiscation(state: TallyLoyaltyState, quality: TigerTallyQuality): TallyLoyaltyState {
    if (state.isGachaHero) return { ...state, loyalty: TALLY_LOYALTY_LOCK_VALUE };
    const delta = Math.floor(TALLY_REMOVE_LOYALTY_PENALTY[quality] * TALLY_CONFISCATE_MULT);
    return { ...state, loyalty: clampLoyalty(state.loyalty + delta) };
}
