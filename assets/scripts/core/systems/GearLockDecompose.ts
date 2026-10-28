// @spec-source → 武將背包（倉庫）系統.md §整併 第 9 項「物品鎖定/分解」與 UI_LOCK／UI_DECOMPOSE；WBS BAG-07（PROG-2-1390）
/**
 * GearLockDecompose — 物品鎖定與一般裝備分解回收（純邏輯，不依賴 cc）
 *
 * 規則（暫定，規格只寫「鎖定保護」與「分解回收材料」，沒有數值）：
 * - 鎖定的列不可分解；鎖定本身不影響穿戴，只擋分解。
 * - 只有一般裝備（Item_Type OTHER）可分解，且必須未裝備在武將身上。
 * - 分解回收固定 1 件竹簡（ITEM_BAMBOO_SLIP，材料）；稀有度換算待企劃給數值。
 *
 * Unity 對照：像 Inventory 的 Lock 旗標與 Salvage 命令：上鎖的物件 Salvage 會被擋下，成功後物件從表移除並給材料。
 */
import { addItem, ITEM_BAMBOO_SLIP, type PlayerInventory } from './PlayerInventory';
import type { InventoryRecord } from './InventoryProjection';

export const DECOMPOSE_MATERIAL_ID = ITEM_BAMBOO_SLIP;
export const DECOMPOSE_MATERIAL_AMOUNT = 1;

export type GearLockRejectReason = 'NOT_FOUND' | 'NOT_GEAR' | 'LOCKED' | 'EQUIPPED';

export type GearLockResult =
    | { ok: true; records: InventoryRecord[] }
    | { ok: false; reason: 'NOT_FOUND' };

export type GearDecomposeResult =
    | { ok: true; records: InventoryRecord[]; inventory: PlayerInventory; material: { itemId: string; amount: number } }
    | { ok: false; reason: GearLockRejectReason };

/** 設定或取消鎖定；回傳新的列陣列，不改輸入。 */
export function setRecordLocked(records: readonly InventoryRecord[], inventoryId: string, locked: boolean): GearLockResult {
    if (!records.some((record) => record.Inventory_ID === inventoryId)) return { ok: false, reason: 'NOT_FOUND' };
    return {
        ok: true,
        records: records.map((record): InventoryRecord => record.Inventory_ID === inventoryId ? { ...record, isLocked: locked } : record),
    };
}

/** 分解一件一般裝備：鎖定或裝備中都不可分解；成功則移除該列並給材料。不改輸入。 */
export function decomposeGearRecord(
    records: readonly InventoryRecord[],
    inventory: PlayerInventory,
    inventoryId: string,
): GearDecomposeResult {
    const target = records.find((record) => record.Inventory_ID === inventoryId);
    if (!target) return { ok: false, reason: 'NOT_FOUND' };
    if (target.Item_Type !== 'OTHER') return { ok: false, reason: 'NOT_GEAR' };
    if (target.isLocked === true) return { ok: false, reason: 'LOCKED' };
    if (target.equippedBy) return { ok: false, reason: 'EQUIPPED' };
    return {
        ok: true,
        records: records.filter((record) => record.Inventory_ID !== inventoryId),
        inventory: addItem(inventory, DECOMPOSE_MATERIAL_ID, DECOMPOSE_MATERIAL_AMOUNT),
        material: { itemId: DECOMPOSE_MATERIAL_ID, amount: DECOMPOSE_MATERIAL_AMOUNT },
    };
}
