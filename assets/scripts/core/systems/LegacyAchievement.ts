/**
 * 世代成就判定（RET-07）。純邏輯，不依賴 cc。
 *
 * 規格：docs/遊戲規格文件/系統規格書/留存系統.md §世代成就
 *   if (Descendant.hasGene(Ancestor_Gene) && Generation_Gap >= 3): 觸發成就，獎勵高級貨幣 ×100
 *
 * Unity 對照：像一個 Achievement Rule，輸入後代與祖譜，輸出每個達成的條件與獎勵，不直接發獎。
 */
import { BloodlineGraph, PEDIGREE_SLOTS, pedigreeSlotGeneration } from '../services/BloodlineGraph';

/** 世代差門檻（規格：≥ 3） */
export const LEGACY_MIN_GENERATION_GAP = 3;
/** 高級貨幣獎勵（規格：× 100） */
export const LEGACY_PREMIUM_REWARD = 100;

export interface LegacyReward {
    currency: 'premium';
    amount: number;
}

export interface LegacyAchievement {
    /** 後代 uid */
    descendantUid: string;
    /** 擁有該因子的祖先 uid */
    ancestorUid: string;
    /** 因子 id（gene-dictionary 的 id） */
    geneId: string;
    /** 世代差（祖先相對後代的世代數） */
    generationGap: number;
    reward: LegacyReward;
}

/**
 * 回傳後代達成的世代成就。
 * 同一個後代對同一個因子只計一次（暫定，見卡 PROG-2-0528）；
 * 因子以 genesOf 取得，祖譜以 graph.getPedigree 取得（目前涵蓋 3 代）。
 */
export function legacyAchievementsOf(
    graph: Pick<BloodlineGraph, 'getPedigree'>,
    descendantUid: string,
    genesOf: (uid: string) => readonly string[],
): LegacyAchievement[] {
    const descendantGenes = new Set(genesOf(descendantUid));
    if (descendantGenes.size === 0) return [];

    const pedigree = graph.getPedigree(descendantUid);
    const achieved: LegacyAchievement[] = [];
    const seenGenes = new Set<string>();

    for (const slot of PEDIGREE_SLOTS) {
        const generationGap = pedigreeSlotGeneration(slot);
        if (generationGap < LEGACY_MIN_GENERATION_GAP) continue;
        const ancestorUid = pedigree[slot];
        if (!ancestorUid || ancestorUid === descendantUid) continue;

        for (const geneId of genesOf(ancestorUid)) {
            if (!descendantGenes.has(geneId) || seenGenes.has(geneId)) continue;
            seenGenes.add(geneId);
            achieved.push({
                descendantUid,
                ancestorUid,
                geneId,
                generationGap,
                reward: { currency: 'premium', amount: LEGACY_PREMIUM_REWARD },
            });
        }
    }

    return achieved;
}
