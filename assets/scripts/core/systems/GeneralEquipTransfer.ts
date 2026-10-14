// @spec-source → WBS v3 BAG-03（裝備/卸下操作：倉庫↔武將，含鎖定檢查，移動後兩端資料一致）；系統規格書：武將背包（倉庫）系統
/**
 * GeneralEquipTransfer — 主城倉庫與武將背包之間的裝備移動，純邏輯，不依賴 cc。
 *
 * - 上鎖的裝備不能移動（存入、裝備、卸下都檢查）。
 * - 移動是原子的：兩端都成功才回傳新狀態，任一端失敗就整個不變。
 * - 移動後同一 uid 只會出現在一個地方（倉庫或某武將的欄位）。
 *
 * 依賴 BAG-01（GeneralBackpack）與 BAG-02（WarehouseCapacity），型別與函式直接引用。
 * Unity 對照：像兩個 Inventory 之間的 Transfer，先 CanRemove、CanAdd，都通過才一起寫入。
 */
import { EquipSlot, GeneralBackpack, placeInBackpackSlot } from './GeneralBackpack';
import { storeIntoWarehouse } from './WarehouseCapacity';

export interface WarehouseEntry {
    uid: string;
    kind: EquipSlot;
}

export interface Warehouse {
    items: WarehouseEntry[];
}

/** 鎖定中的裝備 uid；由存檔層提供，移動前檢查。 */
export type LockedUids = ReadonlySet<string>;

export type TransferRejectReason = 'locked' | 'not-found' | 'empty-slot' | 'full' | 'slot-locked' | 'wrong-type' | 'occupied';

export interface TransferResult {
    ok: boolean;
    reason?: TransferRejectReason;
    warehouse: Warehouse;
    backpack: GeneralBackpack;
}

function rejected(reason: TransferRejectReason, warehouse: Readonly<Warehouse>, backpack: Readonly<GeneralBackpack>): TransferResult {
    return { ok: false, reason, warehouse: { items: [...warehouse.items] }, backpack: { unlocked: [...backpack.unlocked], equipped: { ...backpack.equipped } } };
}

/**
 * 把倉庫裡的裝備裝到武將的指定欄位。
 * 順序：是否上鎖 → 倉庫是否有此裝備 → 武將欄位檢查（解鎖、類型、佔用）。
 */
export function equipFromWarehouse(
    warehouse: Readonly<Warehouse>,
    backpack: Readonly<GeneralBackpack>,
    uid: string,
    slot: EquipSlot,
    locked: LockedUids,
): TransferResult {
    if (locked.has(uid)) return rejected('locked', warehouse, backpack);
    const entry = warehouse.items.find(item => item.uid === uid);
    if (!entry) return rejected('not-found', warehouse, backpack);
    const placed = placeInBackpackSlot(backpack, slot, { uid, kind: entry.kind });
    if (!placed.ok) {
        return { ...rejected(placed.reason!, warehouse, backpack) };
    }
    return {
        ok: true,
        warehouse: { items: warehouse.items.filter(item => item.uid !== uid) },
        backpack: placed.backpack,
    };
}

/**
 * 把武將指定欄位的裝備卸回倉庫。倉庫要放得下（BAG-02 的容量規則）。
 */
export function unequipToWarehouse(
    warehouse: Readonly<Warehouse>,
    backpack: Readonly<GeneralBackpack>,
    slot: EquipSlot,
    expansions: number,
    locked: LockedUids,
): TransferResult {
    const uid = backpack.equipped[slot];
    if (uid === undefined) return rejected('empty-slot', warehouse, backpack);
    if (locked.has(uid)) return rejected('locked', warehouse, backpack);
    const stored = storeIntoWarehouse(warehouse.items.length, expansions, 1);
    if (!stored.ok) return rejected('full', warehouse, backpack);
    const equipped = { ...backpack.equipped };
    delete equipped[slot];
    return {
        ok: true,
        warehouse: { items: [...warehouse.items, { uid, kind: slot }] },
        backpack: { unlocked: [...backpack.unlocked], equipped },
    };
}

/** 某 uid 在倉庫與所有武將欄位中出現的次數；移動後必須為 0 或 1。 */
export function countItemCopies(uid: string, warehouse: Readonly<Warehouse>, backpacks: readonly Readonly<GeneralBackpack>[]): number {
    const inWarehouse = warehouse.items.filter(item => item.uid === uid).length;
    const onGenerals = backpacks.reduce((sum, bp) => sum + Object.values(bp.equipped).filter(equippedUid => equippedUid === uid).length, 0);
    return inWarehouse + onGenerals;
}
