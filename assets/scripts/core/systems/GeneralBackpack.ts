// @spec-source → WBS v3 BAG-01（武將背包基礎結構與六欄定義與解鎖：3 基礎 + 3 進階）；系統規格書：武將背包（倉庫）系統 §背包欄位定義、武將裝備道具系統
/**
 * GeneralBackpack — 武將個人背包的六個裝備欄位、解鎖狀態與放入檢查，純邏輯，不依賴 cc。
 *
 * - 基礎欄（武器 / 防具 / 飾品）預設解鎖；進階欄（名馬 / 古書 / 秘寶）需付費或成就解鎖。
 * - 每欄只能放對應類型的裝備；未解鎖的欄、錯類型、已佔用的欄都會被拒絕，不改輸入。
 * - 虎符與英靈卡不在這六欄內（規格邊界），由人物頁其他欄位處理。
 * Unity 對照：像六個 EquipSlot 的 Inventory，Slot.Accepts(itemType) 先判斷，再 Slot.Lock 狀態。
 */

export const BASIC_EQUIP_SLOTS = ['WEAPON', 'ARMOR', 'ACCESSORY'] as const;
export const ADVANCED_EQUIP_SLOTS = ['MOUNT', 'TOME', 'TREASURE'] as const;
export const EQUIP_SLOTS = [...BASIC_EQUIP_SLOTS, ...ADVANCED_EQUIP_SLOTS] as const;

export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export interface GeneralBackpack {
    /** 目前已解鎖的欄位；基礎欄永遠包含在內。 */
    unlocked: EquipSlot[];
    /** 各欄位目前放入的裝備 uid；空欄位不出現。 */
    equipped: Partial<Record<EquipSlot, string>>;
}

export interface EquipItem {
    uid: string;
    /** 此裝備屬於哪一類欄位，只能放進同類欄位。 */
    kind: EquipSlot;
}

export type BackpackRejectReason = 'slot-locked' | 'wrong-type' | 'occupied';

export interface BackpackPlaceResult {
    ok: boolean;
    reason?: BackpackRejectReason;
    backpack: GeneralBackpack;
}

function isEquipSlot(value: unknown): value is EquipSlot {
    return typeof value === 'string' && (EQUIP_SLOTS as readonly string[]).includes(value);
}

/** 新武將的背包：只解鎖三個基礎欄。 */
export function createBackpack(): GeneralBackpack {
    return { unlocked: [...BASIC_EQUIP_SLOTS], equipped: {} };
}

/** 解鎖一個欄位（付費或成就觸發）。已解鎖時不變。不改輸入。 */
export function unlockBackpackSlot(backpack: Readonly<GeneralBackpack>, slot: EquipSlot): GeneralBackpack {
    if (backpack.unlocked.includes(slot)) return { unlocked: [...backpack.unlocked], equipped: { ...backpack.equipped } };
    return { unlocked: [...backpack.unlocked, slot], equipped: { ...backpack.equipped } };
}

/**
 * 嘗試把裝備放進指定欄位。依序檢查：欄位已解鎖 → 類型相符 → 欄位未佔用。
 * 失敗時回傳原背包副本，不改輸入。
 */
export function placeInBackpackSlot(backpack: Readonly<GeneralBackpack>, slot: EquipSlot, item: Readonly<EquipItem>): BackpackPlaceResult {
    const unchanged = { unlocked: [...backpack.unlocked], equipped: { ...backpack.equipped } };
    if (!backpack.unlocked.includes(slot)) return { ok: false, reason: 'slot-locked', backpack: unchanged };
    if (item.kind !== slot) return { ok: false, reason: 'wrong-type', backpack: unchanged };
    if (backpack.equipped[slot] !== undefined) return { ok: false, reason: 'occupied', backpack: unchanged };
    return {
        ok: true,
        backpack: { unlocked: [...backpack.unlocked], equipped: { ...backpack.equipped, [slot]: item.uid } },
    };
}

/** 讀檔校正：忽略不認得的欄位與空值，基礎欄一定補齊。 */
export function normalizeBackpack(raw: unknown): GeneralBackpack {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return createBackpack();
    const record = raw as { unlocked?: unknown; equipped?: unknown };
    const unlocked = Array.isArray(record.unlocked) ? record.unlocked.filter(isEquipSlot) : [];
    const all = new Set<EquipSlot>([...BASIC_EQUIP_SLOTS, ...unlocked]);
    const equipped: Partial<Record<EquipSlot, string>> = {};
    if (typeof record.equipped === 'object' && record.equipped !== null) {
        for (const slot of EQUIP_SLOTS) {
            const uid = (record.equipped as Record<string, unknown>)[slot];
            if (typeof uid === 'string' && uid.length > 0 && all.has(slot)) equipped[slot] = uid;
        }
    }
    return { unlocked: EQUIP_SLOTS.filter(slot => all.has(slot)), equipped };
}
