// @spec-source → 道具系統（付費免費道具）.md §F 付費道具（ITEM_ORACLE 求籤令）、名士預言系統.md (doc_spec_0006) §C 商業套路
/**
 * PlayerInventory — 玩家道具庫存（純邏輯，不依賴 cc）
 *
 * 道具定義（ID、名稱、分類、稀有度）在 ItemDef.ts；這裡 re-export ID 常數，並由資料表推導顯示名稱。
 *
 * 暫定（規格沒寫，PROG-2-0053）：
 * - 新遊戲與沒有庫存欄位的舊存檔，起始送 3 張求籤令
 * - 規格「免費玩家日產 1 張」：遊戲以季為時間單位，改成每推進一季免費 +1 張；
 *   免費產出只補到 5 張為止（持有 ≥ 5 張時不再發），商城購買不受此限
 *
 * Unity 對照：像一個 [Serializable] class Inventory { Dictionary<string,int> }，
 * 只負責數量增減與正規化，存檔交給 GameSession。
 */

import { ITEM_DEFS, ITEM_ORACLE_TOKEN, ITEM_TRIAL_TICKET } from './ItemDef';

export {
    ITEM_ORACLE_TOKEN,
    ITEM_JOB_CHANGE_ORDER,
    ITEM_TRIAL_TICKET,
    ITEM_BAMBOO_SLIP,
    ITEM_BATTLE_NOTE,
    ITEM_VITALITY_PILL,
    ITEM_PREMIUM_VITALITY_PILL,
    ITEM_MERGE_TOKEN,
    ITEM_LEGENDARY_MENTORING_TICKET,
    ITEM_WEATHER_WIND,
    ITEM_WEATHER_RAIN,
    ITEM_REFRESH,
    ITEM_FERTILITY,
    ITEM_ADMISSION_TOKEN,
    ITEM_TALLY_ESSENCE,
    ITEM_LONGEVITY_PILL,
    ITEM_WISH_SPEED_CARD,
} from './ItemDef';

/** 安胎藥已使用、等待下一次結緣的標記（PM 2026-10-27 裁定）：不在背包顯示，成功結緣後清除。 */
export const ITEM_FERTILITY_ARMED = 'ITEM_FERTILITY_ARMED';
/** 歸宗令不足的提示（暫定，PM 2026-10-20 裁定）：語系 key 先用此名，文案待企劃定稿。 */
export const MERGE_TOKEN_SHORTAGE_KEY = 'UI_MERGE_TOKEN_SHORTAGE';
export const MERGE_TOKEN_SHORTAGE_TEXT = '歸宗令不足';

/** 由道具資料表推導，key 順序與 ITEM_DEFS 相同 */
export const ITEM_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.freeze(
    Object.fromEntries(ITEM_DEFS.map((def) => [def.id, def.name])),
);

export type PlayerInventory = Readonly<Record<string, number>>;

/** 新遊戲 / 舊存檔的起始庫存（暫定） */
/** 起始背包：求籤令 3、試用券 2（試用券暫定，讓新局能體驗傭兵試用→結義，PROG-2-1152） */
export const STARTER_INVENTORY: PlayerInventory = { [ITEM_ORACLE_TOKEN]: 3, [ITEM_TRIAL_TICKET]: 2 };

/** 每季免費發放的求籤令數量與免費產出上限（暫定） */
export const ORACLE_TOKEN_PER_SEASON = 1;
export const ORACLE_TOKEN_FREE_CAP = 5;

/** 只保留正整數數量；不是物件時回傳起始庫存 */
export function normalizeInventory(raw: unknown): PlayerInventory {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...STARTER_INVENTORY };
    const out: Record<string, number> = {};
    for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) out[id] = Math.floor(value);
    }
    return out;
}

export function itemCount(inventory: PlayerInventory, itemId: string): number {
    return inventory[itemId] ?? 0;
}

/** 增加道具；amount ≤ 0 時不變 */
export function addItem(inventory: PlayerInventory, itemId: string, amount: number): PlayerInventory {
    const add = Math.floor(Number.isFinite(amount) ? amount : 0);
    if (add <= 0) return inventory;
    return { ...inventory, [itemId]: itemCount(inventory, itemId) + add };
}

/** 扣除道具；不夠時回傳 null（不扣） */
export function consumeItem(inventory: PlayerInventory, itemId: string, amount = 1): PlayerInventory | null {
    const have = itemCount(inventory, itemId);
    if (amount <= 0) return inventory;
    if (have < amount) return null;
    const next: Record<string, number> = { ...inventory };
    if (have === amount) delete next[itemId];
    else next[itemId] = have - amount;
    return next;
}

/** 季度推進的免費求籤令：未達上限才發，最多補到上限 */
export function grantSeasonalOracleTokens(inventory: PlayerInventory, seasons = 1): { inventory: PlayerInventory; granted: number } {
    const have = itemCount(inventory, ITEM_ORACLE_TOKEN);
    const granted = Math.max(0, Math.min(ORACLE_TOKEN_PER_SEASON * Math.max(0, Math.floor(seasons)), ORACLE_TOKEN_FREE_CAP - have));
    return { inventory: addItem(inventory, ITEM_ORACLE_TOKEN, granted), granted };
}
