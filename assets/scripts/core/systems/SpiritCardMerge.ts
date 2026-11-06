// @spec-source → 英靈世家系統 D-2 唯一性原則、D-3 屬性覆蓋規則（SPI-02，PROG-2-1922）
/**
 * SpiritCardMerge — 同一名將模板只留 1 張英靈卡；再次死亡時覆蓋舊卡而不新增（純邏輯，不依賴 cc）。
 *
 * 覆蓋規則（D-3）：
 * - 核心數值 Final_Stats 逐項取高者（FinalStat = max(舊卡, 新死亡快照)）。
 * - LineageScore 累加（舊值 + 本次死亡貢獻）。
 * - 祖靈階位 Ancestor_Tier 不倒退（取高者）。
 * - 其他欄位（主卡旗標、裝配者、陳列狀態等）保留舊卡，不因新死亡結算而清空。
 *
 * 暫定：Final_Stats（數值物件）與 Ancestor_Tier（數字）為本卡新增的選填 Attributes 欄位名，待英靈卡資料表對帳。
 * Unity 對照：像資料庫的 upsert，用模板 id 當主鍵合併，而不是 Instantiate 第二份。
 */
import type { InventoryRecord } from './InventoryProjection';

function isSpiritCardOf(record: InventoryRecord, templateId: string): boolean {
    return record.Item_Type === 'SPIRIT_CARD' && record.Attributes['General_Template_ID'] === templateId;
}

function numberRecord(value: unknown): Record<string, number> {
    const out: Record<string, number> = {};
    if (!value || typeof value !== 'object') return out;
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
    }
    return out;
}

function finiteOr(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** 依 D-3 合併：舊卡為底，數值取高、LineageScore 累加、階位取高。不改輸入。 */
export function mergeSpiritCard(existing: Readonly<InventoryRecord>, incoming: Readonly<InventoryRecord>): InventoryRecord {
    const oldStats = numberRecord(existing.Attributes['Final_Stats']);
    const newStats = numberRecord(incoming.Attributes['Final_Stats']);
    const stats: Record<string, number> = { ...oldStats };
    for (const [key, v] of Object.entries(newStats)) stats[key] = Math.max(stats[key] ?? v, v);
    const attributes: Record<string, unknown> = {
        ...existing.Attributes,
        LineageScore: finiteOr(existing.Attributes['LineageScore'], 0) + finiteOr(incoming.Attributes['LineageScore'], 0),
    };
    if (Object.keys(stats).length > 0) attributes['Final_Stats'] = stats;
    const oldTier = existing.Attributes['Ancestor_Tier'];
    const newTier = incoming.Attributes['Ancestor_Tier'];
    if (typeof oldTier === 'number' || typeof newTier === 'number') {
        attributes['Ancestor_Tier'] = Math.max(finiteOr(oldTier, 0), finiteOr(newTier, 0));
    }
    return { ...existing, Attributes: attributes } as InventoryRecord;
}

/**
 * 死亡發英靈卡：同模板已有英靈卡就覆蓋那一列（保留原 Inventory_ID），否則新增。
 * 回傳新的物件庫列陣列與是否為覆蓋；不改輸入。
 */
export function upsertSpiritCard(
    records: readonly InventoryRecord[], incoming: Readonly<InventoryRecord>,
): { records: InventoryRecord[]; merged: boolean } {
    const templateId = incoming.Attributes['General_Template_ID'];
    const index = typeof templateId === 'string' ? records.findIndex((r) => isSpiritCardOf(r, templateId)) : -1;
    if (index < 0) return { records: [...records, { ...incoming } as InventoryRecord], merged: false };
    const next = records.slice();
    next[index] = mergeSpiritCard(records[index], incoming);
    return { records: next, merged: true };
}
