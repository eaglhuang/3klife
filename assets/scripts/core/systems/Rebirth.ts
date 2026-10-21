// @spec-source → 轉蛋系統.md §F「轉生屬性上限」與 §J 名詞「轉生 / 轉數」；轉蛋與戰場武將處置系統.md §2.1「重複抽取機制」；PROG-2-0314（WBS GCH-05）
/**
 * Rebirth — 重複抽到同名武將的轉生規則（純邏輯，不依賴 cc）
 *
 * 規則：
 *   - 第一次抽到是 1 轉（初見），之後每重複抽到一次 +1 轉，最高 5 轉。
 *   - 每轉對應屬性上限與培育機會次數（轉蛋系統.md §F 表）。
 *   - 已滿 5 轉還重複抽到時，回報「溢出」，由呼叫端轉成結義點數（GCH-06 另接）。
 *
 * 屬性上限採奧義系統.md §轉生解鎖規則（1000 / 1100 / 1200 / 1350 / 1500+）。
 * 轉蛋系統.md §F 另列 1250 / 1400，兩份規格不一致，PM 裁定以奧義表為準（待辦檔記錄）。
 *
 * Unity 對照：類似 ScriptableObject 的升級表（RebirthTable），
 * 重複抽到時只改 rebirthCount 一個欄位，其餘數值由表查出來。
 */

export const MAX_REBIRTH_COUNT = 5;

export interface RebirthTierDef {
    /** 轉數 1~5 */
    rebirth: number;
    /** 屬性上限（5 轉為 1500 起跳，這裡取下限） */
    attributeCap: number;
    /** 累計培育機會次數 */
    trainingChances: number;
}

export const REBIRTH_TABLE: readonly RebirthTierDef[] = [
    { rebirth: 1, attributeCap: 1000, trainingChances: 1 },
    { rebirth: 2, attributeCap: 1100, trainingChances: 2 },
    { rebirth: 3, attributeCap: 1200, trainingChances: 3 },
    { rebirth: 4, attributeCap: 1350, trainingChances: 4 },
    { rebirth: 5, attributeCap: 1500, trainingChances: 5 },
];

/** 存檔缺欄位的舊武將視為 1 轉（已持有即至少 1 轉）；超出範圍的值夾回 1~5。 */
export function normalizeRebirthCount(value: number | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
    return Math.min(MAX_REBIRTH_COUNT, Math.max(1, Math.floor(value)));
}

export function tierOf(rebirthCount: number | undefined): RebirthTierDef {
    const count = normalizeRebirthCount(rebirthCount);
    return REBIRTH_TABLE[count - 1];
}

export interface RebirthPullResult {
    /** 重複抽後的轉數（已滿 5 轉仍為 5） */
    rebirthCount: number;
    /** 是否因已滿 5 轉而溢出（呼叫端應轉成結義點數） */
    overflow: boolean;
    attributeCap: number;
    trainingChances: number;
}

/** 重複抽到同名武將：未滿 5 轉則 +1，已滿則標記溢出。 */
export function applyDuplicatePull(currentRebirthCount: number | undefined): RebirthPullResult {
    const current = normalizeRebirthCount(currentRebirthCount);
    const overflow = current >= MAX_REBIRTH_COUNT;
    const next = overflow ? MAX_REBIRTH_COUNT : current + 1;
    const tier = tierOf(next);
    return {
        rebirthCount: next,
        overflow,
        attributeCap: tier.attributeCap,
        trainingChances: tier.trainingChances,
    };
}
