// @spec-source → 武將裝備道具系統.md §A 一般裝備（武器、防具、飾品、名馬、古書、秘寶）；PM 2026-10-27 裁定：另建 provisional 裝備定義表（id→name、槽位、稀有度），物件庫列只存定義 id 不存名稱；PROG-2-1039
/**
 * GearDefinitions — 一般裝備定義表（provisional，純資料，不依賴 cc）。
 *
 * - 物件庫列只記 Gear_ID，名稱與槽位由這張表查出，避免每列各存一份名稱。
 * - 規格只列到裝備類別（武器、防具…），沒有具體品項名稱，所以每個槽先放一個占位品項，rarity 為 UNSET。
 * - nameKey 預留給語系表；正式名稱與稀有度待企劃定稿後替換本表，不需要改存檔。
 *
 * Unity 對照：像一張 ScriptableObject 資料庫，物件只存 ID，名稱與屬性在執行期查表。
 */
import { EQUIP_SLOTS, EquipSlot } from './GeneralBackpack';

export interface GearDefinition {
    id: string;
    /** 語系 key，正式文案定稿後由 i18n 表提供 */
    nameKey: string;
    /** 目前的顯示名稱（占位，provisional） */
    name: string;
    slot: EquipSlot;
    /** 稀有度，規格未定前為 UNSET */
    rarity: string;
    provisional: true;
}

const PLACEHOLDER_SLOT_NAMES: Readonly<Record<EquipSlot, string>> = Object.freeze({
    WEAPON: '武器',
    ARMOR: '防具',
    ACCESSORY: '飾品',
    MOUNT: '名馬',
    TOME: '古書',
    TREASURE: '秘寶',
});

export const GEAR_DEFINITIONS: readonly GearDefinition[] = Object.freeze(
    EQUIP_SLOTS.map((slot): GearDefinition => ({
        id: `GEAR_${slot}_PLACEHOLDER`,
        nameKey: `UI_GEAR_NAME_${slot}_PLACEHOLDER`,
        name: `${PLACEHOLDER_SLOT_NAMES[slot]}（占位）`,
        slot,
        rarity: 'UNSET',
        provisional: true,
    })),
);

const BY_ID: ReadonlyMap<string, GearDefinition> = new Map(GEAR_DEFINITIONS.map((def) => [def.id, def]));

/** 依定義 id 查表；查無或 id 為空時回傳 undefined（原型屬性名稱如 toString 也查不到）。 */
export function gearDefinitionOf(id: string | null | undefined): GearDefinition | undefined {
    if (!id) return undefined;
    return BY_ID.get(id);
}
