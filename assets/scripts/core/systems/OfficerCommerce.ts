// @spec-source → 官職俸祿商業加速特權與外交加速錦囊平衡規格書.md (doc_spec_0634) §2、§3；官職系統.md C；WBS OFC-12；PROG-2-2139、PROG-2-2142
/**
 * OfficerCommerce — 官職商業加速（純邏輯，不依賴 cc）
 *
 * 只做接口，不接支付（使用者裁決第 19 項）：
 * - 月卡官職經驗加成：倍率由 officer-tiers.json 的 commerce 區塊設定。
 * - 假節鉞試用：高一階、24 小時，只影響「有效階位」；正式階位、經驗與解鎖歷史都不動，到期自動失效。
 *
 * 時鐘回撥到開始時間之前，試用視為失效，避免改系統時間延長試用。
 *
 * Unity 對照：像一個暫時的 Buff 元件，查權限時回傳加成後的值，不改存檔裡的 PlayerRank 本體。
 */
import { OFFICER_TIER_MAX, OFFICER_TIER_MIN, type OfficerState } from './OfficerState';

/** 可由資料檔覆寫的商業設定；內建值只是備援 */
export const OFFICER_COMMERCE_CONFIG = {
    monthlyCardExpMultiplier: 1.15,
    trialHours: 24,
};

const MS_PER_HOUR = 60 * 60 * 1000;

/** 資料檔的 commerce 區塊是否合法（倍率不得小於 1，否則變成懲罰） */
export function isValidOfficerExpMultiplier(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 1;
}

/** 資料檔的試用時數是否合法 */
export function isValidOfficerTrialHours(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** 套用官職經驗加成：只有月卡效期內才加倍，四捨五入成整數 */
export function boostedOfficerExp(gain: number, monthlyCardActive: boolean): number {
    if (!monthlyCardActive) return gain;
    return Math.round(gain * OFFICER_COMMERCE_CONFIG.monthlyCardExpMultiplier);
}

export interface OfficerTrial {
    /** 試用階位 */
    tier: number;
    /** 開始時間（epoch ms） */
    startedAt: number;
    /** 到期時間（epoch ms），到這一刻就失效 */
    expiresAt: number;
}

export type OfficerTrialGrant =
    | { ok: true; trial: OfficerTrial }
    | { ok: false; reason: 'at-max-tier' | 'already-active' };

/** 試用還有效才回傳，否則 null */
export function activeOfficerTrial(trial: Readonly<OfficerTrial> | null, now: number): OfficerTrial | null {
    return trial && now >= trial.startedAt && now < trial.expiresAt ? { ...trial } : null;
}

/** 開始試用：比正式階位高一階；已是最高階或試用尚未結束時不發放，避免浪費試用令 */
export function grantOfficerTrial(
    current: Readonly<OfficerTrial> | null,
    formalTier: number,
    now: number,
): OfficerTrialGrant {
    if (formalTier >= OFFICER_TIER_MAX) return { ok: false, reason: 'at-max-tier' };
    if (activeOfficerTrial(current, now)) return { ok: false, reason: 'already-active' };
    return {
        ok: true,
        trial: { tier: formalTier + 1, startedAt: now, expiresAt: now + OFFICER_COMMERCE_CONFIG.trialHours * MS_PER_HOUR },
    };
}

/** 查權限用的官職狀態：只換階位，經驗與解鎖歷史仍是正式值；回傳值不寫回存檔 */
export function effectiveOfficerState(
    state: Readonly<OfficerState>,
    trial: Readonly<OfficerTrial> | null,
    now: number,
): OfficerState {
    const active = activeOfficerTrial(trial, now);
    const currentTier = active && active.tier > state.currentTier ? active.tier : state.currentTier;
    return { ...state, currentTier, unlockHistory: [...state.unlockHistory] };
}

/** 讀檔正規化：欄位不合法就視為沒有試用 */
export function normalizeOfficerTrial(raw: unknown): OfficerTrial | null {
    if (!raw || typeof raw !== 'object') return null;
    const { tier, startedAt, expiresAt } = raw as Partial<OfficerTrial>;
    if (!Number.isInteger(tier) || (tier as number) < OFFICER_TIER_MIN || (tier as number) > OFFICER_TIER_MAX) return null;
    if (!Number.isFinite(startedAt) || !Number.isFinite(expiresAt) || (expiresAt as number) <= (startedAt as number)) return null;
    return { tier: tier as number, startedAt: startedAt as number, expiresAt: expiresAt as number };
}
