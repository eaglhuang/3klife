// @spec-source → 道具系統（付費免費道具）.md §掛機產出公式（daily_free_enroll）；WBS ITM-06；PM 暫定（facility_level＝太守府等級、登入切日發放）；PROG-2-1374
/**
 * DailyFreeEnroll — 掛機產出的每日免費入學令張數（純邏輯，不依賴 cc）。
 *
 * - 公式：daily_free_enroll = floor(facility_level / 5) + 1，基礎 1~2 張（等級 1–9）。
 * - facility_level 暫定為太守府等級（PM 裁定）；非有限數或小於 1 的等級視為 1。
 * - 發放時點由 GameSession 在登入切日時呼叫，同一登入日只發一次。
 *
 * Unity 對照：像 Idle 遊戲的離線收益表，用等級算出每天掉落的數量，每天開一次登入時結算一次。
 */

export function dailyFreeEnrollCount(facilityLevel: number): number {
    const level = Number.isFinite(facilityLevel) && facilityLevel >= 1 ? Math.floor(facilityLevel) : 1;
    return Math.floor(level / 5) + 1;
}
