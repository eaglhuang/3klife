// @spec-source → 英靈世家系統 E-4 命槽規則（單插槽、戰鬥鎖定只能看詳情）；統一物件庫 DS-08 裝備欄位決議（PM 2026-10-27）；WBS GDUI-05（PROG-2-1280）
/**
 * SpiritSlotFlow — 命槽卸下與設為主卡的純邏輯（不依賴 cc）。
 *
 * - 寫入的是統一物件庫的英靈卡列：卸下＝清空 equippedBy、slotId 與 isPrimary；設主卡＝該列 isPrimary = true。
 * - 戰鬥鎖定時一律拒絕（E-4：戰鬥中只能查看詳情）。
 * - 插入＝把未裝配的英靈卡放進空命槽；替換＝把命槽現有英靈卡卸回倉庫，換上另一張未裝配的卡。
 *   選哪一張由 cc 選卡面板決定，本檔只驗證與寫入。
 * - 一律回傳新陣列，不原地修改傳入的 records。
 *
 * Unity 對照：像 Equipment 的 Unequip 與 SetPrimary：先檢查戰鬥狀態與目前裝配，
 * 再把新的 Inventory 狀態回傳給 Model 統一寫回。
 */
import type { InventoryRecord } from './InventoryProjection';
import { SPIRIT_SLOT_ID, spiritSlotViewOf } from './SpiritSlotState';

export type SpiritSlotFlowRejectReason =
    /** 命槽沒有英靈卡 */
    | 'NOT_FOUND'
    /** 戰鬥中不可更動命槽 */
    | 'BATTLE_LOCKED'
    /** 已是主卡，不需再設定 */
    | 'ALREADY_PRIMARY'
    /** 指定的 Inventory_ID 不是英靈卡列（或不存在） */
    | 'NOT_SPIRIT_CARD'
    /** 英靈卡已裝在別的武將命槽上 */
    | 'OWNED_ELSEWHERE'
    /** 命槽已有英靈卡，插入請改用替換 */
    | 'SLOT_OCCUPIED'
    /** 替換時選到的就是命槽現有的那張卡 */
    | 'SAME_CARD';

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

/** 倉庫裡未裝配的英靈卡（供選卡面板列出）；已裝在任何武將身上的不列。 */
export function unequippedSpiritCards(records: readonly InventoryRecord[]): InventoryRecord[] {
    return records.filter((record) => record.Item_Type === 'SPIRIT_CARD' && !record.equippedBy);
}

export interface SpiritPickerRow {
    spiritId: string;
    /** 列表顯示文字：卡號與血脈分數（LineageScore 缺欄位時只顯示卡號） */
    label: string;
}

/** 選卡面板的列表內容；順序沿用倉庫順序，不另外排序。 */
export function spiritPickerRows(records: readonly InventoryRecord[]): SpiritPickerRow[] {
    return unequippedSpiritCards(records).map((record) => {
        const lineage = record.Attributes['LineageScore'];
        const label = typeof lineage === 'number' ? `${record.Inventory_ID}（血脈 ${lineage}）` : record.Inventory_ID;
        return { spiritId: record.Inventory_ID, label };
    });
}

/** 檢查要放進命槽的英靈卡是否可用；可用回傳 null，否則回傳拒絕原因。 */
function unpickableReason(records: readonly InventoryRecord[], spiritId: string): SpiritSlotFlowRejectReason | null {
    const card = records.find((record) => record.Inventory_ID === spiritId);
    if (!card || card.Item_Type !== 'SPIRIT_CARD') return 'NOT_SPIRIT_CARD';
    if (card.equippedBy) return 'OWNED_ELSEWHERE';
    return null;
}

/** 把倉庫裡未裝配的英靈卡放進空的命槽；新裝入的卡不是主卡，主卡要另外設定。 */
export function insertSpiritCard(
    records: readonly InventoryRecord[],
    generalUid: string,
    spiritId: string,
    battleLocked: boolean,
): SpiritSlotFlowResult {
    if (battleLocked) return reject('BATTLE_LOCKED');
    if (spiritSlotViewOf(records, generalUid, battleLocked).card) return reject('SLOT_OCCUPIED');
    const unpickable = unpickableReason(records, spiritId);
    if (unpickable) return reject(unpickable);
    return {
        ok: true,
        records: records.map((record) =>
            record.Inventory_ID === spiritId
                ? { ...record, equippedBy: generalUid, slotId: SPIRIT_SLOT_ID, isPrimary: null }
                : record,
        ),
    };
}

/**
 * 把命槽現有的英靈卡卸回倉庫，再裝入另一張未裝配的卡；兩張卡在同一筆結果中一起寫回。
 * 命槽是空的時回 NOT_FOUND（該用插入）。
 */
export function replaceSpiritCard(
    records: readonly InventoryRecord[],
    generalUid: string,
    spiritId: string,
    battleLocked: boolean,
): SpiritSlotFlowResult {
    if (battleLocked) return reject('BATTLE_LOCKED');
    const { card: current } = spiritSlotViewOf(records, generalUid, battleLocked);
    if (!current) return reject('NOT_FOUND');
    if (current.Inventory_ID === spiritId) return reject('SAME_CARD');
    const unpickable = unpickableReason(records, spiritId);
    if (unpickable) return reject(unpickable);
    return {
        ok: true,
        records: records.map((record) => {
            if (record.Inventory_ID === current.Inventory_ID) return { ...record, equippedBy: null, slotId: null, isPrimary: null };
            if (record.Inventory_ID === spiritId) return { ...record, equippedBy: generalUid, slotId: SPIRIT_SLOT_ID, isPrimary: null };
            return record;
        }),
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
