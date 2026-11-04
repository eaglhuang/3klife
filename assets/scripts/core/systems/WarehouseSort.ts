// @spec-source → 武將背包（倉庫）系統.md (doc_spec_0017) §E-6 物品篩選排序（PROG-2-1721）
/**
 * WarehouseSort — 主城倉庫物品的排序與清單文字（純邏輯，不依賴 cc）
 *
 * 規格 §E-6：按品質／類型／取得時間排序。
 * - 品質：UR > SSR > SR > R > N，不認得的品質排最後。
 * - 類型：虎符 → 英靈卡 → 裝備（同 InventoryProjection 的類型順序）。
 * - 取得時間：物件列沒有存取得時刻，暫以統一物件庫的列順序（新入庫的接在後面）代表，新的排前面。
 * 同分時保持原本順序（穩定排序）。
 *
 * Unity 對照：像 List.Sort 搭配 IComparer，排序規則與 UI 分開，UI 只切換用哪一個比較器。
 */
import type { InventoryItemType, InventoryRecord } from './InventoryProjection';
import { gearDefinitionOf } from './GearDefinitions';

export type WarehouseSortKey = 'quality' | 'type' | 'acquired';

/** 排序按鈕的切換順序 */
export const WAREHOUSE_SORT_KEYS: readonly WarehouseSortKey[] = ['quality', 'type', 'acquired'];

export const WAREHOUSE_SORT_LABEL: Readonly<Record<WarehouseSortKey, string>> = {
    quality: '品質',
    type: '類型',
    acquired: '取得時間',
};

/** 品質由高到低 */
export const WAREHOUSE_QUALITY_ORDER: readonly string[] = ['UR', 'SSR', 'SR', 'R', 'N'];

export const WAREHOUSE_TYPE_ORDER: readonly InventoryItemType[] = ['TALLY', 'SPIRIT_CARD', 'OTHER'];

export const WAREHOUSE_TYPE_LABEL: Readonly<Record<InventoryItemType, string>> = {
    TALLY: '虎符',
    SPIRIT_CARD: '英靈卡',
    OTHER: '裝備',
};

/** 排序按鈕按一下換下一種排序 */
export function nextWarehouseSortKey(key: WarehouseSortKey): WarehouseSortKey {
    const index = WAREHOUSE_SORT_KEYS.indexOf(key);
    return WAREHOUSE_SORT_KEYS[(index + 1) % WAREHOUSE_SORT_KEYS.length];
}

function rankOf(order: readonly string[], value: string): number {
    const index = order.indexOf(value);
    return index < 0 ? order.length : index;
}

/** 依指定方式排序，回傳新陣列；原陣列不動 */
export function sortWarehouseRecords(records: readonly InventoryRecord[], key: WarehouseSortKey): InventoryRecord[] {
    const indexed = records.map((record, index) => ({ record, index }));
    indexed.sort((a, b) => {
        let diff = 0;
        if (key === 'quality') diff = rankOf(WAREHOUSE_QUALITY_ORDER, a.record.Quality) - rankOf(WAREHOUSE_QUALITY_ORDER, b.record.Quality);
        else if (key === 'type') diff = rankOf(WAREHOUSE_TYPE_ORDER, a.record.Item_Type) - rankOf(WAREHOUSE_TYPE_ORDER, b.record.Item_Type);
        else return b.index - a.index;
        return diff || a.index - b.index;
    });
    return indexed.map((entry) => entry.record);
}

/** 清單一行：「[品質] 名稱」；裝備用定義名稱，查不到或非裝備用類型名稱；鎖定的列加註 */
export function warehouseRecordLine(record: Readonly<InventoryRecord>): string {
    const name = gearDefinitionOf(record.Gear_ID)?.name ?? WAREHOUSE_TYPE_LABEL[record.Item_Type] ?? record.Item_Type;
    const count = record.Quantity > 1 ? ` ×${record.Quantity}` : '';
    const lock = record.isLocked ? '（已鎖定）' : '';
    return `[${record.Quality}] ${name}${count}${lock}`;
}
