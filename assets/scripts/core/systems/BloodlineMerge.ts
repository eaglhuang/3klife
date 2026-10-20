// @spec-source → 同名武將系統.md §血脈歸宗（Merge(V1_Gene, V2_Gene)）；消耗歸宗令、名門預設家譜加成尚未定案，本模組不處理
/**
 * BloodlineMerge — 血脈歸宗的因子移植（純邏輯，不依賴 cc）
 *
 * 規格偽代碼：消耗「歸宗令」，V1 獲得 V2 的 1 個特殊因子；V2 不消失，該因子在 V2 標記為「已歸宗」。
 * 本模組只算結果：挑出要移植的因子，回傳新的兩方因子狀態。扣道具與寫存檔由呼叫端處理。
 *
 * 暫定選擇（可逆）：
 * - 移植的是 V2 中第一個 V1 尚未擁有的因子（依 V2 的排列順序），確定性、不擲骰。
 * - V2 已歸宗的因子不可再次移植給同一方。
 * - 沒有可移植的因子時回傳 null，不扣道具。
 *
 * Unity 對照：像一個純計算的 Utility，輸入兩個武將的因子清單，輸出移植結果，不改場景。
 */

export interface BloodlineSide {
    /** V1 或 V2 的特殊因子 id 清單，依獲得順序 */
    readonly factors: readonly string[];
    /** V2 已歸宗（被移植過）的因子 id；V1 通常為空 */
    readonly mergedOut: readonly string[];
}

export interface BloodlineMergeResult {
    /** 移植到 V1 的因子 id */
    readonly transferredFactor: string;
    /** V1 移植後的因子清單 */
    readonly v1Factors: readonly string[];
    /** V2 移植後的「已歸宗」清單 */
    readonly v2MergedOut: readonly string[];
}

/**
 * 計算一次血脈歸宗。
 * 回傳 null 表示 V2 沒有 V1 可以取得的因子。
 */
export function mergeBloodline(v1: BloodlineSide, v2: BloodlineSide): BloodlineMergeResult | null {
    const v1Owned = new Set(v1.factors);
    const alreadyMerged = new Set(v2.mergedOut);
    const candidate = v2.factors.find((factor) => !v1Owned.has(factor) && !alreadyMerged.has(factor));
    if (candidate === undefined) return null;
    return {
        transferredFactor: candidate,
        v1Factors: [...v1.factors, candidate],
        v2MergedOut: [...v2.mergedOut, candidate],
    };
}

/** 只看 gene 的 id；沒有 id 的 gene 不參與因子比對。 */
function factorIdsOf(general: { genes?: readonly { id?: string }[] }): string[] {
    return (general.genes ?? []).map((g) => g.id).filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export type BloodlineMergeRejectReason = 'SAME_GENERAL' | 'NO_BLOODLINE' | 'DIFFERENT_BLOODLINE' | 'NO_TRANSFERABLE';

export interface GeneralMergeInput {
    id: string;
    bloodlineId?: string;
    genes?: readonly { id?: string }[];
    mergedOutFactors?: readonly string[];
}

/**
 * 武將版本之間的血脈歸宗（BLT-11 接線用，純計算）。
 * V1 取得 V2 的一個因子；V2 的 mergedOutFactors 追加該因子。不扣歸宗令；扣令在 GameSession.mergeBloodlineFor（PROG-2-0862）。
 * 同一 Bloodline_ID 才可歸宗；缺 mergedOutFactors 視為空。
 */
export function planBloodlineMergeForGenerals(
    v1: GeneralMergeInput,
    v2: GeneralMergeInput,
):
    | { ok: true; transferredFactor: string; v1Factors: string[]; v2MergedOut: string[] }
    | { ok: false; reason: BloodlineMergeRejectReason } {
    if (v1.id === v2.id) return { ok: false, reason: 'SAME_GENERAL' };
    if (!v1.bloodlineId || !v2.bloodlineId) return { ok: false, reason: 'NO_BLOODLINE' };
    if (v1.bloodlineId !== v2.bloodlineId) return { ok: false, reason: 'DIFFERENT_BLOODLINE' };
    const result = mergeBloodline(
        { factors: factorIdsOf(v1), mergedOut: [] },
        { factors: factorIdsOf(v2), mergedOut: v2.mergedOutFactors ?? [] },
    );
    if (!result) return { ok: false, reason: 'NO_TRANSFERABLE' };
    return { ok: true, transferredFactor: result.transferredFactor, v1Factors: [...result.v1Factors], v2MergedOut: [...result.v2MergedOut] };
}
