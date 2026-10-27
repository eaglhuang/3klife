// @spec-source → 武將裝備道具系統.md §「寶 / GEAR」一般裝備六槽；Data Schema 文件 §2-2 統一物件庫（canonical）；PM 2026-10-27 裁定：裝備存在統一物件庫，武將背包是依 uid 篩出的視圖；PROG-2-1036
/**
 * GeneralBackpackView — 由統一物件庫推導單一武將的一般裝備背包（純邏輯，不依賴 cc）。
 *
 * - 統一物件庫是唯一真相：每件一般裝備（Item_Type = OTHER）以 equippedBy（武將 uid）與 slotId 記錄裝在哪裡。
 * - 背包不另存一份：deriveGeneralBackpack 依 equippedBy 篩出該武將的裝備，組成 GeneralBackpack 視圖。
 * - 舊檔缺 equippedBy／slotId 即視為未裝備；不以預設值補資料。
 * - 同一格若有多件都標到該武將，保留列表中先出現的一件，其餘忽略（不改資料）。
 * - 進階欄的解鎖狀態目前沒有存在物件庫中，暫以「該格有裝備即視為已解鎖」推導；正式解鎖來源待另卡。
 *
 * Unity 對照：像 Inventory 是一張總表，每個角色的裝備欄只是用 OwnerID 篩出的 View，角色身上不另存裝備清單。
 */
import { BASIC_EQUIP_SLOTS, ADVANCED_EQUIP_SLOTS, EQUIP_SLOTS, EquipSlot, GeneralBackpack } from './GeneralBackpack';
import type { InventoryRecord } from './InventoryProjection';
import { gearDefinitionOf } from './GearDefinitions';

function isGearSlot(value: unknown): value is EquipSlot {
    return typeof value === 'string' && (EQUIP_SLOTS as readonly string[]).includes(value);
}

/** 依背包裡的 uid（即 Inventory_ID）查出裝備顯示名稱；列不存在或定義 id 查無則回傳 undefined。 */
export function gearNameOfUid(records: readonly InventoryRecord[], uid: string): string | undefined {
    const record = records.find((r) => r.Inventory_ID === uid);
    return gearDefinitionOf(record?.Gear_ID)?.name;
}

/** 依武將 uid 從統一物件庫篩出一般裝備背包；物件庫不會因此被修改。 */
export function deriveGeneralBackpack(records: readonly InventoryRecord[], generalUid: string): GeneralBackpack {
    const equipped: Partial<Record<EquipSlot, string>> = {};
    for (const record of records) {
        if (record.Item_Type !== 'OTHER') continue;
        if (record.equippedBy !== generalUid) continue;
        if (!isGearSlot(record.slotId)) continue;
        if (equipped[record.slotId] !== undefined) continue;
        equipped[record.slotId] = record.Inventory_ID;
    }
    const advancedUnlocked = ADVANCED_EQUIP_SLOTS.filter((slot) => equipped[slot] !== undefined);
    return {
        unlocked: [...BASIC_EQUIP_SLOTS, ...advancedUnlocked],
        equipped,
    };
}
