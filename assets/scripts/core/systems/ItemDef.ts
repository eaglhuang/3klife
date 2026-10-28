// @spec-source → 道具系統（付費免費道具）.md §道具分類系統（P0，五大分類）、§J 名詞定義（PROG-2-1375，ITM-01）
/**
 * ItemDef — 道具資料表（純邏輯，不依賴 cc）
 *
 * 道具 ID 的唯一來源：PlayerInventory 從這裡 re-export ID 常數，並由 ITEM_DEFS 推導顯示名稱。
 *
 * 暫定（規格沒寫，PM 2026-10-28 裁定可逆實作）：
 * - 分類依規格五大分類，規格有明寫的照寫（戰法筆記＝材料、傳家寶物＝寶物、補元散＝消耗品），
 *   其餘依用途判斷：用完即減少的歸消耗品，不消耗、靠它觸發功能的歸特殊道具
 * - 稀有度：規格沒寫，全部先填最低階 1
 *
 * Unity 對照：像一個 ScriptableObject 資產庫（ItemDatabase），每筆是一個 ItemSO，
 * 背包（PlayerInventory）只存 id → 數量，查定義時才來這裡翻表。
 */

export type ItemCategory = '消耗品' | '材料' | '特殊道具' | '貨幣' | '寶物';

/** 稀有度：數字越大越稀有；1 為最低階（規格未定，暫定全部 1） */
export type ItemRarity = number;

export interface ItemDef {
    readonly id: string;
    readonly name: string;
    readonly category: ItemCategory;
    readonly rarity: ItemRarity;
}

export const ITEM_CATEGORIES: readonly ItemCategory[] = ['消耗品', '材料', '特殊道具', '貨幣', '寶物'];

export const ITEM_ORACLE_TOKEN = 'ITEM_ORACLE';
/** 轉職令（20 歲追加副職；PROG-2-0226 接線）。起始庫存為 0，靠商城與活動取得。 */
export const ITEM_JOB_CHANGE_ORDER = 'ITEM_JOB_ORDER';
/** 試用券（MERC-02 招募 Trial 傭兵；PROG-2-0327 接線）。起始庫存為 0（暫定）。 */
export const ITEM_TRIAL_TICKET = 'ITEM_TRIAL_TICKET';
/** 竹簡（文職退役產物，PROG-2-0330；暫定）。起始庫存為 0。 */
export const ITEM_BAMBOO_SLIP = 'ITEM_BAMBOO_SLIP';
/** 戰法筆記（千人斬等里程碑產出，GEN-13 / PROG-2-0816；交給教官轉化）。起始庫存為 0。 */
export const ITEM_BATTLE_NOTE = 'ITEM_BATTLE_NOTE';
/** 補元散（精力 +50；PROG-2-0443 接線）。起始庫存為 0。 */
export const ITEM_VITALITY_PILL = 'ITEM_VITALITY_PILL';
/** 高級補元散（精力 +100；PROG-2-0443 接線）。起始庫存為 0。 */
export const ITEM_PREMIUM_VITALITY_PILL = 'ITEM_VITALITY_PILL_PREMIUM';
/** 歸宗令（血脈歸宗消耗 1 張，名詞表 Merge_Token；PROG-2-0862 接線）。起始庫存為 0，取得來源未定。 */
export const ITEM_MERGE_TOKEN = 'ITEM_MERGE_TOKEN';
/** 傳道令（名將傳道消耗 1 張，MENT-15；PROG-2-0868 接線）。起始庫存為 0，取得來源待使用者裁決。 */
export const ITEM_LEGENDARY_MENTORING_TICKET = 'ITEM_LEGENDARY_MENTORING_TICKET';
/** 祈風令（戰場天氣道具，改為大風；PROG-2-0932，PM 暫定 id）。起始庫存為 0，取得來源待商業裁決。 */
export const ITEM_WEATHER_WIND = 'item-weather-wind';
/** 祈雨符（戰場天氣道具，改為雨天；PROG-2-0932，PM 暫定 id）。起始庫存為 0，取得來源待商業裁決。 */
export const ITEM_WEATHER_RAIN = 'item-weather-rain';
/** 刷新券（手動刷新傭兵池與地下城，ITM-04b REFRESH；PROG-2-1038 接線）。取得來源為商城，不在本卡。 */
export const ITEM_REFRESH = 'ITEM_REFRESH';
/** 安胎藥（結緣受孕率 ×1.5，ITM-04b BOOST_CONCEPTION；PROG-2-1038 接線）。取得來源為商城，不在本卡。 */
export const ITEM_FERTILITY = 'ITEM_FERTILITY';
/** 入學令（許願池商品，名詞表 Admission_Token；PROG-2-1198，PM 暫定 id）。用途待接線。 */
export const ITEM_ADMISSION_TOKEN = 'ITEM_ADMISSION_TOKEN';
/** 虎符精華（許願池商品，名詞表 Tally_Essence；PROG-2-1198，PM 暫定 id）。用途待接線。 */
export const ITEM_TALLY_ESSENCE = 'ITEM_TALLY_ESSENCE';
/** 延壽丹（許願池商品，名詞表 Longevity_Pill；PROG-2-1198，PM 暫定 id）。用途待接線。 */
export const ITEM_LONGEVITY_PILL = 'ITEM_LONGEVITY_PILL';
/** 加速卡（許願池每張縮短 2h；PROG-2-1198，PM 暫定 id）。來源（月卡、精元購買）不在本卡。 */
export const ITEM_WISH_SPEED_CARD = 'ITEM_WISH_SPEED_CARD';

