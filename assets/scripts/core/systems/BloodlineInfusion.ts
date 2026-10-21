// @spec-source → 同名武將系統.md §復生重練與血脈灌注；重複卡分流與血脈灌注補遺_2026-04-04.md §血脈灌注；WBS SAME-05（PROG-2-1073）
/**
 * BloodlineInfusion — 血脈灌注（純邏輯，不依賴 cc）
 *
 * 規則（規格偽代碼）：
 *   ExistingSpiritCard.Bloodline_Level += 1
 *   ExistingSpiritCard.Spirit_Power += DuplicateCardValue
 *   ExistingSpiritCard.Linked_Tally_Level += 1
 *
 * 灌注不產生新本體，只更新既有英靈卡的數值。回傳新物件，不改傳入資料。
 *
 * 暫定（規格未寫，記進待辦檔）：
 *   - DuplicateCardValue 的來源與數值由呼叫端傳入。
 *   - 缺欄位視為 0；負數與非有限數（NaN、Infinity）當 0 處理。
 *   - 灌注上限未定，本函式不設上限。
 *
 * Unity 對照：像對一個 ScriptableObject 的數值欄位做一次 Apply，回傳新的快照，
 * 不直接改原來的資產。
 */

export interface SpiritCardInfusionState {
    /** 血脈等級；缺欄位視為 0 */
    bloodlineLevel?: number;
    /** 英靈濃度（Spirit_Power）；缺欄位視為 0 */
    spiritPower?: number;
    /** 虎符層級（Linked_Tally_Level）；缺欄位視為 0 */
    linkedTallyLevel?: number;
}

export interface SpiritCardInfusionResult {
    bloodlineLevel: number;
    spiritPower: number;
    linkedTallyLevel: number;
}

function nonNegativeOrZero(value: number | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
    return value;
}

export function applyBloodlineInfusion(
    card: SpiritCardInfusionState,
    duplicateCardValue: number,
): SpiritCardInfusionResult {
    return {
        bloodlineLevel: nonNegativeOrZero(card.bloodlineLevel) + 1,
        spiritPower: nonNegativeOrZero(card.spiritPower) + nonNegativeOrZero(duplicateCardValue),
        linkedTallyLevel: nonNegativeOrZero(card.linkedTallyLevel) + 1,
    };
}
