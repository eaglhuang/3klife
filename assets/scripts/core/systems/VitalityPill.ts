// @spec-source → 經濟系統.md §道具表（補元散 精力 +50、高級補元散 精力 +100）、§道具系統 P0；數值系統精力上限沿用 VitalityCap.ts
/**
 * VitalityPill — 補元散的精力回復與扣道具（純邏輯，不依賴 cc）
 *
 * 規格：補元散 +50、高級補元散 +100，回復後不超過精力上限。
 * PM 暫定（2026-10-14 23:58Z，可逆）：精力已滿時不可使用，回傳拒絕原因、不扣道具，避免浪費。
 * 售價先不做。
 *
 * useVitalityPill 一次完成「檢查精力、扣道具、算回復」，任一步不過就整體拒絕，背包與精力都不變。
 * Unity 對照：像 Inventory.Use(item)，先檢查條件，全部通過才回傳新的背包與數值。
 */
import { consumeItem, ITEM_PREMIUM_VITALITY_PILL, ITEM_VITALITY_PILL, itemCount, PlayerInventory } from './PlayerInventory';
import { createItemEffectDispatcher } from './ItemEffectDispatcher';

export type VitalityPillKind = 'vitalityPill' | 'premiumVitalityPill';

/** 道具回復量表（經濟系統 §道具表） */
export const VITALITY_PILL_RESTORE: Readonly<Record<VitalityPillKind, number>> = {
    vitalityPill: 50,
    premiumVitalityPill: 100,
};

const PILL_ITEM_ID: Readonly<Record<VitalityPillKind, string>> = {
    vitalityPill: ITEM_VITALITY_PILL,
    premiumVitalityPill: ITEM_PREMIUM_VITALITY_PILL,
};

/** 有效精力與上限：非有限數視為 0，上限夾成非負整數 */
function sanitize(current: number, max: number): { current: number; max: number } {
    const safeMax = Number.isFinite(max) && max > 0 ? Math.floor(max) : 0;
    const safeCurrent = Number.isFinite(current) ? Math.max(0, Math.floor(current)) : 0;
    return { current: safeCurrent, max: safeMax };
}

/** 道具效果派發器的精力處理（ITM-04b）：RESTORE_VITALITY 的效果值為回復量，結果夾在上限內。 */
const vitalityEffects = createItemEffectDispatcher<{ current: number; max: number }, number>({
    RESTORE_VITALITY: (value, ctx) => Math.min(ctx.max, ctx.current + value),
});

/**
 * 使用一個補元散後的精力（只算數值，不扣道具）。
 * current 無效視為 0；max 無效視為 0；結果夾在 0 到 max 之間。
 * 回復量經由 ItemEffectDispatcher 派發（RESTORE_VITALITY）。
 */
export function applyVitalityPill(current: number, max: number, kind: VitalityPillKind): number {
    const s = sanitize(current, max);
    const result = vitalityEffects.apply('RESTORE_VITALITY', VITALITY_PILL_RESTORE[kind], s);
    // 回復量來自內建表，必為正數；派發失敗時維持精力不變，不拋例外
    return result.ok === true ? result.result : s.current;
}

export type VitalityPillRejectReason = 'no-item' | 'vitality-full';

export type VitalityPillUseResult =
    | { readonly ok: true; readonly inventory: PlayerInventory; readonly vitality: number; readonly restored: number }
    | { readonly ok: false; readonly reason: VitalityPillRejectReason };

/**
 * 使用補元散：精力已滿或沒有道具時拒絕（回傳原因，背包與精力不變）；
 * 通過時扣 1 個道具並回傳新精力。
 */
export function useVitalityPill(
    inventory: PlayerInventory,
    current: number,
    max: number,
    kind: VitalityPillKind,
): VitalityPillUseResult {
    const s = sanitize(current, max);
    const itemId = PILL_ITEM_ID[kind];
    if (itemCount(inventory, itemId) < 1) return { ok: false, reason: 'no-item' };
    if (s.current >= s.max) return { ok: false, reason: 'vitality-full' };
    const next = consumeItem(inventory, itemId, 1);
    if (next === null) return { ok: false, reason: 'no-item' };
    const vitality = applyVitalityPill(s.current, s.max, kind);
    return { ok: true, inventory: next, vitality, restored: vitality - s.current };
}
