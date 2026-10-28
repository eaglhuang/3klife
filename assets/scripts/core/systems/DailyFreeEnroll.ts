// @spec-source → 道具系統（付費免費道具）.md §掛機產出公式（daily_free_enroll）；WBS ITM-06；PM 暫定（facility_level＝太守府等級、登入切日發放）；PROG-2-1374
/**
 * DailyFreeEnroll — 掛機產出的每日免費入學令張數（純邏輯，不依賴 cc）。
 *
 * - 公式：daily_free_enroll = floor(facility_level / 5) + 1，基礎 1~2 張（等級 1–9）。
 * - facility_level 暫定為太守府等級（PM 裁定）；非有限數或小於 1 的等級視為 1。
 * - 發放時點由 GameSession 在登入切日時呼叫。
 * - 發放以「已發放的最大登入日」為高水位（PM 2026-10-28 裁定）：只有今天的登入日大於它才發，
 *   所以系統時鐘回撥後再撥回已發過的日期，不會重複領取。
 *
 * Unity 對照：像 Idle 遊戲的離線收益表，用等級算出每天掉落的數量，每天開一次登入時結算一次。
 * 高水位像存「上次領取的日期」，時鐘再怎麼撥，都只看這個數字往前走。
 */

const LOGIN_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function dailyFreeEnrollCount(facilityLevel: number): number {
    const level = Number.isFinite(facilityLevel) && facilityLevel >= 1 ? Math.floor(facilityLevel) : 1;
    return Math.floor(level / 5) + 1;
}

/** 是否要發放：從未發過，或今天的登入日嚴格晚於已發放的最大日（YYYY-MM-DD 字串可直接比較） */
export function isNewEnrollGrantDay(grantedDay: string | null, today: string): boolean {
    return grantedDay === null || today > grantedDay;
}

/** 讀檔時正規化高水位；不是 YYYY-MM-DD 的值視為從未發過 */
export function normalizeEnrollGrantDay(value: unknown): string | null {
    return typeof value === 'string' && LOGIN_DAY_PATTERN.test(value) ? value : null;
}
