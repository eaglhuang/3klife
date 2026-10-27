// @spec-source → 武將裝備道具系統.md §「寶 / GEAR」一般裝備六槽；武將人物介面規格書 §寶頁 2x3（PM 2026-10-27 裁定保留六槽 ID，UI 只排 2x3）；GDUI-11；PROG-2-1034
/**
 * GearPageSlots — 寶頁一般裝備 2x3 格位的檢視模型（純邏輯，不依賴 cc）。
 *
 * - 格位順序固定為 2 列 × 3 欄：上列基礎欄、下列進階欄，對應 GeneralBackpack 的六槽 ID。
 * - 每格只有三種狀態：LOCKED（未解鎖）、EMPTY（已解鎖但空）、EQUIPPED（已放入裝備）。
 * - 只排版，不改資料：槽 ID 與存檔欄位維持 GeneralBackpack 的定義，不做命名映射。
 * - 傳家寶欄與英靈卡、虎符不在這裡，由各自的頁面負責。
 *
 * Unity 對照：像把 Inventory 的六個 EquipSlot 固定排進 GridLayoutGroup（2 列 3 欄），
 * 每個 Cell 只讀 Model 的狀態，不回寫 Model。
 */
import { BASIC_EQUIP_SLOTS, ADVANCED_EQUIP_SLOTS, EquipSlot, GeneralBackpack } from './GeneralBackpack';

export const GEAR_PAGE_GRID: ReadonlyArray<ReadonlyArray<EquipSlot>> = Object.freeze([
    Object.freeze([...BASIC_EQUIP_SLOTS]),
    Object.freeze([...ADVANCED_EQUIP_SLOTS]),
]);

export type GearSlotState = 'LOCKED' | 'EMPTY' | 'EQUIPPED';

export interface GearSlotView {
    slot: EquipSlot;
    row: number;
    col: number;
    state: GearSlotState;
    /** 只有 EQUIPPED 時才有值 */
    equippedUid?: string;
}

/** 依 2x3 格位排序，回傳六個格位的檢視模型。 */
export function buildGearPageSlots(backpack: Readonly<GeneralBackpack>): GearSlotView[] {
    const unlocked = new Set<EquipSlot>(backpack.unlocked);
    const views: GearSlotView[] = [];
    GEAR_PAGE_GRID.forEach((rowSlots, row) => {
        rowSlots.forEach((slot, col) => {
            const equippedUid = backpack.equipped[slot];
            if (!unlocked.has(slot)) {
                views.push({ slot, row, col, state: 'LOCKED' });
            } else if (equippedUid) {
                views.push({ slot, row, col, state: 'EQUIPPED', equippedUid });
            } else {
                views.push({ slot, row, col, state: 'EMPTY' });
            }
        });
    });
    return views;
}
