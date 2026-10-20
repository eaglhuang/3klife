// @spec-source → 培育系統規格書 shard-c「Server 端 — 培育紀錄表」（NUR-15，PROG-2-0855）
/**
 * nur15-row-validators — 培育紀錄 Server 表的列驗證（純 TS，不連資料庫）
 *
 * 規則與 002_nurture_records.sql 的 CHECK 對齊。
 * 三個 JSON 欄位（階段紀錄、教官紀錄、揭露紀錄）以及畢業欄位，只驗證「可解析的 JSON 字串」，
 * 內部結構屬於培育系統的紀錄格式，不在本檔定義。
 *
 * Unity 對照：像存檔寫入前的 OnValidate，寫入前擋下壞列。
 */

export const NURTURE_RATINGS = ['S', 'A', 'B', 'C'] as const;

export interface NurtureRecordRow {
    session_id: string;
    child_uid: string;
    start_season: number;
    end_season: number;
    mentor_id?: string | null;
    revelation_level: number;
    phase_block_history_json: string;
    mentoring_mode_log_json: string;
    reveal_log_json: string;
    final_stats_json: string;
    graduation_tags_json: string;
    rating: string;
    tp_total: number;
}

const JSON_COLUMNS: Array<keyof NurtureRecordRow> = [
    'phase_block_history_json',
    'mentoring_mode_log_json',
    'reveal_log_json',
    'final_stats_json',
    'graduation_tags_json',
];

function nonEmpty(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value);
}

function isParseableJson(text: unknown): boolean {
    if (typeof text !== 'string') return false;
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

export function validateNurtureRecordRow(row: Partial<NurtureRecordRow>): string[] {
    const errors: string[] = [];
    if (!nonEmpty(row.session_id)) errors.push('session_id: 缺少');
    if (!nonEmpty(row.child_uid)) errors.push('child_uid: 缺少');
    if (!isInt(row.start_season) || row.start_season < 0) errors.push('start_season: 必須是非負整數');
    if (!isInt(row.end_season)) {
        errors.push('end_season: 必須是整數');
    } else if (isInt(row.start_season) && row.end_season < row.start_season) {
        errors.push('end_season: 不得早於 start_season');
    }
    if (!isInt(row.revelation_level) || row.revelation_level < 0 || row.revelation_level > 3) {
        errors.push('revelation_level: 必須是 0~3 的整數');
    }
    for (const column of JSON_COLUMNS) {
        if (!isParseableJson(row[column])) errors.push(`${column}: 必須是可解析的 JSON 字串`);
    }
    if (!(NURTURE_RATINGS as readonly string[]).includes(row.rating as string)) {
        errors.push(`rating: 必須是 ${NURTURE_RATINGS.join('/')} 之一`);
    }
    if (!isInt(row.tp_total) || row.tp_total < 0) errors.push('tp_total: 必須是非負整數');
    return errors;
}
