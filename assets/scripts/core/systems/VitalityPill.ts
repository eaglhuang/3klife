// @spec-source → 經濟系統.md §道具表（補元散 精力 +50、高級補元散 精力 +100）、§道具系統 P0；數值系統精力上限沿用 VitalityCap.ts
/**
 * VitalityPill — 補元散的精力回復（純邏輯，不依賴 cc）
 *
 * 規格：補元散 +50、高級補元散 +100，回復後不超過精力上限。
 * 本模組只算結果：輸入目前精力與上限，輸出回復後的精力。扣道具與寫存檔由呼叫端處理。
 *
 * 暫定選擇（可逆）：精力已達上限時仍照常消耗，回復量為 0（規格未寫禁止使用）。
 *
 * Unity 對照：像 ScriptableObject 的道具表，ApplyPill 只回傳新的數值，不改場景。
 */

export type VitalityPillKind = 'vitalityPill' | 'premiumVitalityPill';

/** 道具回復量表（經濟系統 §道具表） */
export const VITALITY_PILL_RESTORE: Readonly<Record<VitalityPillKind, number>> = {
    vitalityPill: 50,
    premiumVitalityPill: 100,
};

/**
 * 使用一個補元散後的精力。
 * current 無效（非有限數）視為 0；max 無效視為 0；結果夾在 0 到 max 之間。
 */
export function applyVitalityPill(current: number, max: number, kind: VitalityPillKind): number {
    const safeMax = Number.isFinite(max) && max > 0 ? Math.floor(max) : 0;
    const safeCurrent = Number.isFinite(current) ? Math.max(0, Math.floor(current)) : 0;
    return Math.min(safeMax, safeCurrent + VITALITY_PILL_RESTORE[kind]);
}
