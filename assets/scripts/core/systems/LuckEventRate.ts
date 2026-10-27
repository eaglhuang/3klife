// @spec-source → 運氣系統.md (doc_spec_0035) §E-5 事件觸發率、§F「LUK 對事件觸發」
/**
 * LuckEventRate — 運氣（LUK）對隨機事件觸發率的修正（純邏輯，不依賴 cc）
 *
 * 規格：Event_Rate = Base_Rate × (1 + LUK / 200)；LUK=100 → 事件率 +50%。
 * 結果夾在 0~1；LUK 非有限數或負數視為 0（不降低事件率）。
 *
 * PM 暫定（2026-10-28，可逆）：只套在有利事件（例如培育好感），不套在受傷等不利事件。
 * Unity 對照：像一個共用的 Modifier 函式，各事件擲骰前先把基礎機率丟進來修正。
 */

/** 規格公式的分母：LUK / 200 */
export const LUK_EVENT_RATE_DIVISOR = 200;

/** 依 LUK 修正事件觸發率 */
export function luckEventRate(baseRate: number, luk: number): number {
    const base = Number.isFinite(baseRate) ? Math.max(0, baseRate) : 0;
    const safeLuk = Number.isFinite(luk) && luk > 0 ? luk : 0;
    return Math.min(1, base * (1 + safeLuk / LUK_EVENT_RATE_DIVISOR));
}
