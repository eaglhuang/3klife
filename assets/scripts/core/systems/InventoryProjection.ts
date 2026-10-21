// @spec-source → Data Schema 文件 §2-2 #11 與 §2-1a（統一物件庫為 canonical）；WBS DS-08；PROG-2-1009
/**
 * InventoryProjection — 統一物件庫 Inventory_Service 推導虎符與英靈卡視圖（純邏輯，不依賴 cc）。
 *
 * - 統一物件庫（Inventory_Service）是唯一真相；虎符清單與英靈卡集合只由它推導，不另存一份。
 * - 只讀 TALLY 與 SPIRIT_CARD 兩類列，其他列忽略。
 * - 列缺欄位或數值不合法時跳過並記錄原因，不以預設值補真相（避免憑空產生虎符）。
 *
 * Unity 對照：像一張總表（ScriptableObject 資料庫），兩個 Presenter 各自從總表過濾、轉型，不各自保存一份。
 */
import type { SpiritCardEntry, TalismanInventoryEntry, TalismanQuality, TalismanSourceType } from './ReadModelValidators';

export type InventoryItemType = 'TALLY' | 'SPIRIT_CARD' | 'OTHER';

/** 統一物件庫的一列；type 專屬欄位放在 Attributes，由推導函式讀取。 */
export interface InventoryRecord {
    Inventory_ID: string;
    Item_Type: InventoryItemType;
    Slot_Type: string;
    Bound_General_UID: string | null;
    Quantity: number;
    Quality: string;
    Source_Type: string;
    Display_Bucket: string;
    Is_Displayed: boolean;
    Attributes: Readonly<Record<string, unknown>>;
}

export interface InventorySkipped {
    Inventory_ID: string;
    reason: string;
}

export interface InventoryViews {
    talismans: Record<string, TalismanInventoryEntry>;
    spiritCards: Record<string, SpiritCardEntry>;
    skipped: InventorySkipped[];
}

const TALLY_QUALITIES: readonly TalismanQuality[] = ['R', 'SR', 'SSR', 'UR'];
const TALLY_SOURCES: readonly TalismanSourceType[] = ['DeathSettlement', 'Recruitment', 'WarConquest'];
const SPIRIT_DISPLAY_BUCKETS: readonly string[] = ['DESTINY_SLOT', 'CLAN_RELIC'];

function num(attrs: Readonly<Record<string, unknown>>, key: string): number | null {
    const value = attrs[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(attrs: Readonly<Record<string, unknown>>, key: string): string | null {
    const value = attrs[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function projectTally(record: InventoryRecord): TalismanInventoryEntry | string {
    const attrs = record.Attributes;
    if (record.Quantity !== 1) return 'TALLY 數量必須為 1（虎符逐筆持有）';
    if (!TALLY_QUALITIES.includes(record.Quality as TalismanQuality)) return 'TALLY 品質不在 R/SR/SSR/UR';
    if (!TALLY_SOURCES.includes(record.Source_Type as TalismanSourceType)) return 'TALLY 來源類型不合法';
    const tigerTallyScore = num(attrs, 'TigerTallyScore');
    const star = num(attrs, 'Star');
    const starExp = num(attrs, 'Star_Exp');
    const acquiredSeason = num(attrs, 'Acquired_Season');
    const sourceTemplate = str(attrs, 'Source_Template_ID');
    const sourceGeneral = str(attrs, 'Source_General_UID');
    if (tigerTallyScore === null || star === null || starExp === null || acquiredSeason === null) {
        return 'TALLY 缺少數值欄位（TigerTallyScore／Star／Star_Exp／Acquired_Season）';
    }
    if (sourceTemplate === null || sourceGeneral === null) return 'TALLY 缺少來源欄位';
    const linked = str(attrs, 'Linked_Troop_ID');
    return {
        Tally_ID: record.Inventory_ID,
        Quality: record.Quality as TalismanQuality,
        TigerTallyScore: tigerTallyScore,
        Star: star,
        Star_Exp: starExp,
        Source_Template_ID: sourceTemplate,
        Source_General_UID: sourceGeneral,
        Source_Type: record.Source_Type as TalismanSourceType,
        ...(linked !== null ? { Linked_Troop_ID: linked } : {}),
        Equipped_General_UID: record.Bound_General_UID,
        Acquired_Season: acquiredSeason,
        Is_Displayed: record.Is_Displayed,
    };
}

function projectSpiritCard(record: InventoryRecord): SpiritCardEntry | string {
    const attrs = record.Attributes;
    if (record.Quantity !== 1) return 'SPIRIT_CARD 數量必須為 1';
    if (record.Slot_Type !== 'DESTINY') return 'SPIRIT_CARD 的 Slot_Type 必須為 DESTINY';
    if (!SPIRIT_DISPLAY_BUCKETS.includes(record.Display_Bucket)) return 'SPIRIT_CARD 的 Display_Bucket 不合法';
    const lineage = num(attrs, 'LineageScore');
    const templateId = str(attrs, 'General_Template_ID');
    const familyKey = str(attrs, 'Spirit_Family_Key');
    const cardRole = attrs['Card_Role'];
    const primaryFlag = attrs['Family_Primary_Flag'];
    const dualEquip = attrs['DualEquip_Allowed'];
    if (lineage === null || templateId === null || familyKey === null) {
        return 'SPIRIT_CARD 缺少 LineageScore／General_Template_ID／Spirit_Family_Key';
    }
    if (cardRole !== 'MAIN' && cardRole !== 'BACKUP') return 'SPIRIT_CARD 的 Card_Role 不合法';
    if (typeof primaryFlag !== 'boolean' || typeof dualEquip !== 'boolean') return 'SPIRIT_CARD 缺少布林欄位';
    return {
        Spirit_ID: record.Inventory_ID,
        General_Template_ID: templateId,
        Spirit_Family_Key: familyKey,
        LineageScore: lineage,
        Card_Role: cardRole,
        Family_Primary_Flag: primaryFlag,
        Equipped_General_UID: record.Bound_General_UID,
        Slot_Type: 'DESTINY',
        Display_Bucket: record.Display_Bucket as SpiritCardEntry['Display_Bucket'],
        DualEquip_Allowed: dualEquip,
    };
}

/** 由統一物件庫推導虎符與英靈卡視圖；重複的 Inventory_ID 只取第一筆，其餘記為跳過。 */
export function deriveInventoryViews(records: readonly InventoryRecord[]): InventoryViews {
    const views: InventoryViews = { talismans: {}, spiritCards: {}, skipped: [] };
    const seen = new Set<string>();
    for (const record of records) {
        if (seen.has(record.Inventory_ID)) {
            views.skipped.push({ Inventory_ID: record.Inventory_ID, reason: '重複的 Inventory_ID' });
            continue;
        }
        seen.add(record.Inventory_ID);
        if (record.Item_Type === 'OTHER') continue;
        const projected = record.Item_Type === 'TALLY' ? projectTally(record) : projectSpiritCard(record);
        if (typeof projected === 'string') {
            views.skipped.push({ Inventory_ID: record.Inventory_ID, reason: projected });
        } else if (record.Item_Type === 'TALLY') {
            views.talismans[record.Inventory_ID] = projected as TalismanInventoryEntry;
        } else {
            views.spiritCards[record.Inventory_ID] = projected as SpiritCardEntry;
        }
    }
    return views;
}
