// @spec-source → 可結緣女性來源系統.md §I Server 端（source_log）；FEM-10（PROG-2-0542）
/**
 * fem10-row-validators — 女性來源 source_log 的列驗證（純 TS，不連資料庫）
 *
 * 規則與 004_female_source_log.sql 的 CHECK 對齊。
 * 來源與品質的列舉依規格 §I；消耗道具 ID 的清單屬於道具表，這裡只驗證非空與長度。
 *
 * Unity 對照：同 nur15-row-validators，寫入前的 OnValidate，擋下壞列。
 */

export const FEMALE_SOURCE_TYPES = ['GACHA', 'MERCENARY', 'CAPTIVE', 'DUNGEON', 'OFFSPRING'] as const;
export const FEMALE_SOURCE_QUALITIES = ['SSR', 'SR', 'R', 'N'] as const;

const ID_MAX_LENGTH = 32;

export interface FemaleSourceLogRow {
    source_log_id: string;
    player_id: string;
    general_uid: string;
    source_type: string;
    quality: string;
    acquired_at: string;
    cost_item: string;
    cost_amount: number;
}

function nonEmptyId(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= ID_MAX_LENGTH;
}

export function validateFemaleSourceLogRow(row: Partial<FemaleSourceLogRow>): string[] {
    const errors: string[] = [];
    if (!nonEmptyId(row.source_log_id)) errors.push(`source_log_id: 必須是 1~${ID_MAX_LENGTH} 字元`);
    if (!nonEmptyId(row.player_id)) errors.push(`player_id: 必須是 1~${ID_MAX_LENGTH} 字元`);
    if (!nonEmptyId(row.general_uid)) errors.push(`general_uid: 必須是 1~${ID_MAX_LENGTH} 字元`);
    if (!(FEMALE_SOURCE_TYPES as readonly string[]).includes(row.source_type as string)) {
        errors.push(`source_type: 必須是 ${FEMALE_SOURCE_TYPES.join('/')} 之一`);
    }
    if (!(FEMALE_SOURCE_QUALITIES as readonly string[]).includes(row.quality as string)) {
        errors.push(`quality: 必須是 ${FEMALE_SOURCE_QUALITIES.join('/')} 之一`);
    }
    if (typeof row.acquired_at !== 'string' || Number.isNaN(Date.parse(row.acquired_at))) {
        errors.push('acquired_at: 必須是可解析的時間字串');
    }
    if (!nonEmptyId(row.cost_item)) errors.push(`cost_item: 必須是 1~${ID_MAX_LENGTH} 字元`);
    if (typeof row.cost_amount !== 'number' || !Number.isInteger(row.cost_amount) || row.cost_amount < 0) {
        errors.push('cost_amount: 必須是非負整數');
    }
    return errors;
}
