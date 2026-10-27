// @spec-source → 留存系統.md §Server 端 Last_Login／Consecutive_Days、§日曆簽到連動；WBS v16.3 RET-09（PROG-2-0987）；切日規則為 PM 2026-10-27 裁定（暫定）
/**
 * LoginStreak — 連續登入統計（純邏輯，不依賴 cc）。
 *
 * - 以真實日曆日計算：UTC+8 00:00 切日（PM 暫定）。
 * - 同一天重複登入不增加天數；隔一天 +1；漏一天歸 1。
 * - 不改輸入，回傳新狀態。
 *
 * Unity 對照：像每日任務的 streak 計數，只比較「今天的日期字串」與「上次登入的日期字串」。
 */

/** 切日時區偏移（分鐘）：UTC+8。 */
export const LOGIN_DAY_OFFSET_MINUTES = 8 * 60;

export interface LoginStreakState {
    /** 上次登入的日曆日（YYYY-MM-DD，UTC+8）；從未登入為 null。 */
    lastLoginDay: string | null;
    /** 連續登入天數，從 1 起算；從未登入為 0。 */
    consecutiveDays: number;
}

export const EMPTY_LOGIN_STREAK: LoginStreakState = { lastLoginDay: null, consecutiveDays: 0 };

/** 取得 UTC+8 的日曆日字串（YYYY-MM-DD）。 */
export function loginDayOf(epochMs: number): string {
    return new Date(epochMs + LOGIN_DAY_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** 前一個日曆日字串。 */
function previousDay(day: string): string {
    const epoch = Date.parse(`${day}T00:00:00Z`);
    return new Date(epoch - 86_400_000).toISOString().slice(0, 10);
}

/** 記錄一次登入：回傳新的連續登入狀態，不改輸入。 */
export function recordLogin(state: Readonly<LoginStreakState>, epochMs: number): LoginStreakState {
    if (!Number.isFinite(epochMs)) throw new RangeError('登入時間必須為有限數值');
    const today = loginDayOf(epochMs);
    if (state.lastLoginDay === today) return { ...state };
    if (state.lastLoginDay !== null && state.lastLoginDay === previousDay(today)) {
        return { lastLoginDay: today, consecutiveDays: state.consecutiveDays + 1 };
    }
    return { lastLoginDay: today, consecutiveDays: 1 };
}
