// @spec-source → 道具系統（付費免費道具）.md §F ITEM_REFRESH 刷新券、ITEM_FERTILITY 安胎藥；ITM-04b；PROG-2-1038
/**
 * ItemUseFlow — 道具使用流程（純邏輯，不依賴 cc）。
 *
 * - 只接兩種道具：刷新券（REFRESH）與安胎藥（BOOST_CONCEPTION）。其他道具回傳 NOT_USABLE。
 * - 數量不足回傳 LACK 與商城導向的提示（沿用 ItemBagView 的 itemLackPrompt）。
 * - 刷新券：先派發效果取得新時間戳，成功才扣道具；派發失敗時背包不變。
 * - 安胎藥：扣一張並寫入 ITEM_FERTILITY_ARMED，下一次結緣成功時才生效並清除（見 GameSession.clearFertilityArm）。
 *   已經 armed 時再用一張回傳 ALREADY_ARMED，不重複累加。
 * - 不直接改 GameSession；呼叫端拿到新的 inventory 與刷新結果後自行寫回。
 *
 * Unity 對照：像 ItemSO.Use()：先檢查數量、再呼叫效果服務，效果成功才扣 Inventory 的數量。
 */
import { applyRefreshItem, RefreshItemResult } from './ItemRefreshEffect';
import { FERTILITY_CONCEPTION_MULTIPLIER } from './FertilityBoost';
import { itemLackPrompt, ItemLackPrompt } from './ItemBagView';
import { addItem, consumeItem, ITEM_FERTILITY, ITEM_FERTILITY_ARMED, ITEM_REFRESH, itemCount, PlayerInventory } from './PlayerInventory';

export type ItemUseResult =
    | { ok: false; reason: 'NOT_USABLE' }
    | { ok: false; reason: 'LACK'; prompt: ItemLackPrompt }
    | { ok: false; reason: 'ALREADY_ARMED' }
    | { ok: true; inventory: PlayerInventory; refresh?: RefreshItemResult; fertilityMultiplier?: number };

/** 可使用的道具與其效果值（刷新券一張為 1；安胎藥為受孕率倍率） */
const USABLE_ITEMS: Readonly<Record<string, number>> = Object.freeze({
    [ITEM_REFRESH]: 1,
    [ITEM_FERTILITY]: FERTILITY_CONCEPTION_MULTIPLIER,
});

export function useItem(inventory: PlayerInventory, itemId: string, nowMs: number): ItemUseResult {
    if (!Object.prototype.hasOwnProperty.call(USABLE_ITEMS, itemId)) return { ok: false, reason: 'NOT_USABLE' };

    const prompt = itemLackPrompt(inventory, itemId, 1);
    if (prompt) return { ok: false, reason: 'LACK', prompt };

    if (itemId === ITEM_REFRESH) {
        const dispatched = applyRefreshItem(USABLE_ITEMS[ITEM_REFRESH], { nowMs });
        if (!dispatched.ok) return { ok: false, reason: 'NOT_USABLE' };
        const next = consumeItem(inventory, itemId, 1);
        if (!next) return { ok: false, reason: 'LACK', prompt: itemLackPrompt(inventory, itemId, 1) as ItemLackPrompt };
        return { ok: true, inventory: next, refresh: dispatched.result };
    }

    if (itemCount(inventory, ITEM_FERTILITY_ARMED) > 0) return { ok: false, reason: 'ALREADY_ARMED' };
    const next = consumeItem(inventory, itemId, 1);
    if (!next) return { ok: false, reason: 'LACK', prompt: itemLackPrompt(inventory, itemId, 1) as ItemLackPrompt };
    return { ok: true, inventory: addItem(next, ITEM_FERTILITY_ARMED, 1), fertilityMultiplier: USABLE_ITEMS[ITEM_FERTILITY] };
}
