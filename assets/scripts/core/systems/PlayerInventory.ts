// @spec-source → 道具系統（付費免費道具）.md §F 付費道具（ITEM_ORACLE 求籤令）、名士預言系統.md (doc_spec_0006) §C 商業套路
/**
 * PlayerInventory — 玩家道具庫存（純邏輯，不依賴 cc）
 *
 * 目前只有求籤令（ITEM_ORACLE）：名士占卜每次消耗 1 張。
 *
 * 暫定（規格沒寫，PROG-2-0053）：
 * - 新遊戲與沒有庫存欄位的舊存檔，起始送 3 張求籤令
 * - 規格「免費玩家日產 1 張」：遊戲以季為時間單位，改成每推進一季免費 +1 張；
 *   免費產出只補到 5 張為止（持有 ≥ 5 張時不再發），商城購買不受此限
 *
 * Unity 對照：像一個 [Serializable] class Inventory { Dictionary<string,int> }，
 * 只負責數量增減與正規化，存檔交給 GameSession。
 */

export const ITEM_ORACLE_TOKEN = 'ITEM_ORACLE';
/** 轉職令（20 歲追加副職；PROG-2-0226 接線）。起始庫存為 0，靠商城與活動取得。 */
export const ITEM_JOB_CHANGE_ORDER = 'ITEM_JOB_ORDER';
/** 試用券（MERC-02 招募 Trial 傭兵；PROG-2-0327 接線）。起始庫存為 0（暫定）。 */
export const ITEM_TRIAL_TICKET = 'ITEM_TRIAL_TICKET';
/** 竹簡（文職退役產物，PROG-2-0330；暫定）。起始庫存為 0。 */
export const ITEM_BAMBOO_SLIP = 'ITEM_BAMBOO_SLIP';
/** 補元散（精力 +50；PROG-2-0443 接線）。起始庫存為 0。 */
export const ITEM_VITALITY_PILL = 'ITEM_VITALITY_PILL';
/** 高級補元散（精力 +100；PROG-2-0443 接線）。起始庫存為 0。 */
export const ITEM_PREMIUM_VITALITY_PILL = 'ITEM_VITALITY_PILL_PREMIUM';

export const ITEM_DISPLAY_NAMES: Readonly<Record<string, string>> = {
    [ITEM_ORACLE_TOKEN]: '求籤令',
    [ITEM_JOB_CHANGE_ORDER]: '轉職令',
    [ITEM_TRIAL_TICKET]: '試用券',
    [ITEM_BAMBOO_SLIP]: '竹簡',
    [ITEM_VITALITY_PILL]: '補元散',
    [ITEM_PREMIUM_VITALITY_PILL]: '高級補元散',
};

export type PlayerInventory = Readonly<Record<string, number>>;

/** 新遊戲 / 舊存檔的起始庫存（暫定） */
export const STARTER_INVENTORY: PlayerInventory = { [ITEM_ORACLE_TOKEN]: 3 };

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
