// @spec-source → 大廳系統.md §I Server 端（hall_theme_json／hall_mission_json／hall_character_json／hall_updated_at）；WBS HALL-14（PROG-2-1257）
/**
 * HallSyncSnapshot — 大廳狀態的伺服端同步列（純邏輯，不依賴 cc，不連線）
 *
 * 把大廳三塊狀態序列化成 Server 端的 JSON 欄位，並能從列還原；
 * 還原時逐欄檢查 JSON 格式，哪一欄壞掉就回報哪一欄，不讓整列靜默失敗。
 *
 * 暫定：
 *   - 各欄內容的型別由呼叫端（大廳各系統）決定，本檔只保證 JSON 往返與欄位名稱。
 *   - hall_updated_at 採 ISO 字串，不在本檔轉換時區。
 *
 * Unity 對照：像 ScriptableObject 的 JsonUtility 存檔，序列化時寫成字串欄位，載入時逐欄 Parse，失敗就指出哪個欄位。
 */

export interface HallSyncState {
    theme: unknown;
    missions: unknown;
    characters: unknown;
    updatedAt: string;
}

export interface HallSyncRow {
    hall_theme_json: string;
    hall_mission_json: string;
    hall_character_json: string;
    hall_updated_at: string;
}

export function buildHallSyncRow(state: HallSyncState): HallSyncRow {
    return {
        hall_theme_json: JSON.stringify(state.theme ?? null),
        hall_mission_json: JSON.stringify(state.missions ?? null),
        hall_character_json: JSON.stringify(state.characters ?? null),
        hall_updated_at: state.updatedAt,
    };
}

export type HallSyncParseResult =
    | { ok: true; state: HallSyncState }
    | { ok: false; errors: string[] };

const JSON_FIELDS = ['hall_theme_json', 'hall_mission_json', 'hall_character_json'] as const;

/** 從列還原大廳狀態；任一 JSON 欄位格式錯誤或時間欄缺失就回傳錯誤清單 */
export function parseHallSyncRow(row: Partial<HallSyncRow>): HallSyncParseResult {
    const errors: string[] = [];
    const parsed: Partial<Record<(typeof JSON_FIELDS)[number], unknown>> = {};
    for (const field of JSON_FIELDS) {
        const raw = row[field];
        if (typeof raw !== 'string') {
            errors.push(`${field} 缺少或不是字串`);
            continue;
        }
        try {
            parsed[field] = JSON.parse(raw);
        } catch {
            errors.push(`${field} 不是合法 JSON`);
        }
    }
    if (typeof row.hall_updated_at !== 'string' || row.hall_updated_at.length === 0) {
        errors.push('hall_updated_at 缺少');
    }
    if (errors.length > 0) return { ok: false, errors };
    return {
        ok: true,
        state: {
            theme: parsed.hall_theme_json,
            missions: parsed.hall_mission_json,
            characters: parsed.hall_character_json,
            updatedAt: row.hall_updated_at as string,
        },
    };
}
