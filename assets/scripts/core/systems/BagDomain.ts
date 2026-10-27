// @spec-source → 武將裝備道具系統.md §5（英靈卡不占一般倉庫格）、Data Schema §統一物件庫 Display_Bucket；BAG-10；PROG-2-1031
/**
 * BagDomain — 統一物件庫的顯示分域（純邏輯，不依賴 cc）。
 *
 * - 虎符（TALLY）與英靈卡（SPIRIT_CARD）各有自己的槽位，不進一般背包格。
 * - 一般道具（OTHER）才占用一般倉庫格。
 * - 格數以列計算：一列占一格，數量堆疊在列內，不另佔格。
 *
 * Unity 對照：像背包 UI 把物品分到不同的 Tab 容器，每個容器各自計算格數，不會把武器塞進消耗品欄。
 */
import type { InventoryRecord } from './InventoryProjection';

export type BagDomain = 'GENERAL_BAG' | 'TALLY_SLOT' | 'SPIRIT_SLOT';

export function bagDomainOf(record: Pick<InventoryRecord, 'Item_Type'>): BagDomain {
    if (record.Item_Type === 'TALLY') return 'TALLY_SLOT';
    if (record.Item_Type === 'SPIRIT_CARD') return 'SPIRIT_SLOT';
    return 'GENERAL_BAG';
}

/** 一般倉庫已占用的格數（只計 GENERAL_BAG 的列）。 */
export function countGeneralBagSlots(records: readonly InventoryRecord[]): number {
    let count = 0;
    for (const record of records) {
        if (bagDomainOf(record) === 'GENERAL_BAG') count += 1;
    }
    return count;
}
