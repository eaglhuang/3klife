// @spec-source → 領地治理系統.md §I「Data Schema 需求」（本機端 Governance、Server 端 player_governance_state）；GOV-13（PROG-2-2111）
/**
 * gov13-governance-row — 治理存檔的 Server 列轉換與驗證（純 TS，不連資料庫）
 *
 * 欄位對應 player_governance_state（012_governance_state.sql）：
 * Player_ID / Territory_Level / Auto_Mode / Season_Output_JSON（每季產出紀錄）。
 * 本檔只負責本機治理狀態 ↔ 列的互轉與列驗證；寫入與衝突規則屬 Server 執行端。
 *
 * 暫定（規格只寫「每季產出紀錄 TEXT」，沒寫格式，可逆）：
 * - Season_Output_JSON 存為 JSON 陣列，每筆 { season, food, gold, fame, troops, intel }，
 *   五項資源對應本機端 Season_Report（Food/Gold/Fame/Troops/Intel），皆為非負有限數；season 為非負整數（累計季數）。
 * - 陣列依 season 嚴格遞增，同一季不重複。
 * - Territory_Level 1~5（與客端 TERRITORY_MAX_LEVEL 同值；server 不 import 客端碼，數字在此另寫一份，升級上限改動時要同步）。
 * - 單筆列的 Season_Output_JSON 長度上限 64KB（TEXT 欄位的保守上限）。
 *
 * Unity 對照：像存檔序列化器加欄位檢查，讀檔時檢查不過就不讓資料進遊戲物件。
 */

/** 太守府等級範圍（與客端 TerritoryUpgrade.TERRITORY_MAX_LEVEL 同值） */
export const GOV13_TERRITORY_MIN_LEVEL = 1;
export const GOV13_TERRITORY_MAX_LEVEL = 5;
/** Season_Output_JSON 字串長度上限 */
export const GOV13_SEASON_OUTPUT_MAX_CHARS = 64 * 1024;

export interface SeasonOutputEntry {
    season: number;
    food: number;
    gold: number;
    fame: number;
    troops: number;
    intel: number;
}

export interface GovernanceStateRow {
    player_id: string;
    territory_level: number;
    auto_mode: boolean;
    season_output_json: string;
}

/** 本機治理狀態（只含要上傳的三項） */
export interface LocalGovernanceState {
    territoryLevel: number;
    autoMode: boolean;
    seasonOutputs: readonly SeasonOutputEntry[];
}

export type GovernanceRowIssue = { path: string; message: string };

const PLAYER_ID_MAX = 32;
const RESOURCE_KEYS = ['food', 'gold', 'fame', 'troops', 'intel'] as const;

function isNonNegativeNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** 本機 → 列（產出紀錄存為 JSON 字串；等級夾到合法範圍、非法產出筆數丟棄不進列） */
export function governanceStateToRow(playerId: string, state: LocalGovernanceState): GovernanceStateRow {
    const level = Number.isFinite(state.territoryLevel) ? Math.floor(state.territoryLevel) : GOV13_TERRITORY_MIN_LEVEL;
    return {
        player_id: playerId,
        territory_level: Math.min(GOV13_TERRITORY_MAX_LEVEL, Math.max(GOV13_TERRITORY_MIN_LEVEL, level)),
        auto_mode: state.autoMode === true,
        season_output_json: JSON.stringify(normalizeSeasonOutputs(state.seasonOutputs)),
    };
}

/** 清理產出紀錄：丟棄不合法的筆、依 season 排序、同季保留最後一筆 */
export function normalizeSeasonOutputs(entries: readonly SeasonOutputEntry[] | undefined): SeasonOutputEntry[] {
    const bySeason = new Map<number, SeasonOutputEntry>();
    for (const entry of entries ?? []) {
        if (!entry || !Number.isInteger(entry.season) || entry.season < 0) continue;
        if (!RESOURCE_KEYS.every((key) => isNonNegativeNumber(entry[key]))) continue;
        bySeason.set(entry.season, {
            season: entry.season,
            food: entry.food, gold: entry.gold, fame: entry.fame, troops: entry.troops, intel: entry.intel,
        });
    }
    return [...bySeason.values()].sort((a, b) => a.season - b.season);
}

