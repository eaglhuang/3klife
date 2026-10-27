import { loginDayOf } from './LoginStreak';

/** 月卡效期天數（經濟系統 E #5：30 天每日加成） */
export const MONTHLY_CARD_DAYS = 30;
/** 剩餘幾天以內算「即將到期」（暫定，規格只給提示文案） */
export const MONTHLY_CARD_EXPIRING_DAYS = 3;
/** 每日遞送的加速卡張數（經濟系統 F：月卡每日遞送 1 張） */
export const MONTHLY_CARD_DAILY_SPEED_CARDS = 1;
export const MONTHLY_CARD_EXPIRING_TEXT = '月卡即將到期，續約可保持每日加成。';

/** 月卡狀態（存檔 Monthly_Card）：到期日含當天；日期都是 UTC+8 的 YYYY-MM-DD */
export interface MonthlyCardState {
    expiresDay: string;
    lastClaimDay: string | null;
}

export interface MonthlyCardClaim {
    readonly state: MonthlyCardState | null;
    /** 本次遞送的加速卡張數（沒領到為 0） */
    readonly speedCards: number;
    readonly daysLeft: number;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dayIndex(day: string): number {
    return Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

function dayOfIndex(index: number): string {
    return new Date(index * 86_400_000).toISOString().slice(0, 10);
}

/** 今天起算的剩餘天數（含今天）；沒開通或已過期為 0 */
export function monthlyCardDaysLeft(state: MonthlyCardState | null, epochMs: number): number {
    if (!state) return 0;
    return Math.max(0, dayIndex(state.expiresDay) - dayIndex(loginDayOf(epochMs)) + 1);
}

export function isMonthlyCardExpiring(state: MonthlyCardState | null, epochMs: number): boolean {
    const left = monthlyCardDaysLeft(state, epochMs);
    return left > 0 && left <= MONTHLY_CARD_EXPIRING_DAYS;
}

/** 開通或續約：效期內從原到期日往後疊 30 天，否則從今天起算 30 天（含今天） */
export function activateMonthlyCard(state: MonthlyCardState | null, epochMs: number): MonthlyCardState {
    const today = dayIndex(loginDayOf(epochMs));
    const active = monthlyCardDaysLeft(state, epochMs) > 0;
    const expires = active ? dayIndex(state!.expiresDay) + MONTHLY_CARD_DAYS : today + MONTHLY_CARD_DAYS - 1;
    return { expiresDay: dayOfIndex(expires), lastClaimDay: state?.lastClaimDay ?? null };
}

/** 每日領取：效期內且今天沒領過才遞送加速卡 */
export function claimMonthlyCardDaily(state: MonthlyCardState | null, epochMs: number): MonthlyCardClaim {
    const daysLeft = monthlyCardDaysLeft(state, epochMs);
    const today = loginDayOf(epochMs);
    if (!state || daysLeft <= 0 || state.lastClaimDay === today) return { state, speedCards: 0, daysLeft };
    return { state: { ...state, lastClaimDay: today }, speedCards: MONTHLY_CARD_DAILY_SPEED_CARDS, daysLeft };
}

/** 讀檔正規化：到期日格式不對視為沒有月卡 */
export function normalizeMonthlyCard(raw: unknown): MonthlyCardState | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.expiresDay !== 'string' || !DAY_PATTERN.test(r.expiresDay)) return null;
    const last = typeof r.lastClaimDay === 'string' && DAY_PATTERN.test(r.lastClaimDay) ? r.lastClaimDay : null;
    return { expiresDay: r.expiresDay, lastClaimDay: last };
}
