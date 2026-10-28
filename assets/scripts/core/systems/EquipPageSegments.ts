// @spec-source → 武將人物介面規格書.md（寶頁 §寶：一般裝備／傳家寶／道具三段）；武將裝備道具系統 §寶 GEAR 六槽；WBS TSK-07（PROG-2-1393，PM 2026-10-28）
/**
 * EquipPageSegments — 寶頁的三段資料（純邏輯，不依賴 cc）。
 *
 * - gear：一般裝備六槽（GearPageSlots）
 * - heirloom：傳家寶卡（HeirloomCardView）
 * - items：道具摘要，取背包裡第一件持有的非寶物道具（ITEM_DEFS 順序）；沒有持有時為 null
 *
 * 暫定（規格沒寫道具摘要要挑哪一件，PM 未裁定，可逆）：以 ITEM_DEFS 順序取第一件持有的非寶物道具。
 *
 * Unity 對照：像一個 Presenter 的 ViewModel，從三個來源各取一份資料組成一個 Struct，畫面只讀這個 Struct。
 */
import type { GearSlotView } from './GearPageSlots';
import { buildHeirloomCardView, buildItemSummaryView, type HeirloomCardView, type ItemSummaryView } from './HeirloomCardView';
import { ITEM_DEFS } from './ItemDef';
import { ITEM_TREASURE, itemCount, type PlayerInventory } from './PlayerInventory';

export interface EquipPageSegments {
    gear: GearSlotView[];
    heirloom: HeirloomCardView;
    items: ItemSummaryView | null;
}

/** 道具摘要的挑選規則：ITEM_DEFS 順序中第一件持有數量大於 0 的非寶物道具；沒有則 null。 */
export function pickSummaryItemId(inventory: PlayerInventory): string | null {
    const def = ITEM_DEFS.find((item) => item.id !== ITEM_TREASURE && item.category !== '寶物' && itemCount(inventory, item.id) > 0);
    return def ? def.id : null;
}

export function buildEquipPageSegments(gear: GearSlotView[], inventory: PlayerInventory): EquipPageSegments {
    const itemId = pickSummaryItemId(inventory);
    return {
        gear,
        heirloom: buildHeirloomCardView(inventory),
        items: itemId ? buildItemSummaryView(itemId, itemCount(inventory, itemId)) : null,
    };
}
