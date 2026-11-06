// @spec-source → 武將裝備道具系統.md §A 一般裝備（武器、防具、飾品、名馬、古書、秘寶）；PM 2026-10-27 裁定：另建 provisional 裝備定義表（id→name、槽位、稀有度），物件庫列只存定義 id 不存名稱；PROG-2-1039；2026-11-06 使用者裁決 #7 暫定品項，PROG-2-1950
/**
 * GearDefinitions — 一般裝備定義表（provisional，純資料，不依賴 cc）。
 *
 * - 物件庫列只記 Gear_ID，名稱與槽位由這張表查出，避免每列各存一份名稱。
 * - 每個槽保留一個占位品項（rarity 為 UNSET），舊存檔的占位 Gear_ID 照常查得到。
 * - 暫定（11/06 裁決）品項：六槽 × 四品質共 24 件；slot 即裝備類型（type），rarity 即品質階（tier，N／R／SR／SSR），
 *   stats 落在 EquipmentBonus 的品質加成範圍內，requiredRank 為穿戴所需將階 0～5（見 GeneralRankProgress）。
 * - 進階欄（名馬、古書、秘寶）的 stats 先記在表上；EquipmentBonus 尚未把進階欄合入面板。
 * - nameKey 預留給語系表；正式名稱與數值待企劃定稿後替換本表，不需要改存檔。
 *
 * Unity 對照：像一張 ScriptableObject 資料庫，物件只存 ID，名稱與屬性在執行期查表。
 */
import { EQUIP_SLOTS, EquipSlot } from './GeneralBackpack';
import type { EquipQuality, EquipStatKey } from './EquipmentBonus';
import { GENERAL_RANK_MAX } from './GeneralRankProgress';

export interface GearDefinition {
    id: string;
    /** 語系 key，正式文案定稿後由 i18n 表提供 */
    nameKey: string;
    /** 目前的顯示名稱（provisional） */
    name: string;
    /** 裝備類型（槽位） */
    slot: EquipSlot;
    /** 品質階（tier）：N／R／SR／SSR；占位品項為 UNSET */
    rarity: EquipQuality | 'UNSET';
    /** 屬性加成；占位品項為空 */
    stats: Readonly<Partial<Record<EquipStatKey, number>>>;
    /** 穿戴所需將階 0～5 */
    requiredRank: number;
    provisional: true;
}

/** 暫定品項的出處標記 */
export const GEAR_PROVISIONAL_RULING = '暫定（11/06 裁決）';

const PLACEHOLDER_SLOT_NAMES: Readonly<Record<EquipSlot, string>> = Object.freeze({
    WEAPON: '武器',
    ARMOR: '防具',
    ACCESSORY: '飾品',
    MOUNT: '名馬',
    TOME: '古書',
    TREASURE: '秘寶',
});

type ProvisionalRow = [key: string, name: string, slot: EquipSlot, rarity: EquipQuality, requiredRank: number, stats: Partial<Record<EquipStatKey, number>>];

