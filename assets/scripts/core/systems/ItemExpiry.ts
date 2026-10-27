// @spec-source → 道具系統（付費免費道具）.md §過期道具處理（P2）、UI_ITEM_EXPIRE；WBS ITM-08；PROG-2-1351
/**
 * ItemExpiry — 限時道具到期判定與回收（純 TS，不依賴 cc）。
 *
 * - expireAt 為 null 表示永久，永不過期。
 * - 到期判定：nowMs >= expireAt 即過期（暫定，規格未寫邊界）。
 * - expireAt 不是有限數字時視為無法判定，保留該道具，不刪除資料。
 * - 回傳新陣列，不改動傳入的道具；通知文字（UI_ITEM_EXPIRE）由呼叫端的 UI 處理。
 *
 * Unity 對照：像一個定時掃描的 Manager，每次掃描把超過到期時間的物件從背包移出，回傳被移除的清單給 UI 顯示。
 */

export interface ExpirableItem {
    id: string;
    /** 過期時間（毫秒時戳）；null 表示永久。 */
    expireAt: number | null;
}

export interface ItemExpirySweep<T> {
    /** 仍有效的道具（含永久與無法判定者）。 */
    kept: T[];
    /** 本次判定為過期並回收的道具。 */
    expired: T[];
}

/** 統一物件庫的列以選填的 expiresAt 表示到期；缺欄位或 null 即永久（PROG-2-1355）。 */
export interface ExpirableRecord {
    expiresAt?: number | null;
}

function isExpired(expireAt: number | null, nowMs: number): boolean {
    if (expireAt === null) return false;
    if (!Number.isFinite(expireAt)) return false;
    return nowMs >= expireAt;
}

function sweepBy<T>(items: readonly T[], expireAtOf: (item: T) => number | null, nowMs: number): ItemExpirySweep<T> {
    const kept: T[] = [];
    const expired: T[] = [];
    for (const item of items) {
        if (isExpired(expireAtOf(item), nowMs)) {
            expired.push(item);
        } else {
            kept.push(item);
        }
    }
    return { kept, expired };
}

/** 依現在時間把道具分成仍有效與已過期兩組；兩組都保留原本的順序。 */
export function sweepExpiredItems<T extends ExpirableItem>(items: readonly T[], nowMs: number): ItemExpirySweep<T> {
    return sweepBy(items, (item) => item.expireAt, nowMs);
}

/** 依現在時間掃描統一物件庫的列：expiresAt 缺欄位即永久，不補值。 */
export function sweepExpiredRecords<T extends ExpirableRecord>(records: readonly T[], nowMs: number): ItemExpirySweep<T> {
    return sweepBy(records, (record) => record.expiresAt ?? null, nowMs);
}