/** 列 → 本機；列不合法時丟錯（不讓壞資料進遊戲物件） */
export function rowToGovernanceState(row: GovernanceStateRow): LocalGovernanceState {
    const issues = validateGovernanceStateRow(row);
    if (issues.length > 0) {
        throw new Error(`[governance-row] 列驗證失敗：${issues.map((i) => `${i.path}：${i.message}`).join('；')}`);
    }
    return {
        territoryLevel: row.territory_level,
        autoMode: row.auto_mode,
        seasonOutputs: JSON.parse(row.season_output_json) as SeasonOutputEntry[],
    };
}

/** 列驗證：ID 長度、等級範圍、布林、產出紀錄 JSON 格式與嚴格遞增 */
export function validateGovernanceStateRow(row: GovernanceStateRow): GovernanceRowIssue[] {
    const issues: GovernanceRowIssue[] = [];

    if (typeof row.player_id !== 'string' || row.player_id.length === 0 || row.player_id.length > PLAYER_ID_MAX) {
        issues.push({ path: 'player_id', message: `必須為 1~${PLAYER_ID_MAX} 字元` });
    }
    if (!Number.isInteger(row.territory_level) || row.territory_level < GOV13_TERRITORY_MIN_LEVEL || row.territory_level > GOV13_TERRITORY_MAX_LEVEL) {
        issues.push({ path: 'territory_level', message: `必須為 ${GOV13_TERRITORY_MIN_LEVEL}~${GOV13_TERRITORY_MAX_LEVEL} 的整數` });
    }
    if (typeof row.auto_mode !== 'boolean') issues.push({ path: 'auto_mode', message: '必須為布林值' });

    if (typeof row.season_output_json !== 'string') {
        issues.push({ path: 'season_output_json', message: '必須為字串' });
        return issues;
    }
    if (row.season_output_json.length > GOV13_SEASON_OUTPUT_MAX_CHARS) {
        issues.push({ path: 'season_output_json', message: `長度不可超過 ${GOV13_SEASON_OUTPUT_MAX_CHARS} 字元` });
        return issues;
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(row.season_output_json);
    } catch {
        issues.push({ path: 'season_output_json', message: '必須為可解析的 JSON' });
        return issues;
    }
    if (!Array.isArray(parsed)) {
        issues.push({ path: 'season_output_json', message: '必須為 JSON 陣列' });
        return issues;
    }
    let lastSeason = -1;
    parsed.forEach((entry: unknown, index) => {
        const at = `season_output_json[${index}]`;
        const e = entry as Partial<SeasonOutputEntry> | null;
        if (!e || typeof e !== 'object') {
            issues.push({ path: at, message: '必須為物件' });
            return;
        }
        if (!Number.isInteger(e.season) || (e.season as number) < 0) {
            issues.push({ path: `${at}.season`, message: '必須為 0 以上的整數' });
        } else if ((e.season as number) <= lastSeason) {
            issues.push({ path: `${at}.season`, message: '必須嚴格遞增（同一季不可重複）' });
        } else {
            lastSeason = e.season as number;
        }
        for (const key of RESOURCE_KEYS) {
            if (!isNonNegativeNumber(e[key])) issues.push({ path: `${at}.${key}`, message: '必須為 0 以上的有限數' });
        }
    });
    return issues;
}

/** 給記憶體表用的驗證器：回傳訊息字串 */
export function governanceStateValidator(row: Partial<GovernanceStateRow>): string[] {
    return validateGovernanceStateRow(row as GovernanceStateRow).map((issue) => `${issue.path}：${issue.message}`);
}
