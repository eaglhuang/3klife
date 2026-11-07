// @spec-source → 奧義系統.md §子嗣奧義覺醒；WBS ULT-15
// @spec-source → 子嗣家傳奧義覺醒與因子機率規格書.md (doc_spec_0340) §2.1 覺醒公式、§3 繼承紀錄（PROG-2-2025）
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

/** 奧義母表中與繼承有關的兩個欄位（ultimate-definitions.json 的 id 與 inheritanceGeneId） */
export interface ChildUltimateDefinition {
    ultimateId: string;
    inheritanceGeneId: string;
}

/** 子嗣的基因（只看覺醒判定用到的欄位；type 即因子顏色） */
export interface ChildUltimateGene {
    id: string;
    type: string;
    level: number;
}

export interface ChildUltimateParent {
    parentUid: string;
    ultimateIds: readonly string[];
}

export interface ChildUltimateCandidate {
    ultimateId: string;
    sourceParentUid: string;
    greenGeneLevel: number;
}

/**
 * 找出子嗣可以擲覺醒的父方奧義：奧義的 inheritanceGeneId 必須是子嗣遺傳到的綠色因子。
 * 父方的奧義沒有在母表中找到、或子嗣沒有對應綠色因子時略過。
 */
export function childUltimateCandidates(
    child: { genes: readonly ChildUltimateGene[] },
    parents: readonly ChildUltimateParent[],
    definitions: readonly ChildUltimateDefinition[],
): ChildUltimateCandidate[] {
    const out: ChildUltimateCandidate[] = [];
    for (const parent of parents) {
        for (const ultimateId of parent.ultimateIds) {
            const def = definitions.find((d) => d.ultimateId === ultimateId);
            if (!def) continue;
            const gene = child.genes.find((g) => g.id === def.inheritanceGeneId && g.type === 'green');
            if (!gene) continue;
            out.push({ ultimateId, sourceParentUid: parent.parentUid, greenGeneLevel: gene.level });
        }
    }
    return out;
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

// ── doc_spec_0340：保底＋親密度＋上限的覺醒公式與完整繼承紀錄（PROG-2-2025）──
// 培育流程目前仍呼叫 rollChildUltimateAwaken（只算等級 × 0.05）；是否切換到下方公式待裁決。

/** §2.1 參數：保底、每級加成、親密度門檻與加成、單次上限 */
export const CHILD_ULT_AWAKEN_TUNING = {
    baseRate: 0.05,
    perGreenLevel: 0.05,
    affinityThreshold: 80,
    affinityBonus: 0.10,
    cap: 0.80,
} as const;

/** §3：家傳奧義的精力折扣（扣減 20%） */
export const INHERITED_ULT_VITALITY_DISCOUNT = 0.20;

/** §3：帶世代與精力折扣的繼承紀錄 */
export interface InheritedUltimateRecord {
    ultimateId: string;
    isInherited: true;
    sourceParentUid: string;
    /** 距初祖世代差；1 代表嫡子 */
    inheritedGen: number;
    vitalityCostDiscount: number;
}

export interface ChildAwakenContext {
    childUid: string;
    parentUid: string;
    parentUltimateId: string;
    greenGeneLevel: number;
    parentAffinity: number;
    /** 由入學種子的確定性亂數提供，範圍 [0, 1) */
    randomRoll: number;
    /** 父方本身是繼承來的奧義時傳入父方世代；省略視為初祖 0 */
    parentInheritedGen?: number;
}

/** §2.1：min(上限, 保底 + 綠色等級 × 0.05 + 親密度加成)；等級非有限數或為負時視為 0 */
export function childUltimateAwakenProbability(greenGeneLevel: number, parentAffinity: number): number {
    const t = CHILD_ULT_AWAKEN_TUNING;
    const level = Number.isFinite(greenGeneLevel) && greenGeneLevel > 0 ? greenGeneLevel : 0;
    const affinity = Number.isFinite(parentAffinity) && parentAffinity >= t.affinityThreshold ? t.affinityBonus : 0;
    return Math.min(t.cap, t.baseRate + level * t.perGreenLevel + affinity);
}

/** §2.1／§3：擲覺醒，成功回傳繼承紀錄，失敗回傳 null */
export function evaluateUltimateAwakening(ctx: ChildAwakenContext): InheritedUltimateRecord | null {
    if (!(ctx.randomRoll < childUltimateAwakenProbability(ctx.greenGeneLevel, ctx.parentAffinity))) return null;
    const parentGen = Number.isInteger(ctx.parentInheritedGen) && (ctx.parentInheritedGen as number) > 0 ? (ctx.parentInheritedGen as number) : 0;
    return {
        ultimateId: ctx.parentUltimateId,
        isInherited: true,
        sourceParentUid: ctx.parentUid,
        inheritedGen: parentGen + 1,
        vitalityCostDiscount: INHERITED_ULT_VITALITY_DISCOUNT,
    };
}
