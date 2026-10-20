// @spec-source → 同名武將系統.md §「戰魂寄宿」Soul_Fragment.TP = Dead_General.Total_TP × 0.2、可注入同 Bloodline_ID 的其他版本（SAME-08，PROG-2-0857）
/**
 * SoulTransfer — 同名武將死亡後的戰魂寄宿（純邏輯，不依賴 cc）
 *
 * 規則：
 *   - 死亡武將產生 Soul_Fragment，TP = Total_TP × 0.2。
 *   - 只能注入「同 Bloodline_ID、不同 Template_ID」的其他版本；跨血源或注入自己都拒絕。
 *   - 注入後目標武將 TP 增加該數值。
 *
 * 暫定：規格未說明小數如何處理，這裡採無條件捨去（Math.floor），待 PM 確認。
 *
 * Unity 對照：像死亡時掉落一顆 ScriptableObject 道具，只能拖到同系列的另一個角色身上，
 * 拖放時在 OnDrop 裡檢查 seriesId 是否相同。
 */

export const SOUL_TRANSFER_RATIO = 0.2;

export interface SoulTransferGeneral {
    templateId: string;
    bloodlineId: string;
    tp: number;
}

export interface SoulFragment {
    fromTemplateId: string;
    bloodlineId: string;
    tp: number;
}

export type SoulInjectResult =
    | { ok: true; target: SoulTransferGeneral; amount: number }
    | { ok: false; reason: 'SAME_TEMPLATE' | 'BLOODLINE_MISMATCH' };

/** 死亡武將的 Total_TP 轉成戰魂碎片的 TP。 */
export function createSoulFragment(dead: { templateId: string; bloodlineId: string; totalTp: number }): SoulFragment {
    if (!Number.isFinite(dead.totalTp) || dead.totalTp < 0) {
        throw new RangeError(`totalTp 必須是非負有限數字，收到 ${String(dead.totalTp)}`);
    }
    return {
        fromTemplateId: dead.templateId,
        bloodlineId: dead.bloodlineId,
        tp: Math.floor(dead.totalTp * SOUL_TRANSFER_RATIO),
    };
}

/** 把戰魂碎片注入目標武將；不合規時不改動目標，回傳原因。 */
export function injectSoulFragment(target: SoulTransferGeneral, fragment: SoulFragment): SoulInjectResult {
    if (target.templateId === fragment.fromTemplateId) {
        return { ok: false, reason: 'SAME_TEMPLATE' };
    }
    if (target.bloodlineId !== fragment.bloodlineId) {
        return { ok: false, reason: 'BLOODLINE_MISMATCH' };
    }
    return {
        ok: true,
        target: { ...target, tp: target.tp + fragment.tp },
        amount: fragment.tp,
    };
}
