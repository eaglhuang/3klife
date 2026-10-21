// @spec-source → 奧義系統.md §子嗣奧義覺醒；WBS ULT-15
/**
 * ChildUltimateAwaken — 子嗣奧義覺醒的機率與繼承紀錄（純邏輯，不依賴 cc）
 *
 * 規格（偽碼）：子嗣遺傳到對應的綠色因子時，培育中以 green_gene_level × 0.05 擲覺醒，
 * 成功則解鎖父方奧義（level=1），並標記為繼承與來源父方。
 *
 * 暫定選擇（可逆）：
 *   - 「對應綠色因子」的判定由呼叫端先算好（hasMatchingGreenGene），本模組只負責機率與紀錄。
 *   - 機率夾在 [0, 1]；等級非有限數或 ≤ 0 時機率為 0。
 *   - 同一個奧義只記一次，重複覺醒不會再加一筆。
 *
 * 尚未接線：培育回合的呼叫端與子嗣奧義的存檔欄位（Is_Inherited、Source_Parent_UID）待後續卡。
 */

export const CHILD_ULT_AWAKEN_PER_LEVEL = 0.05;

export interface InheritedUltimate {
    ultimateId: string;
    /** 覺醒時固定為 1 */
    level: 1;
    isInherited: true;
    sourceParentUid: string;
}

/** 綠色因子等級 × 0.05，夾在 [0, 1] */
export function childUltimateAwakenChance(greenGeneLevel: number): number {
    if (!Number.isFinite(greenGeneLevel) || greenGeneLevel <= 0) return 0;
    return Math.min(1, greenGeneLevel * CHILD_ULT_AWAKEN_PER_LEVEL);
}

/** 有對應綠色因子時以 roll（0 ≤ roll < 1）比較機率；沒有對應因子一律不覺醒。 */
export function rollChildUltimateAwaken(greenGeneLevel: number, hasMatchingGreenGene: boolean, roll: number): boolean {
    if (!hasMatchingGreenGene) return false;
    return roll < childUltimateAwakenChance(greenGeneLevel);
}

/** 把覺醒的父方奧義加入子嗣清單；已有同一奧義時不重複加，不修改輸入。 */
export function unlockInheritedUltimate(
    owned: readonly InheritedUltimate[],
    ultimateId: string,
    sourceParentUid: string,
): { list: InheritedUltimate[]; added: boolean } {
    if (owned.some((u) => u.ultimateId === ultimateId)) {
        return { list: [...owned], added: false };
    }
    const entry: InheritedUltimate = { ultimateId, level: 1, isInherited: true, sourceParentUid };
    return { list: [...owned, entry], added: true };
}
