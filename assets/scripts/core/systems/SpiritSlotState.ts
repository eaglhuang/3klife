// @spec-source → 英靈世家系統 E-4 命槽規則；武將人物介面規格書 §6.3 命槽；統一物件庫 DS-08 裝備欄位決議（PM 2026-10-27）；WBS GDUI-05（PROG-2-1266 數據來源）
/**
 * SpiritSlotState — 從統一物件庫推導命頁「命槽」的狀態（純邏輯，不依賴 cc）。
 *
 * - 英靈卡列（Item_Type = SPIRIT_CARD）裝在某武將的命槽：equippedBy = 武將 uid 且 slotId = SPIRIT_SLOT_ID。
 * - 主卡：同一列的選填欄位 isPrimary = true；缺欄位即非主卡。
 * - 戰鬥鎖定由呼叫端傳入（見 isGeneralBattleLocked），本模組不讀戰鬥狀態。
 *
 * 暫定：SPIRIT_SLOT_ID 依 PM 裁定使用「命槽」字串，待 E-4 規格對帳。
 *
 * Unity 對照：像從一張總表（ScriptableObject 資料庫）篩出「這個角色身上掛的那一件」，
 * 再把結果交給 Inspector 的按鈕去決定 interactable。
 */
import type { InventoryRecord } from './InventoryProjection';
import type { SpiritSlotState } from './BloodlineRightPanelLayout';

/** 命槽在統一物件庫列上的 slotId（暫定） */
export const SPIRIT_SLOT_ID = '命槽';

export interface SpiritSlotView {
    state: SpiritSlotState;
    /** 目前裝配的英靈卡列；未裝配為 null */
    card: InventoryRecord | null;
}

/**
 * 找出某武將命槽裝配的英靈卡，並回傳命槽狀態。
 * 同一武將命槽只會有一張；若資料異常出現多張，取第一張並忽略其餘（不憑空修正真相）。
 */
export function spiritSlotViewOf(
    records: readonly InventoryRecord[],
    generalUid: string,
    battleLocked: boolean,
): SpiritSlotView {
    const card = records.find(
        (record) =>
            record.Item_Type === 'SPIRIT_CARD' &&
            record.equippedBy === generalUid &&
            record.slotId === SPIRIT_SLOT_ID,
    ) ?? null;
    return {
        state: {
            occupied: card !== null,
            isMain: card?.isPrimary === true,
            battleLocked,
        },
        card,
    };
}

/**
 * 武將是否因戰鬥而鎖定命槽：戰鬥進行中，且該武將在出戰名冊上。
 * 出戰名冊之外的武將不受戰鬥影響，仍可更換英靈卡。
 */
export function isGeneralBattleLocked(
    battleActive: boolean,
    rosterUids: readonly string[],
    generalUid: string,
): boolean {
    return battleActive && rosterUids.includes(generalUid);
}
