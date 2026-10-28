// @spec-source → 武將背包（倉庫）系統.md §E 第 10 項「寶物圖鑑」P2（記錄曾取得的所有寶物）、§D 收藏家 TA；WBS BAG-08（PROG-2-1391）
/**
 * TreasureCodex — 寶物圖鑑的檢視模型（純邏輯，不依賴 cc）。
 *
 * - 圖鑑列出道具資料表中分類為「寶物」的道具，每筆標示是否曾取得過。
 * - 「曾取得」以取得紀錄（ItemAcquisitionLog）為準，另外只要目前持有也算已取得（舊檔沒有紀錄時仍看得到）。
 * - 取得次數只算紀錄內的筆數：紀錄上限 200 筆（暫定），太舊的紀錄會被截掉，次數可能偏低。
 *
 * Unity 對照：像 Achievement 圖鑑頁，從取得事件的 Log 與目前背包一起判斷亮不亮，圖鑑本身不存狀態。
 */
import { ITEM_DEFS, type ItemDef } from './ItemDef';
import { itemCount, type PlayerInventory } from './PlayerInventory';
import type { ItemAcquisitionRecord } from './ItemAcquisitionLog';

export interface TreasureCodexEntry {
    itemId: string;
    name: string;
    obtained: boolean;
    /** 紀錄內累計取得數量（只算取得，不扣除用掉的部分） */
    totalAcquired: number;
    owned: number;
}

export interface TreasureCodexView {
    entries: TreasureCodexEntry[];
    obtainedCount: number;
    totalCount: number;
    /** 是否已填滿圖鑑（收藏家 TA 的目標） */
    complete: boolean;
    /** 圖鑑摘要文字，例如「寶物圖鑑 1/1」 */
    summaryLine: string;
}

function isTreasureDef(def: ItemDef): boolean {
    return def.category === '寶物';
}

/** 依取得紀錄與目前背包建立寶物圖鑑；未給的紀錄視為空陣列。 */
export function buildTreasureCodex(
    log: readonly ItemAcquisitionRecord[],
    inventory: PlayerInventory,
): TreasureCodexView {
    const entries = ITEM_DEFS.filter(isTreasureDef).map((def): TreasureCodexEntry => {
        const totalAcquired = log
            .filter((record) => record.itemId === def.id)
            .reduce((sum, record) => sum + record.amount, 0);
        const owned = itemCount(inventory, def.id);
        return { itemId: def.id, name: def.name, obtained: totalAcquired > 0 || owned > 0, totalAcquired, owned };
    });
    const obtainedCount = entries.filter((entry) => entry.obtained).length;
    const totalCount = entries.length;
    return {
        entries,
        obtainedCount,
        totalCount,
        complete: totalCount > 0 && obtainedCount === totalCount,
        summaryLine: `寶物圖鑑 ${obtainedCount}/${totalCount}`,
    };
}
