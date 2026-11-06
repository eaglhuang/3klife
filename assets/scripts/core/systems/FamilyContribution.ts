// @spec-source → 英靈世家系統 §E-5 主卡標籤、§E-6 家族供養與單一公式（SPI-06，PROG-2-1927）
/**
 * FamilyContribution — 家族供養只灌當前主卡（純邏輯，不依賴 cc）。
 *
 * - CardGrowth = min(CardCapRemaining, FamilyContributionPool)。
 * - 主卡封頂後剩下的池保留，等下次切換主卡再用；不拆給副卡。
 * - 同家族（Spirit_Family_Key）沒有主卡時不灌，池原樣保留。
 *
 * 暫定：卡上成長欄位用 Attributes.Card_Growth／Card_Growth_Cap（本卡新增選填欄位，待英靈卡資料表對帳）；
 * 池溢出轉 Family_Fame／Family_Depth 的比例規格未定，另卡。
 * Unity 對照：像把共用資源池倒進目前選中的那個角色，倒滿就停、剩下留在池裡。
 */
import type { InventoryRecord } from './InventoryProjection';

export interface FamilyGrowthSettlement {
    cardGrowth: number;
    poolRemaining: number;
}

function nonNegative(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/** CardGrowth = min(剩餘上限, 家族池)；回傳本次成長與剩餘池。 */
export function settleFamilyGrowth(cardCapRemaining: number, pool: number): FamilyGrowthSettlement {
    const cap = nonNegative(cardCapRemaining);
    const available = nonNegative(pool);
    const cardGrowth = Math.min(cap, available);
    return { cardGrowth, poolRemaining: available - cardGrowth };
}

/** 找家族的主卡（英靈卡列、同 Spirit_Family_Key、isPrimary = true）。 */
export function findFamilyPrimaryCard(records: readonly InventoryRecord[], familyKey: string): InventoryRecord | null {
    return records.find((r) => r.Item_Type === 'SPIRIT_CARD'
        && r.Attributes['Spirit_Family_Key'] === familyKey && r.isPrimary === true) ?? null;
}

/** 把家族池灌進主卡：只改主卡那一列的 Card_Growth；回傳新列陣列與剩餘池。不改輸入。 */
export function feedFamilyPrimaryCard(
    records: readonly InventoryRecord[], familyKey: string, pool: number,
): { records: InventoryRecord[]; cardGrowth: number; poolRemaining: number; primaryId: string | null } {
    const primary = findFamilyPrimaryCard(records, familyKey);
    if (!primary) return { records: records.slice(), cardGrowth: 0, poolRemaining: nonNegative(pool), primaryId: null };
    const growth = nonNegative(primary.Attributes['Card_Growth']);
    const cap = nonNegative(primary.Attributes['Card_Growth_Cap']);
    const settled = settleFamilyGrowth(cap - growth, pool);
    const next = records.map((r) => r === primary
        ? { ...r, Attributes: { ...r.Attributes, Card_Growth: growth + settled.cardGrowth } } as InventoryRecord
        : r);
    return { records: next, cardGrowth: settled.cardGrowth, poolRemaining: settled.poolRemaining, primaryId: primary.Inventory_ID };
}
