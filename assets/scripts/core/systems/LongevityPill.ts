// @spec-source → 經濟系統.md §道具表（延壽丹 壽命 +3 歲）、武將壽命系統.md E-6（延壽丹效果與限制）
/**
 * LongevityPill — 延壽丹延長武將壽命上限與扣道具（純邏輯，不依賴 cc）
 *
 * PM 暫定（2026-10-28，可逆）：
 *   - 延長量固定 +3 歲（經濟系統道具表）；壽命規格寫「1~5 歲」，待定案再改 LONGEVITY_PILL_YEARS。
 *   - 規格未寫使用次數上限，先不限。
 *   - 已陣亡武將不可使用，回傳拒絕原因、不扣道具。
 *
 * useLongevityPill 一次完成「檢查、扣道具、算新上限」，任一步不過就整體拒絕，背包與武將都不變。
 * Unity 對照：像 Inventory.Use(item, target)，條件全過才回傳新的背包與數值。
 */
import { consumeItem, ITEM_LONGEVITY_PILL, PlayerInventory } from './PlayerInventory';
import { AgingGeneral, isGeneralDead, resolveMaxLifespan } from './GeneralAging';

/** 每顆延壽丹延長的壽命上限（歲） */
export const LONGEVITY_PILL_YEARS = 3;

export type LongevityPillUseResult =
    | { readonly ok: true; readonly inventory: PlayerInventory; readonly maxLifespan: number; readonly previousMaxLifespan: number }
    | { readonly ok: false; readonly reason: 'no-item' | 'dead' };

/** 對武將使用 1 顆延壽丹；成功回傳扣完的背包與新的壽命上限 */
export function useLongevityPill(inventory: PlayerInventory, general: AgingGeneral): LongevityPillUseResult {
    if (isGeneralDead(general)) return { ok: false, reason: 'dead' };
    const next = consumeItem(inventory, ITEM_LONGEVITY_PILL, 1);
    if (!next) return { ok: false, reason: 'no-item' };
    const previousMaxLifespan = resolveMaxLifespan(general);
    return { ok: true, inventory: next, maxLifespan: previousMaxLifespan + LONGEVITY_PILL_YEARS, previousMaxLifespan };
}
