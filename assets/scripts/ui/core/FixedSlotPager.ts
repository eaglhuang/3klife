/**
 * FixedSlotPager — 固定格式列表的分頁切片（純邏輯，不依賴 cc）
 *
 * 畫面沒有動態列表 helper，列表用固定 5 列的 label／按鈕；這裡只負責把整串資料切成「第幾頁」的 5 筆，
 * 頁碼夾在合法範圍內，並給出上一頁／下一頁是否可按。
 *
 * Unity 對照：像 ScrollView 的分頁，只把目前頁的 ItemData 交給固定的 Item 節點。
 */

export const FIXED_SLOT_PAGE_SIZE = 5;

export interface PageSlice<T> {
    items: T[];
    /** 實際使用的頁碼（從 0 開始），已夾在合法範圍內 */
    page: number;
    pageCount: number;
    hasPrev: boolean;
    hasNext: boolean;
}

/** 取得第 page 頁的資料；沒有資料時仍回傳 1 頁（空頁） */
export function pageSliceOf<T>(rows: readonly T[], page: number, size: number = FIXED_SLOT_PAGE_SIZE): PageSlice<T> {
    const pageCount = Math.max(1, Math.ceil(rows.length / size));
    const safePage = Math.min(Math.max(0, Math.floor(page)), pageCount - 1);
    const start = safePage * size;
    return {
        items: rows.slice(start, start + size),
        page: safePage,
        pageCount,
        hasPrev: safePage > 0,
        hasNext: safePage < pageCount - 1,
    };
}