/** 順序即背包顯示順序（ItemBagView 依 ITEM_DISPLAY_NAMES 的 key 順序列出），調換前先確認 UI 影響 */
export const ITEM_DEFS: readonly ItemDef[] = [
    { id: ITEM_ORACLE_TOKEN, name: '求籤令', category: '消耗品', rarity: 1 },
    { id: ITEM_JOB_CHANGE_ORDER, name: '轉職令', category: '特殊道具', rarity: 1 },
    { id: ITEM_TRIAL_TICKET, name: '試用券', category: '特殊道具', rarity: 1 },
    { id: ITEM_BAMBOO_SLIP, name: '竹簡', category: '材料', rarity: 1 },
    { id: ITEM_BATTLE_NOTE, name: '戰法筆記', category: '材料', rarity: 1 },
    { id: ITEM_VITALITY_PILL, name: '補元散', category: '消耗品', rarity: 1 },
    { id: ITEM_PREMIUM_VITALITY_PILL, name: '高級補元散', category: '消耗品', rarity: 1 },
    { id: ITEM_MERGE_TOKEN, name: '歸宗令', category: '特殊道具', rarity: 1 },
    { id: ITEM_LEGENDARY_MENTORING_TICKET, name: '傳道令', category: '特殊道具', rarity: 1 },
    { id: ITEM_WEATHER_WIND, name: '祈風令', category: '消耗品', rarity: 1 },
    { id: ITEM_WEATHER_RAIN, name: '祈雨符', category: '消耗品', rarity: 1 },
    { id: ITEM_REFRESH, name: '刷新券', category: '消耗品', rarity: 1 },
    { id: ITEM_FERTILITY, name: '安胎藥', category: '消耗品', rarity: 1 },
    { id: ITEM_ADMISSION_TOKEN, name: '入學令', category: '消耗品', rarity: 1 },
    { id: ITEM_TALLY_ESSENCE, name: '虎符精華', category: '材料', rarity: 1 },
    { id: ITEM_LONGEVITY_PILL, name: '延壽丹', category: '消耗品', rarity: 1 },
    { id: ITEM_WISH_SPEED_CARD, name: '加速卡', category: '消耗品', rarity: 1 },
];

/** 依道具 ID 查定義；沒有定義時回傳 null（例如舊存檔的未知 key） */
export function itemDefOf(id: string): ItemDef | null {
    return ITEM_DEFS.find((def) => def.id === id) ?? null;
}
