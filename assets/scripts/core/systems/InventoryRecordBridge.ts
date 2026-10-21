// @spec-source → Data Schema 文件 §2-1a（統一物件庫為 canonical）；WBS DS-08；PROG-2-1021（DS-08 儲存段）
/**
 * InventoryRecordBridge — 虎符卡轉成統一物件庫的 TALLY 列，並讀回存檔的列（純邏輯，不依賴 cc）。
 *
 * - 過渡期 dual-write：虎符仍由 TigerTallyCard + 持有表保存，這裡把每張卡轉成一列，供 deriveInventoryViews 讀取。
 * - 來源映射（PM 裁定）：death → DeathSettlement、reward → WarConquest、surrender → Recruitment；retire 不產生列。
 * - Slot_Type、Display_Bucket 的 TALLY 枚舉規格未定義，暫填 'TALLY'；InventoryProjection 不讀這兩欄。
 *
 * Unity 對照：像把 ScriptableObject 卡牌資產轉成背包總表的一行 Row；總表是讀取的來源，卡牌資產只在轉換時被讀。
 */
import type { TigerTallyCard } from '../models/TigerTallyCard';
import type { TallyHolder } from './TigerTallyHoldings';
import type { InventoryItemType, InventoryRecord } from './InventoryProjection';
import type { TalismanSourceType } from './ReadModelValidators';

const TALLY_SOURCE_MAP: Partial<Record<TigerTallyCard['source'], TalismanSourceType>> = {
    death: 'DeathSettlement',
    reward: 'WarConquest',
    surrender: 'Recruitment',
};

const ITEM_TYPES: readonly InventoryItemType[] = ['TALLY', 'SPIRIT_CARD', 'OTHER'];

/** 一張虎符卡轉成 TALLY 列；retire 等不在映射表內的來源回傳 null（不產生列）。 */
export function tallyCardToInventoryRecord(card: TigerTallyCard, holder: TallyHolder): InventoryRecord | null {
    const source = TALLY_SOURCE_MAP[card.source];
    if (!source) return null;
    return {
        Inventory_ID: card.uid,
        Item_Type: 'TALLY',
        Slot_Type: 'TALLY',
        Bound_General_UID: holder,
        Quantity: 1,
        Quality: card.quality,
        Source_Type: source,
        Display_Bucket: 'TALLY',
        Is_Displayed: false,
        Attributes: {
            TigerTallyScore: card.score,
            Star: card.stars ?? 1,
            Star_Exp: card.battleExp ?? 0,
            Source_Template_ID: card.templateId,
            Source_General_UID: card.sourceGeneralUid,
            Acquired_Season: card.producedSeason,
            ...(card.troopType ? { Troop_Type: card.troopType } : {}),
        },
    };
}

/** 整批虎符卡轉成 TALLY 列，順序依卡片 uid 字典序，確保同樣的狀態產生同樣的列。 */
export function buildTallyInventoryRecords(
    cards: Readonly<Record<string, TigerTallyCard>>,
    holders: Readonly<Record<string, TallyHolder>>,
): InventoryRecord[] {
    const records: InventoryRecord[] = [];
    for (const uid of Object.keys(cards).sort()) {
        const record = tallyCardToInventoryRecord(cards[uid], holders[uid] ?? null);
        if (record) records.push(record);
    }
    return records;
}

function isInventoryRecord(value: unknown): value is InventoryRecord {
    if (!value || typeof value !== 'object') return false;
    const r = value as Record<string, unknown>;
    return typeof r.Inventory_ID === 'string' && r.Inventory_ID.length > 0
        && ITEM_TYPES.includes(r.Item_Type as InventoryItemType)
        && typeof r.Slot_Type === 'string'
        && (r.Bound_General_UID === null || typeof r.Bound_General_UID === 'string')
        && typeof r.Quantity === 'number'
        && typeof r.Quality === 'string'
        && typeof r.Source_Type === 'string'
        && typeof r.Display_Bucket === 'string'
        && typeof r.Is_Displayed === 'boolean'
        && !!r.Attributes && typeof r.Attributes === 'object' && !Array.isArray(r.Attributes);
}

/** 讀回存檔的統一物件庫列：形狀不合的列丟棄，不補預設值；非陣列視為沒有紀錄。 */
export function normalizeInventoryRecords(raw: unknown): InventoryRecord[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(isInventoryRecord).map((record) => ({ ...record, Attributes: { ...record.Attributes } }));
}
