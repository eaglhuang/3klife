// @spec-source → 道具系統（付費免費道具）.md §掛機產出公式（daily_free_enroll，已退場）；WBS ITM-06；PROG-2-1374、PROG-2-9206
/**
 * DailyFreeEnroll — 登入日高水位判斷（純邏輯，不依賴 cc）。
 *
 * 每日免費入學令（PROG-2-1374）已於 PROG-2-9206 退場：入學令只由季結的 item.settlePeriodic 發放
 * （持有上限 3，溢出折金），每日發放會繞過上限讓季發白送金幣。檔名與存檔欄位 enrollGrantDay 沿用，
 * 只留「已處理的最大登入日」高水位：今天的登入日嚴格晚於它才算新的一天，時鐘回撥不會重複觸發。
 *
 * Unity 對照：像存「上次領取的日期」，時鐘再怎麼撥，都只看這個數字往前走。
 */

const LOGIN_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 是否為新的一天：從未記過，或今天的登入日嚴格晚於已發放的最大日（YYYY-MM-DD 字串可直接比較） */
export function isNewEnrollGrantDay(grantedDay: string | null, today: string): boolean {
    return grantedDay === null || today > grantedDay;
}

/** 讀檔時正規化高水位；不是 YYYY-MM-DD 的值視為從未發過 */
export function normalizeEnrollGrantDay(value: unknown): string | null {
    return typeof value === 'string' && LOGIN_DAY_PATTERN.test(value) ? value : null;
}
