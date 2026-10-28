// @spec-source → 武將裝備道具系統.md §「寶 / GEAR」一般裝備六槽；Data Schema 文件 §2-2 統一物件庫（canonical）；PM 2026-10-27 裁定：裝備存在統一物件庫，武將背包是依 uid 篩出的視圖；PROG-2-1040
/**
 * GearEquipFlow — 一般裝備穿戴與卸下的純邏輯（不依賴 cc）。
 *
 * - 寫入的是統一物件庫列：穿戴＝設定 equippedBy（武將 uid）與 slotId；卸下＝兩欄清為 null。
 * - 只能穿到已解鎖的格位：解鎖狀態由 deriveGeneralBackpack 推導，不另存。
 * - 「這件裝備能不能放進這一格」由呼叫端的 canEquipInSlot 判斷（通常查一般裝備定義表），本檔不認識定義 id。
 * - 格位已有別件裝備時，原裝備自動卸下回倉庫；裝備已在別的武將身上則拒絕，需先卸下。
 * - 一律回傳新陣列，不原地修改傳入的 records。
 *
 * Unity 對照：像 Equipment 系統的 Equip(item, slot)：先檢查槽位解鎖與 ItemType 相容，
 * 舊裝備換下，最後把新的 Inventory 狀態回傳給 Model 統一寫回。
 */
import { EquipSlot } from './GeneralBackpack';
import { deriveGeneralBackpack } from './GeneralBackpackView';
import type { InventoryRecord } from './InventoryProjection';

export type GearEquipRejectReason =
    /** 找不到該裝備列，或該格沒有裝備（卸下時） */
    | 'NOT_FOUND'
    /** 不是一般裝備（Item_Type 不為 OTHER） */
    | 'NOT_GEAR'
    /** 已裝在其他武將身上，需先卸下 */
    | 'OWNED_ELSEWHERE'
    /** 呼叫端判定此裝備不能放進該格 */
    | 'NOT_EQUIPABLE'
    /** 目標格尚未解鎖（進階欄目前只有有裝備時才算解鎖） */
    | 'SLOT_LOCKED';

export type GearEquipResult =
    | { ok: true; records: InventoryRecord[] }
    | { ok: false; reason: GearEquipRejectReason };

/** 裝備能否放進指定格；由呼叫端依一般裝備定義表實作。 */
export type CanEquipInSlot = (record: Readonly<InventoryRecord>, slotId: EquipSlot) => boolean;

function reject(reason: GearEquipRejectReason): GearEquipResult {
    return { ok: false, reason };
}

/** 把一件一般裝備穿到武將的指定格；格內舊裝備自動卸下。 */
export function equipGear(
    records: readonly InventoryRecord[],
    gearUid: string,
    generalUid: string,
    slotId: EquipSlot,
    canEquipInSlot: CanEquipInSlot,
): GearEquipResult {
    const gear = records.find((record) => record.Inventory_ID === gearUid);
    if (!gear) return reject('NOT_FOUND');
    if (gear.Item_Type !== 'OTHER') return reject('NOT_GEAR');
    if (gear.equippedBy && gear.equippedBy !== generalUid) return reject('OWNED_ELSEWHERE');
    if (!canEquipInSlot(gear, slotId)) return reject('NOT_EQUIPABLE');
    if (!deriveGeneralBackpack(records, generalUid).unlocked.includes(slotId)) return reject('SLOT_LOCKED');

    const next = records.map((record): InventoryRecord => {
        if (record.Inventory_ID === gearUid) return { ...record, equippedBy: generalUid, slotId };
        const occupies = record.Item_Type === 'OTHER' && record.equippedBy === generalUid && record.slotId === slotId;
        return occupies ? { ...record, equippedBy: null, slotId: null } : record;
    });
    return { ok: true, records: next };
}

/** 卸下武將指定格的裝備，裝備回到倉庫（兩欄清為 null）。 */
export function unequipGear(
    records: readonly InventoryRecord[],
    generalUid: string,
    slotId: EquipSlot,
): GearEquipResult {
    const target = records.find((record) => record.Item_Type === 'OTHER' && record.equippedBy === generalUid && record.slotId === slotId);
    if (!target) return reject('NOT_FOUND');
    const next = records.map((record): InventoryRecord =>
        record.Inventory_ID === target.Inventory_ID ? { ...record, equippedBy: null, slotId: null } : record,
    );
    return { ok: true, records: next };
}

/**
 * 退役武將的一般裝備傳給指定子嗣（EQP-07，PM 暫定）。
 * 子嗣的格位已解鎖且為空時保留原格；否則裝備回倉庫（兩欄清為 null），不會留在沒有格位的狀態。
 * 只處理一般裝備（Item_Type OTHER）；英靈卡與虎符不在此轉移。
 */
export function transferGearToHeir(
    records: readonly InventoryRecord[],
    fromGeneralUid: string,
    toGeneralUid: string,
): InventoryRecord[] {
    const gears = records.filter((record) => record.Item_Type === 'OTHER' && record.equippedBy === fromGeneralUid);
    let next = [...records];
    for (const gear of gears) {
        const slot = gear.slotId as EquipSlot | null | undefined;
        const heirBackpack = deriveGeneralBackpack(next, toGeneralUid);
        const slotFree = !next.some((record) =>
            record.Item_Type === 'OTHER' && record.equippedBy === toGeneralUid && record.slotId === slot,
        );
        const keepSlot = !!slot && heirBackpack.unlocked.includes(slot) && slotFree;
        next = next.map((record): InventoryRecord => record.Inventory_ID === gear.Inventory_ID
            ? { ...record, equippedBy: keepSlot ? toGeneralUid : null, slotId: keepSlot ? slot : null }
            : record);
    }
    return next;
}
