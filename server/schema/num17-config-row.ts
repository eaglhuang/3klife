// @spec-source → 數值系統.md §I「Server 端」（NUM-17，PROG-2-0980）
/**
 * num17-config-row — 數值配置 Server 列的驗證與熱更新比對（純 TS，不連資料庫）
 *
 * 本檔只做兩件事：
 *   1. 列驗證：ID 長度、鍵名格式、DECIMAL(10,4) 的範圍與小數位、category 列舉、版本號。
 *   2. 熱更新比對：客戶端持有的版本號 vs 下發列的版本號，只套用較新的列。
 *
 * 暫定（規格缺，可逆）：
 * - 同版本號但數值不同視為衝突，不套用，回報給呼叫端處理。
 *
 * Unity 對照：像 ScriptableObject 熱重載，檢查資料合法後，只有版本號比目前新的才覆蓋。
 */

export const NUM17_CATEGORIES = ['BATTLE', 'GROWTH', 'RESOURCE', 'EVENT'] as const;
export type NumericalConfigCategory = (typeof NUM17_CATEGORIES)[number];

export interface NumericalConfigRow {
    config_id: string;
    config_key: string;
    config_value: number;
    category: NumericalConfigCategory;
    description: string;
    updated_at: string;
    version: number;
}

export type ConfigRowIssue = { path: string; message: string };

const ID_MAX = 32;
const KEY_MAX = 64;
const KEY_FORMAT = /^[A-Z][A-Z0-9_]*$/;
/** DECIMAL(10,4)：整數部 6 位、小數 4 位 */
const VALUE_ABS_MAX = 999999.9999;
const VERSION_MAX = 2147483647;

/** 列驗證：ID、鍵名格式、數值範圍與小數位、類別、更新時間格式、版本號。 */
export function validateNumericalConfigRow(row: NumericalConfigRow): ConfigRowIssue[] {
    const issues: ConfigRowIssue[] = [];

    if (typeof row.config_id !== 'string' || row.config_id.length === 0 || row.config_id.length > ID_MAX) {
        issues.push({ path: 'config_id', message: `必須為 1~${ID_MAX} 字元` });
    }
    if (typeof row.config_key !== 'string' || row.config_key.length > KEY_MAX || !KEY_FORMAT.test(row.config_key)) {
        issues.push({ path: 'config_key', message: `必須為大寫英文與底線，最長 ${KEY_MAX} 字元` });
    }

    const value = row.config_value;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push({ path: 'config_value', message: '必須為有限數字' });
    } else {
        if (Math.abs(value) > VALUE_ABS_MAX) issues.push({ path: 'config_value', message: '超出 DECIMAL(10,4) 範圍' });
        if (Math.round(value * 10000) / 10000 !== value) issues.push({ path: 'config_value', message: '小數位不得超過 4 位' });
    }

    if (!(NUM17_CATEGORIES as readonly string[]).includes(row.category)) {
        issues.push({ path: 'category', message: '必須為 BATTLE / GROWTH / RESOURCE / EVENT' });
    }
    if (typeof row.description !== 'string') issues.push({ path: 'description', message: '必須為字串' });
    if (typeof row.updated_at !== 'string' || Number.isNaN(Date.parse(row.updated_at))) {
        issues.push({ path: 'updated_at', message: '必須為可解析的日期時間' });
    }
    if (!Number.isInteger(row.version) || row.version < 1 || row.version > VERSION_MAX) {
        issues.push({ path: 'version', message: '必須為 1 以上的整數' });
    }

    return issues;
}

export type ConfigSyncDecision =
    | { action: 'apply'; row: NumericalConfigRow }
    | { action: 'skip-same'; row: NumericalConfigRow }
    | { action: 'skip-older'; row: NumericalConfigRow }
    | { action: 'conflict'; row: NumericalConfigRow; localValue: number };

/**
 * 熱更新比對：對每一列，依客戶端目前的 key → {version, value} 決定套用、略過或衝突。
 * 客戶端沒有的鍵一律套用；版本號較新的套用；版本號相同且數值一致略過；版本號相同但數值不同標為衝突。
 * 版本號較舊的略過。不寫入任何狀態，由呼叫端決定如何套用。
 */
export function planNumericalConfigSync(
    local: ReadonlyMap<string, { version: number; value: number }>,
    incoming: readonly NumericalConfigRow[],
): ConfigSyncDecision[] {
    return incoming.map((row): ConfigSyncDecision => {
        const current = local.get(row.config_key);
        if (!current || row.version > current.version) return { action: 'apply', row };
        if (row.version === current.version) {
            return current.value === row.config_value
                ? { action: 'skip-same', row }
                : { action: 'conflict', row, localValue: current.value };
        }
        return { action: 'skip-older', row };
    });
}
