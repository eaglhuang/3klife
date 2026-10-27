// @spec-source → 道具系統（付費免費道具）.md §道具背包 UI（P1，顯示持有道具列表、數量、篩選分類）與 UI_ITEM_LACK「{ItemName} 不足，是否前往商城？」；ITM-10；PROG-2-1035
/**
 * ItemBagView — 道具背包的檢視模型（純邏輯，不依賴 cc）。
 *
 * - buildItemBagRows：列出背包中所有有定義名稱的道具與數量，依 ID 排序。
 * - onlyOwned 為 true 時只留持有數量大於 0 的列。
 * - 規格的「篩選分類」尚未列出分類表，本檔不自行分類；分類篩選待規格補齊後另卡。
 * - itemLackPrompt：數量不足時回傳提示內容（含商城導向），足夠時回傳 null。
 *
 * Unity 對照：像 Inventory 的 ViewModel，從 Model 的字典讀出 List<Row>，
 * 點「使用」前先檢查數量，不足就彈出 Dialog，不直接改 Model。
 */
import { ITEM_DISPLAY_NAMES, itemCount, PlayerInventory } from './PlayerInventory';

export const UI_ITEM_LACK_KEY = 'UI_ITEM_LACK';

export interface ItemBagRow {
    itemId: string;
    name: string;
    count: number;
}

export interface ItemLackPrompt {
    key: typeof UI_ITEM_LACK_KEY;
    /** 替換 {ItemName} 用的顯示名稱 */
    itemName: string;
    /** 導向商城的文字（由 UI 層以 key 查表組合） */
    text: string;
}

/** 依 ID 排序的背包列；只列有顯示名稱的道具，避免出現未定義的 ID。 */
export function buildItemBagRows(inventory: PlayerInventory, options: { onlyOwned?: boolean } = {}): ItemBagRow[] {
    const rows: ItemBagRow[] = Object.keys(ITEM_DISPLAY_NAMES)
        .sort()
        .map((itemId) => ({ itemId, name: ITEM_DISPLAY_NAMES[itemId], count: itemCount(inventory, itemId) }));
    return options.onlyOwned ? rows.filter((row) => row.count > 0) : rows;
}

/** 數量不足時回傳提示；足夠（含相等）回傳 null。 */
export function itemLackPrompt(inventory: PlayerInventory, itemId: string, need: number): ItemLackPrompt | null {
    const have = itemCount(inventory, itemId);
    if (have >= need) return null;
    const itemName = ITEM_DISPLAY_NAMES[itemId] ?? itemId;
    return { key: UI_ITEM_LACK_KEY, itemName, text: `${itemName} 不足，是否前往商城？` };
}
