// @spec-source → 武將裝備道具系統_實作任務清單.md §4.1（TSK-04：寶頁 HeirloomCard / ItemSummaryCard）；PROG-2-1389
/**
 * HeirloomCardView — 寶頁「傳家寶」卡與道具摘要卡的顯示資料（純邏輯，不依賴 cc）
 *
 * 暫定（PM 待裁）：
 * - 傳家寶目前只有倉庫數量（ITEM_TREASURE 計數），還沒有綁定到單一武將，所以卡片顯示全倉庫的數量。
 * - 欄位只含顯示所需的文字，不含按鈕行為；按鈕與互動另案。
 *
 * Unity 對照：像 ScriptableObject 的資料，卡片 Prefab 只負責顯示，不自己算數量。
 */
import { itemDefOf } from './ItemDef';
import { ITEM_TREASURE, itemCount, type PlayerInventory } from './PlayerInventory';

export interface HeirloomCardView {
    itemId: string;
    /** OWNED：倉庫有傳家寶；NONE：一件都沒有 */
    state: 'OWNED' | 'NONE';
    count: number;
    title: string;
    countLine: string;
}

export interface ItemSummaryView {
    itemId: string;
    /** KNOWN：定義表有這個道具；UNKNOWN：找不到定義，顯示 ID 而不是默默吞掉 */
    state: 'KNOWN' | 'UNKNOWN';
    name: string;
    category: string;
    rarityLabel: string;
    countLine: string;
}

export function buildHeirloomCardView(inventory: PlayerInventory): HeirloomCardView {
    const count = itemCount(inventory, ITEM_TREASURE);
    const def = itemDefOf(ITEM_TREASURE);
    return {
        itemId: ITEM_TREASURE,
        state: count > 0 ? 'OWNED' : 'NONE',
        count,
        title: def?.name ?? '傳家寶物',
        countLine: count > 0 ? `倉庫 ×${count}` : '尚未取得',
    };
}

export function buildItemSummaryView(itemId: string, count: number): ItemSummaryView {
    const def = itemDefOf(itemId);
    if (!def) {
        return {
            itemId,
            state: 'UNKNOWN',
            name: itemId,
            category: '未知',
            rarityLabel: '—',
            countLine: `×${count}`,
        };
    }
    return {
        itemId,
        state: 'KNOWN',
        name: def.name,
        category: def.category,
        rarityLabel: `稀有度 ${def.rarity}`,
        countLine: `×${count}`,
    };
}
