// @spec-source → 武將人物介面規格書 §寶頁 2x3 格位；武將裝備道具系統 §「寶 / GEAR」一般裝備六槽；PM 2026-10-27 裁定：裝備存在統一物件庫，武將背包是依 uid 篩出的視圖；PROG-2-1044
/**
 * GearPickerView — 寶頁格位點擊後的選取清單檢視模型（純邏輯，不依賴 cc）。
 *
 * - buildGearPickerRows：列出可放進該格的一般裝備。已裝在其他武將身上的不列出（需先在那位武將卸下）。
 * - 可否放入由呼叫端傳入 slotOfGear（定義 id → 槽位，通常查一般裝備定義表）；查無定義即不列出。
 * - hasEquippedInSlot：該格目前是否有這位武將的裝備，用來決定要不要顯示「卸下」。
 *
 * Unity 對照：像 Equip 介面的 ItemPicker，只從背包總表篩出符合槽位的項目，不改背包。
 */
import { EquipSlot } from './GeneralBackpack';
import { gearDefinitionOf } from './GearDefinitions';
import type { InventoryRecord } from './InventoryProjection';

export interface GearPickerRow {
    gearUid: string;
    name: string;
}

/** 列出可放進 slotId 的一般裝備（依 Inventory_ID 排序）；已裝在其他武將身上的不列。 */
export function buildGearPickerRows(
    records: readonly InventoryRecord[],
    generalUid: string,
    slotId: EquipSlot,
    slotOfGear: (gearId: string | null | undefined) => EquipSlot | undefined = (gearId) => gearDefinitionOf(gearId)?.slot,
): GearPickerRow[] {
    return records
        .filter((record) => record.Item_Type === 'OTHER')
        .filter((record) => !record.equippedBy || record.equippedBy === generalUid)
        .filter((record) => slotOfGear(record.Gear_ID) === slotId)
        .map((record) => ({ gearUid: record.Inventory_ID, name: gearDefinitionOf(record.Gear_ID)?.name ?? record.Inventory_ID }))
        .sort((a, b) => (a.gearUid < b.gearUid ? -1 : a.gearUid > b.gearUid ? 1 : 0));
}

/** 這位武將的該格目前是否有裝備。 */
export function hasEquippedInSlot(records: readonly InventoryRecord[], generalUid: string, slotId: EquipSlot): boolean {
    return records.some((record) => record.Item_Type === 'OTHER' && record.equippedBy === generalUid && record.slotId === slotId);
}
