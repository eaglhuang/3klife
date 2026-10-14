// @spec-source → WBS v3 BAG-02（主城倉庫：50 格、擴容 +20、上限 200）
/**
 * WarehouseCapacity — 主城倉庫的容量與存入判斷，純邏輯，不依賴 cc。
 *
 * - 容量 = min(200, 50 + 擴容次數 × 20)。擴容次數 8 次即達上限。
 * - 存入前檢查容量，放不下就整批拒絕，不做部分存入。
 * Unity 對照：像 Inventory 的 Capacity 檢查，AddItems 先判斷剩餘格數，不夠就回傳失敗而不寫入。
 */

export const WAREHOUSE_BASE_SLOTS = 50;
export const WAREHOUSE_EXPAND_STEP = 20;
export const WAREHOUSE_MAX_SLOTS = 200;

export type WarehouseRejectReason = 'full';

export interface WarehouseStoreResult {
    ok: boolean;
    reason?: WarehouseRejectReason;
    /** 存入後的已用格數；拒絕時維持原值。 */
    usedSlots: number;
}

function assertCount(value: number, label: string): void {
    if (!Number.isInteger(value) || value < 0) throw new RangeError(`${label} 必須為非負整數`);
}

/** 依擴容次數算容量，上限 200。 */
export function warehouseCapacity(expansions: number): number {
    assertCount(expansions, '擴容次數');
    return Math.min(WAREHOUSE_MAX_SLOTS, WAREHOUSE_BASE_SLOTS + expansions * WAREHOUSE_EXPAND_STEP);
}

/** 還能不能再擴容：容量未達上限才可擴。 */
export function canExpandWarehouse(expansions: number): boolean {
    return warehouseCapacity(expansions) < WAREHOUSE_MAX_SLOTS;
}

/**
 * 嘗試存入 count 件物品。放得下才存，否則整批拒絕（reason: full）。
 * 不改輸入、不用亂數、不寫存檔。
 */
export function storeIntoWarehouse(usedSlots: number, expansions: number, count: number): WarehouseStoreResult {
    assertCount(usedSlots, '已用格數');
    assertCount(count, '存入數量');
    const capacity = warehouseCapacity(expansions);
    if (usedSlots + count > capacity) {
        return { ok: false, reason: 'full', usedSlots };
    }
    return { ok: true, usedSlots: usedSlots + count };
}