/** 暫定（11/06 裁決）品項 */
const PROVISIONAL_ROWS: readonly ProvisionalRow[] = [
    ['RING_POMMEL_SABER', '環首刀', 'WEAPON', 'N', 0, { str: 4, int: 1 }],
    ['STEEL_SPEAR', '百鍊鋼槍', 'WEAPON', 'R', 1, { str: 15, int: 6 }],
    ['TWIN_SWORDS', '雌雄雙股劍', 'WEAPON', 'SR', 3, { str: 38, int: 24 }],
    ['GREEN_DRAGON_GLAIVE', '青龍偃月刀', 'WEAPON', 'SSR', 5, { str: 92, int: 55 }],
    ['LEATHER_ARMOR', '皮甲', 'ARMOR', 'N', 0, { lea: 2, hp: 4 }],
    ['IRON_LAMELLAR', '鐵札甲', 'ARMOR', 'R', 1, { lea: 8, hp: 16 }],
    ['BRIGHT_PLATE', '明光鎧', 'ARMOR', 'SR', 2, { lea: 30, hp: 45 }],
    ['BEAST_FACE_MAIL', '獸面吞頭連環鎧', 'ARMOR', 'SSR', 4, { lea: 60, hp: 98 }],
    ['WOODEN_HAIRPIN', '木簪', 'ACCESSORY', 'N', 0, { pol: 1, cha: 3 }],
    ['JADE_PENDANT', '青玉佩', 'ACCESSORY', 'R', 1, { pol: 10, cha: 14 }],
    ['GOLD_SEAL_RIBBON', '金印紫綬', 'ACCESSORY', 'SR', 3, { pol: 42, cha: 30 }],
    ['EAST_SEA_PEARL', '東海明珠', 'ACCESSORY', 'SSR', 4, { pol: 62, cha: 90 }],
    ['PACK_HORSE', '駑馬', 'MOUNT', 'N', 0, { lea: 3 }],
    ['XILIANG_WARHORSE', '西涼戰馬', 'MOUNT', 'R', 1, { lea: 12 }],
    ['SHADOWLESS', '絕影', 'MOUNT', 'SR', 3, { lea: 40 }],
    ['RED_HARE', '赤兔馬', 'MOUNT', 'SSR', 5, { lea: 96 }],
    ['THOUSAND_CHARACTER', '千字文', 'TOME', 'N', 0, { int: 2, pol: 3 }],
    ['SUNZI_FRAGMENT', '孫子兵法殘卷', 'TOME', 'R', 1, { int: 14, pol: 8 }],
    ['SIX_SECRET_TEACHINGS', '六韜', 'TOME', 'SR', 2, { int: 36, pol: 28 }],
    ['MENGDE_NEW_BOOK', '孟德新書', 'TOME', 'SSR', 5, { int: 85, pol: 60 }],
    ['PEACE_TALISMAN', '平安符', 'TREASURE', 'N', 0, { cha: 2, hp: 2 }],
    ['JADE_RUYI', '玉如意', 'TREASURE', 'R', 1, { cha: 12, hp: 9 }],
    ['HE_JADE_DISC', '和氏璧', 'TREASURE', 'SR', 2, { cha: 45, hp: 22 }],
    ['IMPERIAL_SEAL', '傳國玉璽', 'TREASURE', 'SSR', 4, { cha: 100, hp: 70 }],
];

export const GEAR_DEFINITIONS: readonly GearDefinition[] = Object.freeze([
    ...EQUIP_SLOTS.map((slot): GearDefinition => ({
        id: `GEAR_${slot}_PLACEHOLDER`,
        nameKey: `UI_GEAR_NAME_${slot}_PLACEHOLDER`,
        name: `${PLACEHOLDER_SLOT_NAMES[slot]}（占位）`,
        slot,
        rarity: 'UNSET',
        stats: Object.freeze({}),
        requiredRank: 0,
        provisional: true,
    })),
    ...PROVISIONAL_ROWS.map(([key, name, slot, rarity, requiredRank, stats]): GearDefinition => ({
        id: `GEAR_${slot}_${key}`,
        nameKey: `UI_GEAR_NAME_${slot}_${key}`,
        name,
        slot,
        rarity,
        stats: Object.freeze(stats),
        requiredRank,
        provisional: true,
    })),
]);

const BY_ID: ReadonlyMap<string, GearDefinition> = new Map(GEAR_DEFINITIONS.map((def) => [def.id, def]));

/** 依定義 id 查表；查無或 id 為空時回傳 undefined（原型屬性名稱如 toString 也查不到）。 */
export function gearDefinitionOf(id: string | null | undefined): GearDefinition | undefined {
    if (!id) return undefined;
    return BY_ID.get(id);
}

/** 將階是否達到這件裝備的穿戴門檻；將階超出 0～5 時夾回範圍。 */
export function meetsGearRankRequirement(def: Readonly<GearDefinition>, generalRank: number | undefined): boolean {
    const rank = Number.isFinite(generalRank) ? Math.min(GENERAL_RANK_MAX, Math.max(0, Math.floor(generalRank as number))) : 0;
    return rank >= def.requiredRank;
}
