// @spec-source → 同名武將系統.md §「血脈歸宗」Merge(V1_Gene, V2_Gene) → V1 獲得 V2 的 1 個特殊因子；V2 保留，該因子標記「已歸宗」（SAME-09，PROG-2-0858）
/**
 * BloodlineMerge — 同名武將血脈歸宗（純邏輯，不依賴 cc）
 *
 * 規則：
 *   - 消耗 1 張「歸宗令」，V1 獲得 V2 的 1 個特殊因子。
 *   - V2 不消失，但被轉移的因子在 V2 身上標記為「已歸宗」。
 *   - 只能在同 Bloodline_ID、不同 Template_ID 的版本之間進行。
 *   - 已歸宗的因子不能再次轉移；V1 已持有該因子時也拒絕。
 *
 * 暫定：規格沒有定義「特殊因子」的範圍，也沒說由誰挑選是哪一個。
 * 這裡由呼叫端傳入 geneId，本模組只檢查合法性，不做隨機或自動挑選。
 *
 * Unity 對照：像把角色 B 的技能「複製」給角色 A，原角色 B 的技能保留，
 * 只在 B 的技能上打一個 Copied 旗標，並扣掉一個消耗品。
 */

export interface MergeableGene {
    id: string;
    /** 已被歸宗轉移過 */
    merged?: boolean;
}

export interface MergeGeneral {
    templateId: string;
    bloodlineId: string;
    genes: string[];
    mergeTokens: number;
}

export interface MergeSourceGeneral {
    templateId: string;
    bloodlineId: string;
    genes: MergeableGene[];
}

export type BloodlineMergeResult =
    | { ok: true; v1: MergeGeneral; v2: MergeSourceGeneral }
    | { ok: false; reason: 'SAME_TEMPLATE' | 'BLOODLINE_MISMATCH' | 'NO_TOKEN' | 'GENE_NOT_FOUND' | 'GENE_ALREADY_MERGED' | 'GENE_ALREADY_OWNED' };

/**
 * 消耗一張歸宗令，把 V2 的指定因子轉給 V1。
 * 不合規時不改動任何輸入，回傳原因碼。
 */
export function mergeBloodlineGene(
    v1: MergeGeneral,
    v2: MergeSourceGeneral,
    geneId: string,
): BloodlineMergeResult {
    if (v1.templateId === v2.templateId) return { ok: false, reason: 'SAME_TEMPLATE' };
    if (v1.bloodlineId !== v2.bloodlineId) return { ok: false, reason: 'BLOODLINE_MISMATCH' };
    if (v1.mergeTokens < 1) return { ok: false, reason: 'NO_TOKEN' };

    const source = v2.genes.find((gene) => gene.id === geneId);
    if (!source) return { ok: false, reason: 'GENE_NOT_FOUND' };
    if (source.merged) return { ok: false, reason: 'GENE_ALREADY_MERGED' };
    if (v1.genes.includes(geneId)) return { ok: false, reason: 'GENE_ALREADY_OWNED' };

    return {
        ok: true,
        v1: {
            ...v1,
            genes: [...v1.genes, geneId],
            mergeTokens: v1.mergeTokens - 1,
        },
        v2: {
            ...v2,
            genes: v2.genes.map((gene) => (gene.id === geneId ? { ...gene, merged: true } : gene)),
        },
    };
}
