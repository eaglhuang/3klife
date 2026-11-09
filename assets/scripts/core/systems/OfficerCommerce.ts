// @spec-source → 官職系統.md（C 商業套路：官職加速、高階權限提前體驗）；WBS OFC-12；PROG-2-2139
/**
 * OfficerCommerce — 官職商業加速（純邏輯，不依賴 cc）
 *
 * 只做接口，不接支付（使用者裁決第 19 項）：
 * - 月卡官職經驗加成：倍率由 officer-tiers.json 的 commerce 區塊設定。
 * - 高階官職試用：活動短期提供，只影響「有效階位」；正式階位、經驗與解鎖歷史都不動，到期自動失效。
 *
 * 暫定（規格沒寫，可逆）：
 * - 月卡倍率 1.2，比照月卡精力回復加成。
 * - 試用以季為單位；同時只有一個試用，較低階的不會蓋掉進行中的較高階試用。
 *
 * Unity 對照：像一個暫時的 Buff 元件，查權限時回傳加成後的值，不改存檔裡的 PlayerRank 本體。
 */
import { OFFICER_TIER_MAX, OFFICER_TIER_MIN, type OfficerState } from './OfficerState';

/** 可由資料檔覆寫的商業設定；內建值只是備援 */
export const OFFICER_COMMERCE_CONFIG = {
    monthlyCardExpMultiplier: 1.2,
};

/** 資料檔的 commerce 區塊是否合法（倍率不得小於 1，否則變成懲罰） */
export function isValidOfficerExpMultiplier(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 1;
}

/** 套用官職經驗加成：只有月卡效期內才加倍，四捨五入成整數 */
export function boostedOfficerExp(gain: number, monthlyCardActive: boolean): number {
    if (!monthlyCardActive) return gain;
    return Math.round(gain * OFFICER_COMMERCE_CONFIG.monthlyCardExpMultiplier);
}

export interface OfficerTrial {
    /** 試用階位 */
    tier: number;
    /** 這一季開始就失效（totalSeasonsElapsed） */
    expiresSeason: number;
}

export type OfficerTrialGrant =
    | { ok: true; trial: OfficerTrial }
    | { ok: false; reason: 'invalid' | 'not-higher' | 'weaker' };

/** 試用還有效才回傳，否則 null */
export function activeOfficerTrial(trial: Readonly<OfficerTrial> | null, season: number): OfficerTrial | null {
    return trial && season < trial.expiresSeason ? { ...trial } : null;
}

/** 開始試用：階位要高於正式階位才有意義；進行中的較高階試用不會被蓋掉 */
export function grantOfficerTrial(
    current: Readonly<OfficerTrial> | null,
    formalTier: number,
    tier: number,
    seasons: number,
    season: number,
): OfficerTrialGrant {
    const validTier = Number.isInteger(tier) && tier >= OFFICER_TIER_MIN && tier <= OFFICER_TIER_MAX;
    if (!validTier || !Number.isInteger(seasons) || seasons <= 0) return { ok: false, reason: 'invalid' };
    if (tier <= formalTier) return { ok: false, reason: 'not-higher' };
    const active = activeOfficerTrial(current, season);
    if (active && active.tier > tier) return { ok: false, reason: 'weaker' };
    return { ok: true, trial: { tier, expiresSeason: season + seasons } };
}

/** 查權限用的官職狀態：只換階位，經驗與解鎖歷史仍是正式值；回傳值不寫回存檔 */
export function effectiveOfficerState(
    state: Readonly<OfficerState>,
    trial: Readonly<OfficerTrial> | null,
    season: number,
): OfficerState {
    const active = activeOfficerTrial(trial, season);
    const currentTier = active && active.tier > state.currentTier ? active.tier : state.currentTier;
    return { ...state, currentTier, unlockHistory: [...state.unlockHistory] };
}

/** 讀檔正規化：欄位不合法就視為沒有試用 */
export function normalizeOfficerTrial(raw: unknown): OfficerTrial | null {
    if (!raw || typeof raw !== 'object') return null;
    const { tier, expiresSeason } = raw as Partial<OfficerTrial>;
    if (!Number.isInteger(tier) || (tier as number) < OFFICER_TIER_MIN || (tier as number) > OFFICER_TIER_MAX) return null;
    if (!Number.isInteger(expiresSeason) || (expiresSeason as number) < 0) return null;
    return { tier: tier as number, expiresSeason: expiresSeason as number };
}
