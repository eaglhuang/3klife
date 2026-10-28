// @spec-source → 武將背包（倉庫）系統.md §「Server 端」；BAG-11（PROG-2-1395）
/**
 * bag11-equip-row — 伺服器裝備記錄列的欄位與驗證（純 TS，不連資料庫）
 *
 * 本檔只負責列驗證，不寫入、不讀取資料庫。欄位對應 player_gear_equip_records（010_gear_equip_records.sql）。
 *
 * 暫定（規格缺，可逆）：
 * - general_uid 為 NULL 時 slot_type 必為 WAREHOUSE（在倉庫）；有武將時 slot_type 不可為 WAREHOUSE。
 * - count 只要求正整數；裝備數量是否固定為 1 規格未寫，不在此卡強制。
 *
 * Unity 對照：像 ScriptableObject 的 OnValidate，欄位不合法就不讓它進存檔資料。
 */

/** 規格 slot_type ENUM：八種代碼。注意與客戶端 EquipSlot（MOUNT/TOME/TREASURE）命名不同，同步時需對映。 */
export const GEAR_SLOT_TYPES = [
    'WEAPON',
    'ARMOR',
    'ACCESSORY',
    'HORSE',
    'BOOK',
    'RELIC',
    'TALLY',
    'WAREHOUSE',
] as const;

export type GearSlotType = (typeof GEAR_SLOT_TYPES)[number];

export interface GearEquipRecordRow {
    equip_id: string;
    player_id: string;
    general_uid: string | null;
    item_id: string;
    slot_type: string;
    count: number;
    is_locked: boolean;
    acquired_at: string;
}

export type GearEquipRowIssue = { path: string; message: string };

const ID_MAX = 32;
const INT_MAX = 2147483647;

function isIdString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= ID_MAX;
}

function isPositiveInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= INT_MAX;
}

/** 列驗證：ID 長度、slot_type 代碼、倉庫與武將綁定的一致性、數量與時間格式。 */
export function validateGearEquipRecordRow(row: GearEquipRecordRow): GearEquipRowIssue[] {
    const issues: GearEquipRowIssue[] = [];

    for (const key of ['equip_id', 'player_id', 'item_id'] as const) {
        if (!isIdString(row[key])) issues.push({ path: key, message: `必須為 1~${ID_MAX} 字元` });
    }

    if (row.general_uid !== null && !isIdString(row.general_uid)) {
        issues.push({ path: 'general_uid', message: `必須為 1~${ID_MAX} 字元或 NULL` });
    }

    const slotKnown = (GEAR_SLOT_TYPES as readonly string[]).includes(row.slot_type);
    if (!slotKnown) {
        issues.push({ path: 'slot_type', message: `必須為 ${GEAR_SLOT_TYPES.join('/')} 其中之一` });
    }

    if (slotKnown) {
        const inWarehouse = row.slot_type === 'WAREHOUSE';
        if (row.general_uid === null && !inWarehouse) {
            issues.push({ path: 'slot_type', message: 'general_uid 為 NULL（在倉庫）時 slot_type 必須為 WAREHOUSE' });
        }
        if (row.general_uid !== null && inWarehouse) {
            issues.push({ path: 'slot_type', message: '已裝備於武將時 slot_type 不可為 WAREHOUSE' });
        }
    }

    if (!isPositiveInt(row.count)) issues.push({ path: 'count', message: '必須為 1 以上的整數' });
    if (typeof row.is_locked !== 'boolean') issues.push({ path: 'is_locked', message: '必須為布林值' });

    if (typeof row.acquired_at !== 'string' || Number.isNaN(Date.parse(row.acquired_at))) {
        issues.push({ path: 'acquired_at', message: '必須為可解析的時間字串' });
    }

    return issues;
}
