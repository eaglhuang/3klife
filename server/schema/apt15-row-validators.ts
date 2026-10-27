// @spec-source → 戰場適性系統規格書 §I「Server 端」aptitude 表（APT-15，PROG-2-0929）
/**
 * apt15-row-validators — 適性記錄 Server 表的列驗證（純 TS，不連資料庫）
 *
 * 規則與 006_aptitude_records.sql 的 CHECK 對齊。
 * 兵種代碼與天氣代碼取自規格 §F；地形代碼只有 PLAIN 見於規格 §I 範例，
 * 其餘 MOUNTAIN／WATER／FOREST／DESERT 為暫定英文代碼，待規格補上正式代碼。
 *
 * Unity 對照：像 ScriptableObject 的 OnValidate，存進資料前先擋下格式錯的資產列。
 */

export const APTITUDE_DIMENSIONS = ['TROOP', 'TERRAIN', 'WEATHER'] as const;
export const APTITUDE_GRADES = ['S', 'A', 'B', 'C', 'D'] as const;

export const APTITUDE_SUB_TYPES: Readonly<Record<(typeof APTITUDE_DIMENSIONS)[number], readonly string[]>> = {
    TROOP: ['CAVALRY', 'INFANTRY', 'ARCHER', 'SIEGE'],
    TERRAIN: ['PLAIN', 'MOUNTAIN', 'WATER', 'FOREST', 'DESERT'],
    WEATHER: ['SUNNY', 'RAINY', 'FOG', 'WINDY', 'NIGHT', 'THUNDER'],
};

export interface AptitudeRecordRow {
    aptitude_id: string;
    player_id: string;
    general_uid: string;
    dimension: string;
    sub_type: string;
    grade: string;
    source_gene_id?: string | null;
}

const ID_MAX_LENGTH = 32;
const SUB_TYPE_MAX_LENGTH = 16;

function isNonEmptyId(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= ID_MAX_LENGTH;
}

/** 回傳錯誤訊息清單；空陣列代表列合法 */
export function validateAptitudeRecordRow(row: Partial<AptitudeRecordRow>): string[] {
    const errors: string[] = [];

    if (!isNonEmptyId(row.aptitude_id)) errors.push(`aptitude_id 必填且長度不超過 ${ID_MAX_LENGTH}`);
    if (!isNonEmptyId(row.player_id)) errors.push(`player_id 必填且長度不超過 ${ID_MAX_LENGTH}`);
    if (!isNonEmptyId(row.general_uid)) errors.push(`general_uid 必填且長度不超過 ${ID_MAX_LENGTH}`);

    const dimension = row.dimension as keyof typeof APTITUDE_SUB_TYPES | undefined;
    if (!dimension || !(APTITUDE_DIMENSIONS as readonly string[]).includes(dimension)) {
        errors.push(`dimension 必須是 ${APTITUDE_DIMENSIONS.join(' / ')}`);
    } else if (typeof row.sub_type !== 'string' || !APTITUDE_SUB_TYPES[dimension].includes(row.sub_type)) {
        errors.push(`sub_type "${String(row.sub_type)}" 不屬於 ${dimension}（長度上限 ${SUB_TYPE_MAX_LENGTH}）`);
    }

    if (!(APTITUDE_GRADES as readonly string[]).includes(row.grade ?? '')) {
        errors.push(`grade 必須是 ${APTITUDE_GRADES.join(' / ')}`);
    }

    if (row.source_gene_id != null && (typeof row.source_gene_id !== 'string' || row.source_gene_id.length > ID_MAX_LENGTH)) {
        errors.push(`source_gene_id 若有值，長度不超過 ${ID_MAX_LENGTH}`);
    }

    return errors;
}
