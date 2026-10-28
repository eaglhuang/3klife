// @spec-source → 道具系統（付費免費道具）ITM-05：取得管道與來源追蹤（SHOP／TASK／DROP／EVENT）；PROG-2-1383
/**
 * ItemAcquisitionLog — 道具取得來源紀錄（純邏輯，不依賴 cc）。
 *
 * - diffAcquisitions：比較入庫前後的數量，只取增加的部分，每筆帶來源。
 * - appendAcquisitions：接上既有紀錄，保留最後 ITEM_ACQUISITION_LOG_LIMIT 筆（暫定）。
 * - queryAcquisitions：依道具 ID 與來源篩選。
 * - normalizeAcquisitionLog：存檔讀回時濾掉壞資料；來源缺值或不認識者視為 UNKNOWN。
 *
 * 紀錄與道具數量分開存放，不改 PlayerInventory 的結構，所以既有扣除與查詢都不受影響。
 * Unity 對照：像 Inventory 旁邊掛一條 Transaction Log，每次 Add 都寫一筆來源，數量本身仍在 Model 的字典裡。
 */

export const ITEM_SOURCES = ['SHOP', 'TASK', 'DROP', 'EVENT', 'UNKNOWN'] as const;
export type ItemSource = (typeof ITEM_SOURCES)[number];

/** 暫定：存檔保留的取得紀錄筆數 */
export const ITEM_ACQUISITION_LOG_LIMIT = 200;

export interface ItemAcquisitionRecord {
    itemId: string;
    amount: number;
    source: ItemSource;
}

export interface ItemAcquisitionQuery {
    itemId?: string;
    source?: ItemSource;
}

/** 來源正規化：不認識或缺值一律為 UNKNOWN（舊檔沒有來源欄位時也走這裡）。 */
export function normalizeItemSource(value: unknown): ItemSource {
    return (ITEM_SOURCES as readonly unknown[]).includes(value) ? (value as ItemSource) : 'UNKNOWN';
}

/** 入庫前後的數量差：只取增加的部分（扣除不記錄）。 */
export function diffAcquisitions(
    before: Readonly<Record<string, number>>,
    after: Readonly<Record<string, number>>,
    source: ItemSource,
): ItemAcquisitionRecord[] {
    const ids = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
    return ids.flatMap((itemId): ItemAcquisitionRecord[] => {
        const gained = Math.floor((after[itemId] ?? 0) - (before[itemId] ?? 0));
        return gained > 0 ? [{ itemId, amount: gained, source: normalizeItemSource(source) }] : [];
    });
}

/** 接上既有紀錄並保留最後上限筆。 */
export function appendAcquisitions(
    log: readonly ItemAcquisitionRecord[],
    records: readonly ItemAcquisitionRecord[],
): ItemAcquisitionRecord[] {
    if (records.length === 0) return log.slice();
    return [...log, ...records].slice(-ITEM_ACQUISITION_LOG_LIMIT);
}

/** 依道具與來源篩選；未給的條件不篩。 */
export function queryAcquisitions(log: readonly ItemAcquisitionRecord[], query: ItemAcquisitionQuery = {}): ItemAcquisitionRecord[] {
    return log.filter((record) =>
        (query.itemId === undefined || record.itemId === query.itemId)
        && (query.source === undefined || record.source === query.source));
}

/** 存檔正規化：只留格式正確的紀錄，來源正規化，保留最後上限筆。 */
export function normalizeAcquisitionLog(raw: unknown): ItemAcquisitionRecord[] {
    if (!Array.isArray(raw)) return [];
    const records = raw.flatMap((entry): ItemAcquisitionRecord[] => {
        if (typeof entry !== 'object' || entry === null) return [];
        const { itemId, amount, source } = entry as Record<string, unknown>;
        if (typeof itemId !== 'string' || itemId.length === 0) return [];
        if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) return [];
        return [{ itemId, amount, source: normalizeItemSource(source) }];
    });
    return records.slice(-ITEM_ACQUISITION_LOG_LIMIT);
}
