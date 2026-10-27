/**
 * WeatherItemUseFlow — 戰場天氣道具的庫存扣除流程（PROG-2-0932 / APT-15）
 *
 * 順序：先確認庫存 → 再請戰場套用天氣 → 成功才扣庫存。
 * 戰場拒絕（同場已用過）時不扣，庫存維持原樣。
 *
 * Unity 對照：像背包 UseItem：先檢查數量，效果成功後才 Remove 一個，失敗不吃掉道具。
 */
import type { BattleController } from './BattleController';
import { consumeItem, itemCount, ITEM_WEATHER_RAIN, ITEM_WEATHER_WIND, type PlayerInventory } from '../../core/systems/PlayerInventory';
import type { WeatherItemId } from '../../core/systems/WeatherItem';

/** 天氣道具 → 庫存 id（PM 暫定 id） */
export const WEATHER_ITEM_INVENTORY_ID: Readonly<Record<WeatherItemId, string>> = {
    'wind-prayer': ITEM_WEATHER_WIND,
    'rain-charm': ITEM_WEATHER_RAIN,
};

export type WeatherItemUseResult =
    | { ok: true; inventory: PlayerInventory }
    | { ok: false; reason: 'NO_STOCK' | 'ALREADY_USED'; inventory: PlayerInventory };

/** 小選單顯示用：某種天氣道具目前剩幾個 */
export function weatherItemStock(inventory: PlayerInventory, item: WeatherItemId): number {
    return itemCount(inventory, WEATHER_ITEM_INVENTORY_ID[item]);
}

/** 使用天氣道具：庫存不足或本場已用過時不改天氣、不扣庫存。 */
export function useWeatherItemFromInventory(
    ctrl: Pick<BattleController, 'useWeatherItem'>,
    inventory: PlayerInventory,
    item: WeatherItemId,
): WeatherItemUseResult {
    const itemId = WEATHER_ITEM_INVENTORY_ID[item];
    if (itemCount(inventory, itemId) <= 0) return { ok: false, reason: 'NO_STOCK', inventory };

    const applied = ctrl.useWeatherItem(item);
    if (!applied.ok) return { ok: false, reason: 'ALREADY_USED', inventory };

    // 庫存已先確認 > 0，consumeItem 不會失敗；保險起見失敗時維持原庫存
    return { ok: true, inventory: consumeItem(inventory, itemId, 1) ?? inventory };
}
