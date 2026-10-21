// @spec-source → 道具系統（付費免費道具）.md §「道具效果引擎」與資料表 Effect_Type；WBS ITM-04；PROG-2-1012（ITM-04a）
/**
 * ItemEffectDispatcher — 道具效果派發（純邏輯，不依賴 cc）。
 *
 * - 每種 Effect_Type 註冊一個處理函式，由呼叫端接到對應子系統（精力、受孕、入學、刷新、占卜、裝備）。
 * - 未註冊的效果類型回傳原因，不丟例外，也不改任何狀態。
 * - Effect_Value 必須是正的有限數，否則拒絕且不呼叫處理函式。
 *
 * 本檔只做派發與驗證；各效果接到子系統屬於 ITM-04b。
 * Unity 對照：像 ItemSO 的 Use() 把效果委派給各系統的 Service，自己不直接改角色資料。
 */

export const ITEM_EFFECT_TYPES = [
    'RESTORE_VITALITY',
    'BOOST_CONCEPTION',
    'UNLOCK_TRAINING',
    'REFRESH',
    'ORACLE',
    'EQUIP',
] as const;

export type ItemEffectType = (typeof ITEM_EFFECT_TYPES)[number];

export type ItemEffectRejectReason = 'UNREGISTERED_EFFECT' | 'INVALID_VALUE';

export type ItemEffectResult<R> = { ok: true; result: R } | { ok: false; reason: ItemEffectRejectReason };

export type ItemEffectHandler<C, R> = (value: number, ctx: C) => R;

export interface ItemEffectDispatcher<C, R> {
    apply(effect: ItemEffectType, value: number, ctx: C): ItemEffectResult<R>;
}

export function isItemEffectType(value: unknown): value is ItemEffectType {
    return typeof value === 'string' && (ITEM_EFFECT_TYPES as readonly string[]).includes(value);
}

/** 建立派發器；handlers 缺少的類型在 apply 時回傳 UNREGISTERED_EFFECT。 */
export function createItemEffectDispatcher<C, R>(
    handlers: Partial<Record<ItemEffectType, ItemEffectHandler<C, R>>>,
): ItemEffectDispatcher<C, R> {
    return {
        apply(effect, value, ctx) {
            const handler = handlers[effect];
            if (!handler) return { ok: false, reason: 'UNREGISTERED_EFFECT' };
            if (!Number.isFinite(value) || value <= 0) return { ok: false, reason: 'INVALID_VALUE' };
            return { ok: true, result: handler(value, ctx) };
        },
    };
}

/** 回精力 50%（規格：回精力50%）：依上限取整數回復量，上限非正數時為 0。 */
export const VITALITY_RESTORE_RATE = 0.5;

export function vitalityRestoreAmount(maxVitality: number): number {
    if (!Number.isFinite(maxVitality) || maxVitality <= 0) return 0;
    return Math.floor(maxVitality * VITALITY_RESTORE_RATE);
}
