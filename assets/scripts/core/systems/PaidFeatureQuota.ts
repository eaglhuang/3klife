// @spec-source → 使用者裁決 2026-11-08 第 19 項（商業化：單日免費 1 次＋超額 60 玉璧）；WBS EQP-11、OFC-12；PROG-2-1997
/**
 * PaidFeatureQuota — 付費功能的每日免費額度與超額玉璧計價（純邏輯，不依賴 cc、不接支付 SDK）。
 *
 * 規則（使用者裁決第 19 項）：每個功能每個登入日免費 1 次，超過的每次扣 60 玉璧。
 * - 登入日沿用 LoginStreak.loginDayOf（UTC+8，YYYY-MM-DD 字串）。
 * - 跨日歸零；系統時鐘回撥（今天比已記錄的日子早）不重置，沿用已記錄日的次數（同 DailyFreeEnroll 的高水位做法）。
 * - 玉璧由呼叫端持有與扣款：本模組只回傳「這次要扣多少」，玉璧不足回 insufficient-gems，狀態不變。
 *
 * 範圍：只涵蓋裁決第 19 項。欄位解鎖價格、強化材料消耗、月卡官職經驗加成倍率、高階試用 buff、
 * 刷新券／外交加速包的個別數值都不在裁決內，本檔不定義。
 *
 * Unity 對照：像 PlayerPrefs 裡存「今天用了幾次」的小計數器，加上一個回傳價格的 static 函式。
 */
import { loginDayOf } from './LoginStreak';

/** 暫定識別碼：EQP-11 自動整理、OFC-12 刷新（對應哪些實際功能由呼叫端決定，其他功能直接傳自己的字串） */
export const QUOTA_FEATURE_EQP_AUTO_ORGANIZE = 'EQP_AUTO_ORGANIZE';
export const QUOTA_FEATURE_OFC_REFRESH = 'OFC_REFRESH';

/** 裁決第 19 項：每功能每日免費次數、超額每次玉璧 */
export const PAID_FEATURE_DAILY_FREE = 1;
export const PAID_FEATURE_EXTRA_GEM_COST = 60;

export interface PaidFeatureQuotaState {
    /** 目前計數所屬的登入日（高水位）；從未使用為 null */
    day: string | null;
    /** 該日各功能已使用次數 */
    used: Readonly<Record<string, number>>;
}

export const EMPTY_PAID_FEATURE_QUOTA: PaidFeatureQuotaState = { day: null, used: {} };

export interface QuotaPreview {
    /** 本次是否免費 */
    free: boolean;
    /** 本次要扣的玉璧（免費為 0） */
    gemCost: number;
    /** 今天剩餘的免費次數 */
    freeLeft: number;
    /** 目前玉璧是否付得起 */
    affordable: boolean;
}

export type QuotaConsumeResult =
    | { ok: true; state: PaidFeatureQuotaState; free: boolean; gemsSpent: number }
    | { ok: false; reason: 'insufficient-gems' | 'invalid-feature' };

/** 依登入日整理狀態：晚於記錄日→歸零換日；早於或等於記錄日→不動（時鐘回撥不重置） */
function currentOf(state: Readonly<PaidFeatureQuotaState>, today: string): PaidFeatureQuotaState {
    if (state.day === null || today > state.day) return { day: today, used: {} };
    return { day: state.day, used: state.used };
}

function usedOf(state: Readonly<PaidFeatureQuotaState>, feature: string): number {
    const raw = state.used[feature];
    return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

function safeGems(gems: number): number {
    return Number.isFinite(gems) && gems > 0 ? Math.floor(gems) : 0;
}

/** 看價不扣：今天這個功能下一次用要不要錢、付不付得起 */
export function previewPaidFeatureUse(state: Readonly<PaidFeatureQuotaState>, feature: string, epochMs: number, gems: number): QuotaPreview {
    const cur = currentOf(state, loginDayOf(epochMs));
    const used = usedOf(cur, feature);
    const free = used < PAID_FEATURE_DAILY_FREE;
    const gemCost = free ? 0 : PAID_FEATURE_EXTRA_GEM_COST;
    return { free, gemCost, freeLeft: Math.max(0, PAID_FEATURE_DAILY_FREE - used), affordable: safeGems(gems) >= gemCost };
}

/** 使用一次：免費額度內不扣；超額扣 60 玉璧（呼叫端依 gemsSpent 扣款）；玉璧不足時狀態不變 */
export function consumePaidFeatureUse(state: Readonly<PaidFeatureQuotaState>, feature: string, epochMs: number, gems: number): QuotaConsumeResult {
    if (!feature) return { ok: false, reason: 'invalid-feature' };
    const preview = previewPaidFeatureUse(state, feature, epochMs, gems);
    if (!preview.affordable) return { ok: false, reason: 'insufficient-gems' };
    const cur = currentOf(state, loginDayOf(epochMs));
    const next: PaidFeatureQuotaState = { day: cur.day, used: { ...cur.used, [feature]: usedOf(cur, feature) + 1 } };
    return { ok: true, state: next, free: preview.free, gemsSpent: preview.gemCost };
}

/** 讀檔正規化：日期格式錯視為從未使用；次數只收正整數 */
export function normalizePaidFeatureQuota(raw: unknown): PaidFeatureQuotaState {
    if (!raw || typeof raw !== 'object') return EMPTY_PAID_FEATURE_QUOTA;
    const value = raw as { day?: unknown; used?: unknown };
    const day = typeof value.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.day) ? value.day : null;
    if (day === null) return EMPTY_PAID_FEATURE_QUOTA;
    const used: Record<string, number> = {};
    if (value.used && typeof value.used === 'object') {
        for (const [key, count] of Object.entries(value.used as Record<string, unknown>)) {
            if (typeof count === 'number' && Number.isFinite(count) && count > 0) used[key] = Math.floor(count);
        }
    }
    return { day, used };
}
