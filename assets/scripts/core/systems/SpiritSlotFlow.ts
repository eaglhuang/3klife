// @spec-source → 英靈世家系統 E-4 命槽規則（單插槽、戰鬥鎖定只能看詳情）；統一物件庫 DS-08 裝備欄位決議（PM 2026-10-27）；WBS GDUI-05（PROG-2-1280）
/**
 * SpiritSlotFlow — 命槽卸下與設為主卡的純邏輯（不依賴 cc）。
 *
 * - 寫入的是統一物件庫的英靈卡列：卸下＝清空 equippedBy、slotId 與 isPrimary；設主卡＝該列 isPrimary = true。
 * - 戰鬥鎖定時一律拒絕（E-4：戰鬥中只能查看詳情）。
 * - 插入與替換需要選卡畫面，不在本檔範圍。
 * - 一律回傳新陣列，不原地修改傳入的 records。
 *
 * Unity 對照：像 Equipment 的 Unequip 與 SetPrimary：先檢查戰鬥狀態與目前裝配，
 * 再把新的 Inventory 狀態回傳給 Model 統一寫回。
 */
import type { InventoryRecord } from './InventoryProjection';
import { spiritSlotViewOf } from './SpiritSlotState';

export type SpiritSlotFlowRejectReason =
    /** 命槽沒有英靈卡 */
    | 'NOT_FOUND'
    /** 戰鬥中不可更動命槽 */
    | 'BATTLE_LOCKED'
    /** 已是主卡，不需再設定 */
    | 'ALREADY_PRIMARY';

export type SpiritSlotFlowResult =
    | { ok: true; records: InventoryRecord[] }
    | { ok: false; reason: SpiritSlotFlowRejectReason };

function reject(reason: SpiritSlotFlowRejectReason): SpiritSlotFlowResult {
    return { ok: false, reason };
}

/** 卸下武將命槽的英靈卡，回到倉庫（列保留，只清空裝配欄位）。 */
export function unequipSpiritCard(
    records: readonly InventoryRecord[],
    generalUid: string,
    battleLocked: boolean,
): SpiritSlotFlowResult {
    if (battleLocked) return reject('BATTLE_LOCKED');
    const { card } = spiritSlotViewOf(records, generalUid, battleLocked);
    if (!card) return reject('NOT_FOUND');
    return {
        ok: true,
        records: records.map((record) =>
            record.Inventory_ID === card.Inventory_ID
                ? { ...record, equippedBy: null, slotId: null, isPrimary: null }
                : record,
        ),
    };
}

/** 把武將命槽的英靈卡設為主卡；同武將其他英靈卡的主卡標記一併清除。 */
export function setPrimarySpiritCard(
    records: readonly InventoryRecord[],
    generalUid: string,
    battleLocked: boolean,
): SpiritSlotFlowResult {
    if (battleLocked) return reject('BATTLE_LOCKED');
    const { card } = spiritSlotViewOf(records, generalUid, battleLocked);
    if (!card) return reject('NOT_FOUND');
    if (card.isPrimary === true) return reject('ALREADY_PRIMARY');
    return {
        ok: true,
        records: records.map((record) => {
            if (record.Inventory_ID === card.Inventory_ID) return { ...record, isPrimary: true };
            const ownedByGeneral = record.Item_Type === 'SPIRIT_CARD' && record.equippedBy === generalUid;
            return ownedByGeneral && record.isPrimary ? { ...record, isPrimary: null } : record;
        }),
    };
}
