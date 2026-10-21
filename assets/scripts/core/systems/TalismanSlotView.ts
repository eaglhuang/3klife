// @spec-source → 武將人物介面規格書 §10「Equipped_Tally_UID（兵）」、§12 狀態；統一物件庫 DS-08；PROG-2-1026
/**
 * TalismanSlotView — 兵分頁虎符槽的讀取（純邏輯，不依賴 cc）。
 *
 * - 只讀 InventoryViews（統一物件庫推導的視圖），不直接讀 _tallyCards 或持有表。
 * - 同一武將多筆虎符時依 Tally_ID 排序取第一筆，結果固定。
 *
 * Unity 對照：像從總表查「這個角色身上掛的道具」，槽位 UI 只顯示查到的一筆，不自己保存一份。
 */
import type { InventoryViews } from './InventoryProjection';
import type { TalismanInventoryEntry } from './ReadModelValidators';

export type TalismanSlotView =
    | { state: 'EQUIPPED'; talisman: TalismanInventoryEntry }
    | { state: 'EMPTY' };

/** 武將裝備中的虎符；沒有則回傳 EMPTY。 */
export function equippedTalismanSlot(views: InventoryViews, generalId: string): TalismanSlotView {
    const equipped = Object.values(views.talismans)
        .filter((entry) => entry.Equipped_General_UID === generalId)
        .sort((a, b) => (a.Tally_ID < b.Tally_ID ? -1 : a.Tally_ID > b.Tally_ID ? 1 : 0));
    return equipped.length > 0 ? { state: 'EQUIPPED', talisman: { ...equipped[0] } } : { state: 'EMPTY' };
}
